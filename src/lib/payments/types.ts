import type { CurrencyCode, Product } from "../types";

export type GatewayId = "razorpay" | "stripe";

export interface CheckoutContext {
  product: Product;
  quantity: number;
  currency: CurrencyCode;
  /** Total in minor units — computed server-side, never trusted from the client. */
  amount: number;
  /** Absolute origin of the current request, used to build return URLs. */
  origin: string;
  orderId: string;
  email?: string;
}

/**
 * What the browser needs in order to complete payment. Razorpay opens a modal
 * in place; Stripe redirects to a hosted page. The client component switches on
 * `gateway`.
 */
export type CheckoutSession =
  | {
      gateway: "razorpay";
      orderId: string;
      razorpayOrderId: string;
      keyId: string;
      amount: number;
      currency: CurrencyCode;
      name: string;
      description: string;
      prefillEmail?: string;
    }
  | {
      gateway: "stripe";
      orderId: string;
      url: string;
      sessionId: string;
    };

export interface PaymentGateway {
  id: GatewayId;
  label: string;
  isConfigured(): boolean;
  createSession(context: CheckoutContext): Promise<CheckoutSession>;
  /** Throws if the signature doesn't match. Returns the parsed event. */
  verifyWebhook(rawBody: string, signature: string): Promise<WebhookEvent>;
}

export interface WebhookEvent {
  /** The gateway reference we stored on the order. */
  gatewayRef: string;
  status: "paid" | "failed";
  paymentRef?: string;
  email?: string;
}

export class PaymentConfigError extends Error {}
