import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { PLANS, CREDIT_PACKS } from "@/lib/plans";
import { FieldValue } from "firebase-admin/firestore";
import type { PlanOrPack } from "@/types";

const requestSchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

async function grantPlanOrPack(
  db: FirebaseFirestore.Firestore,
  uid: string,
  planOrPack: PlanOrPack,
  paymentId: string
) {
  const userRef = db.collection("users").doc(uid);
  const now = FieldValue.serverTimestamp();

  // Credit pack
  const packEntry = CREDIT_PACKS.find((p) => p.id === planOrPack);
  if (packEntry) {
    await userRef.update({
      credits: FieldValue.increment(packEntry.credits),
      updatedAt: now,
    });
    await db.collection("creditLedger").add({
      uid,
      delta: packEntry.credits,
      reason: "purchase",
      paymentId,
      createdAt: now,
    });
    return;
  }

  // Monthly plan
  const planId = planOrPack.replace("_monthly", "");
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
      uid,
      delta: planDef.creditsPerMonth,
      reason: "plan_upgrade",
      paymentId,
      createdAt: now,
    });
  }
}

export async function POST(req: NextRequest) {
  const db = adminDb();

  // ── Auth ─────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let uid: string;
  try {
    const decoded = await adminAuth().verifyIdToken(authHeader.slice(7));
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
  }

  // ── Validate ──────────────────────────────────────────────────────────────
  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  // ── Verify Razorpay signature ──────────────────────────────────────────────
  const valid = verifyPaymentSignature({
    orderId: body.razorpayOrderId,
    paymentId: body.razorpayPaymentId,
    signature: body.razorpaySignature,
  });

  if (!valid) {
    return NextResponse.json({ ok: false, error: "Invalid payment signature" }, { status: 400 });
  }

  // ── Load payment record ───────────────────────────────────────────────────
  const paymentRef = db.collection("payments").doc(body.razorpayOrderId);
  const paymentSnap = await paymentRef.get();

  if (!paymentSnap.exists()) {
    return NextResponse.json({ ok: false, error: "Payment not found" }, { status: 404 });
  }

  const paymentData = paymentSnap.data()!;

  // Idempotency — ignore duplicate payment IDs
  if (paymentData.status === "success") {
    return NextResponse.json({ ok: true, data: { message: "Already processed" } });
  }

  // Verify uid matches
  if (paymentData.uid !== uid) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 403 });
  }

  const planOrPack: PlanOrPack = paymentData.planOrPack;

  // ── Grant credits / plan ───────────────────────────────────────────────────
  await grantPlanOrPack(db, uid, planOrPack, body.razorpayPaymentId);

  // ── Update payment record ─────────────────────────────────────────────────
  await paymentRef.update({
    razorpayPaymentId: body.razorpayPaymentId,
    status: "success",
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true, data: { message: "Payment verified and credits granted" } });
}
