import type { NextRequest } from "next/server";
import { getGateway, PaymentConfigError } from "@/lib/payments";
import { orders } from "@/lib/repository/orders";

export const dynamic = "force-dynamic";

/**
 * Point Stripe at /api/webhooks/stripe and subscribe to
 * `checkout.session.completed` and `checkout.session.async_payment_failed`.
 *
 * Locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
 */
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const rawBody = await request.text();

  try {
    const event = await getGateway("stripe").verifyWebhook(rawBody, signature);
    if (event.gatewayRef) {
      await orders.markStatus(event.gatewayRef, event.status, event.paymentRef);
    }
    return Response.json({ received: true });
  } catch (error) {
    if (error instanceof PaymentConfigError) {
      console.error("[webhook:stripe]", error.message);
      return new Response("Webhook not configured", { status: 503 });
    }
    console.error("[webhook:stripe] verification failed", error);
    return new Response("Invalid signature", { status: 400 });
  }
}
