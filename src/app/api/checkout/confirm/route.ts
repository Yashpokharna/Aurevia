import type { NextRequest } from "next/server";
import { verifyCheckoutSignature } from "@/lib/payments";
import { orders } from "@/lib/repository/orders";

export const dynamic = "force-dynamic";

/**
 * Called by the browser the moment Razorpay's modal reports success. It exists
 * only so we can show a confirmation page immediately — the webhook is still
 * the authoritative record, and it is idempotent with this.
 */
export async function POST(request: NextRequest) {
  let body: {
    orderId?: string;
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const { razorpay_order_id: razorpayOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = body;

  if (!razorpayOrderId || !paymentId || !signature) {
    return Response.json({ error: "Missing payment details." }, { status: 400 });
  }

  const valid = verifyCheckoutSignature({
    razorpayOrderId,
    razorpayPaymentId: paymentId,
    signature,
  });

  if (!valid) {
    console.warn("[checkout] rejected a confirmation with a bad signature", { razorpayOrderId });
    return Response.json({ error: "Could not verify that payment." }, { status: 400 });
  }

  const order = await orders.markStatus(razorpayOrderId, "paid", paymentId);
  if (!order) {
    return Response.json({ error: "We don't have a record of that order." }, { status: 404 });
  }

  return Response.json({ ok: true, orderId: order.id });
}
