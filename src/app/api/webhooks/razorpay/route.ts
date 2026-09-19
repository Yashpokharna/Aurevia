import type { NextRequest } from "next/server";
import { getGateway, PaymentConfigError } from "@/lib/payments";
import { orders } from "@/lib/repository/orders";

export const dynamic = "force-dynamic";

/**
 * Point your Razorpay dashboard webhook at /api/webhooks/razorpay and subscribe
 * to `payment.captured` and `payment.failed`.
 *
 * The raw body is read as text because the signature is computed over the exact
 * bytes Razorpay sent — parsing first would break verification.
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const rawBody = await request.text();

  try {
    const event = await getGateway("razorpay").verifyWebhook(rawBody, signature);
    if (event.gatewayRef) {
      await orders.markStatus(event.gatewayRef, event.status, event.paymentRef);
    }
    return Response.json({ received: true });
  } catch (error) {
    if (error instanceof PaymentConfigError) {
      console.error("[webhook:razorpay]", error.message);
      return new Response("Webhook not configured", { status: 503 });
    }
    console.error("[webhook:razorpay] verification failed", error);
    return new Response("Invalid signature", { status: 400 });
  }
}
