import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { PLANS, CREDIT_PACKS } from "@/lib/plans";
import { FieldValue } from "firebase-admin/firestore";
import type { PlanOrPack } from "@/types";

// Must be raw body for signature verification
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event as string;
  if (eventType !== "payment.captured") {
    // Acknowledge other events without processing
    return NextResponse.json({ ok: true });
  }

  const paymentEntity = (event.payload as Record<string, unknown>)
    ?.payment as Record<string, unknown>;
  const razorpayPaymentId = paymentEntity?.id as string;
  const orderId = paymentEntity?.order_id as string;

  if (!orderId || !razorpayPaymentId) {
    return NextResponse.json({ error: "Missing payment data" }, { status: 400 });
  }

  const db = adminDb();
  const paymentRef = db.collection("payments").doc(orderId);
  const paymentSnap = await paymentRef.get();

  if (!paymentSnap.exists) {
    return NextResponse.json({ ok: true, message: "Order not found — skipped" });
  }

  const paymentData = paymentSnap.data()!;

  // Idempotency
  if (paymentData.status === "success") {
    return NextResponse.json({ ok: true, message: "Already processed" });
  }

  const { uid, planOrPack }: { uid: string; planOrPack: PlanOrPack } = paymentData as {
    uid: string;
    planOrPack: PlanOrPack;
  };

  const userRef = db.collection("users").doc(uid);
  const now = FieldValue.serverTimestamp();

  // Grant credits or plan
  const packEntry = CREDIT_PACKS.find((p) => p.id === planOrPack);
  if (packEntry) {
    await userRef.update({
      credits: FieldValue.increment(packEntry.credits),
      updatedAt: now,
    });
    await db.collection("creditLedger").add({
      uid, delta: packEntry.credits, reason: "purchase",
      paymentId: razorpayPaymentId, createdAt: now,
    });
  } else {
    const planId = (planOrPack as string).replace("_monthly", "");
    const planDef = PLANS[planId];
    if (planDef) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      await userRef.update({
        plan: planId,
        planExpiresAt: expiresAt,
        credits: FieldValue.increment(planDef.creditsPerMonth),
        updatedAt: now,
      });
      await db.collection("creditLedger").add({
        uid, delta: planDef.creditsPerMonth, reason: "plan_upgrade",
        paymentId: razorpayPaymentId, createdAt: now,
      });
    }
  }

  await paymentRef.update({
    razorpayPaymentId,
    status: "success",
    updatedAt: now,
  });

  return NextResponse.json({ ok: true });
}
