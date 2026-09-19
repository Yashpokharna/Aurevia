import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import { brand } from "../brand";
import { PaymentConfigError, type CheckoutContext, type CheckoutSession, type PaymentGateway, type WebhookEvent } from "./types";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

let client: Razorpay | null = null;

function getClient(): Razorpay {
  if (!keyId || !keySecret) {
    throw new PaymentConfigError(
      "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local."
    );
  }
  client ??= new Razorpay({ key_id: keyId, key_secret: keySecret });
  return client;
}

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export const razorpayGateway: PaymentGateway = {
  id: "razorpay",
  label: "Razorpay",

  isConfigured() {
    return Boolean(keyId && keySecret);
  },

  async createSession(context: CheckoutContext): Promise<CheckoutSession> {
    const order = await getClient().orders.create({
      amount: context.amount,
      currency: context.currency,
      // Razorpay caps receipts at 40 characters.
      receipt: context.orderId.slice(0, 40),
      notes: {
        productId: context.product.id,
        productTitle: context.product.title,
        quantity: String(context.quantity),
        internalOrderId: context.orderId,
      },
    });

    return {
      gateway: "razorpay",
      orderId: context.orderId,
      razorpayOrderId: order.id,
      keyId: keyId as string,
      amount: context.amount,
      currency: context.currency,
      name: brand.name,
      description: `${context.product.title} × ${context.quantity}`,
      prefillEmail: context.email,
    };
  },

  async verifyWebhook(rawBody: string, signature: string): Promise<WebhookEvent> {
    if (!webhookSecret) {
      throw new PaymentConfigError("RAZORPAY_WEBHOOK_SECRET is not set — refusing to trust this webhook.");
    }
    const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    if (!safeCompare(expected, signature)) {
      throw new Error("Invalid Razorpay webhook signature.");
    }

    const event = JSON.parse(rawBody) as {
      event: string;
      payload?: { payment?: { entity?: { id?: string; order_id?: string; email?: string } } };
    };
    const payment = event.payload?.payment?.entity;

    return {
      gatewayRef: payment?.order_id ?? "",
      status: event.event === "payment.captured" || event.event === "order.paid" ? "paid" : "failed",
      paymentRef: payment?.id,
      email: payment?.email,
    };
  },
};

/**
 * Verifies the signature Razorpay Checkout hands back to the browser on success.
 * This is the fast path that lets us show a confirmation immediately; the
 * webhook remains the authoritative record.
 */
export function verifyCheckoutSignature(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): boolean {
  if (!keySecret) return false;
  const expected = createHmac("sha256", keySecret)
    .update(`${params.razorpayOrderId}|${params.razorpayPaymentId}`)
    .digest("hex");
  return safeCompare(expected, params.signature);
}
