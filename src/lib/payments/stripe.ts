import "server-only";
import Stripe from "stripe";
import { PaymentConfigError, type CheckoutContext, type CheckoutSession, type PaymentGateway, type WebhookEvent } from "./types";

const secretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

let client: Stripe | null = null;

function getClient(): Stripe {
  if (!secretKey) {
    throw new PaymentConfigError(
      "Stripe is not configured. Add STRIPE_SECRET_KEY to .env.local."
    );
  }
  client ??= new Stripe(secretKey);
  return client;
}

/** Stripe only accepts absolute, publicly-resolvable image URLs. */
function absoluteImages(context: CheckoutContext): string[] {
  return context.product.media
    .filter((item) => item.kind === "image")
    .slice(0, 4)
    .map((item) => (item.url.startsWith("http") ? item.url : `${context.origin}${item.url}`))
    .filter((url) => !url.includes("localhost"));
}

export const stripeGateway: PaymentGateway = {
  id: "stripe",
  label: "Stripe",

  isConfigured() {
    return Boolean(secretKey);
  },

  async createSession(context: CheckoutContext): Promise<CheckoutSession> {
    const session = await getClient().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: context.quantity,
          price_data: {
            currency: context.currency.toLowerCase(),
            // Per-unit price; Stripe multiplies by quantity itself.
            unit_amount: context.product.price[context.currency],
            product_data: {
              name: context.product.title,
              description: context.product.subtitle || undefined,
              images: absoluteImages(context),
            },
          },
        },
      ],
      client_reference_id: context.orderId,
      customer_email: context.email,
      metadata: {
        productId: context.product.id,
        internalOrderId: context.orderId,
      },
      success_url: `${context.origin}/checkout/success?order=${context.orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${context.origin}/products/${context.product.slug}?checkout=cancelled`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return { gateway: "stripe", orderId: context.orderId, url: session.url, sessionId: session.id };
  },

  async verifyWebhook(rawBody: string, signature: string): Promise<WebhookEvent> {
    if (!webhookSecret) {
      throw new PaymentConfigError("STRIPE_WEBHOOK_SECRET is not set — refusing to trust this webhook.");
    }
    const event = await getClient().webhooks.constructEventAsync(rawBody, signature, webhookSecret);
    const session = event.data.object as Stripe.Checkout.Session;

    return {
      gatewayRef: session.id,
      status: event.type === "checkout.session.completed" && session.payment_status === "paid" ? "paid" : "failed",
      paymentRef: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      email: session.customer_details?.email ?? undefined,
    };
  },
};

/**
 * Reads a checkout session straight from Stripe. Used by the success page so a
 * customer isn't shown "confirming…" while we wait for the webhook to land.
 */
export async function retrieveCheckoutStatus(
  sessionId: string
): Promise<{ paid: boolean; paymentRef?: string; email?: string } | null> {
  if (!secretKey) return null;
  try {
    const session = await getClient().checkout.sessions.retrieve(sessionId);
    return {
      paid: session.payment_status === "paid",
      paymentRef: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      email: session.customer_details?.email ?? undefined,
    };
  } catch (error) {
    console.error("[stripe] could not retrieve session", error);
    return null;
  }
}
