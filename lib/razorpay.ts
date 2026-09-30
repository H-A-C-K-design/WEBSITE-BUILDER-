import crypto from "crypto";

// Server-side only
export function getRazorpayInstance() {
  const Razorpay = require("razorpay");
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

/** Verify the payment signature from Razorpay Checkout */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const body = `${params.orderId}|${params.paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");
  return expectedSignature === params.signature;
}

/** Verify the webhook signature from Razorpay */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex");
  return expectedSignature === signature;
}

/** Convert INR rupees to paise */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
