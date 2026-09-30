import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getRazorpayInstance } from "@/lib/razorpay";
import { PLANS, CREDIT_PACKS } from "@/lib/plans";
import type { PlanOrPack } from "@/types";

const requestSchema = z.object({
  planOrPack: z.string(),
});

export async function POST(req: NextRequest) {
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

  let body: z.infer<typeof requestSchema>;
  try {
    body = requestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }

  const { planOrPack } = body as { planOrPack: PlanOrPack };

  // Determine amount in paise
  let amountPaise: number | undefined;
  let description: string = "";

  // Check plans
  const planEntry = Object.values(PLANS).find(
    (p) => `${p.id}_monthly` === planOrPack
  );
  if (planEntry) {
    amountPaise = planEntry.priceMonthly;
    description = `BuildMate AI ${planEntry.name} Plan (1 month)`;
  }

  // Check packs
  const packEntry = CREDIT_PACKS.find((p) => p.id === planOrPack);
  if (packEntry) {
    amountPaise = packEntry.pricePaise;
    description = `BuildMate AI ${packEntry.label} credit pack`;
  }

  if (!amountPaise || amountPaise <= 0) {
    return NextResponse.json({ ok: false, error: "Invalid plan or pack" }, { status: 400 });
  }

  try {
    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `bm_${uid.slice(0, 8)}_${Date.now()}`,
      notes: { uid, planOrPack },
    });

    // Save pending payment record
    const db = adminDb();
    await db.collection("payments").doc(order.id).set({
      uid,
      razorpayOrderId: order.id,
      razorpayPaymentId: null,
      amountPaise,
      currency: "INR",
      planOrPack,
      status: "pending",
      createdAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      data: {
        orderId: order.id,
        amountPaise,
        description,
        keyId: process.env.RAZORPAY_KEY_ID!,
      },
    });
  } catch (err) {
    console.error("[create-order]", err);
    return NextResponse.json({ ok: false, error: "Failed to create order" }, { status: 500 });
  }
}
