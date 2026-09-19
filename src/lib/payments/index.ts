import "server-only";
import type { CurrencyCode } from "../types";
import { razorpayGateway } from "./razorpay";
import { stripeGateway } from "./stripe";
import type { GatewayId, PaymentGateway } from "./types";

export * from "./types";
export { verifyCheckoutSignature } from "./razorpay";
export { retrieveCheckoutStatus } from "./stripe";

const GATEWAYS: Record<GatewayId, PaymentGateway> = {
  razorpay: razorpayGateway,
  stripe: stripeGateway,
};

/**
 * India is charged in INR through Razorpay (UPI, netbanking, RuPay, cards);
 * everywhere else is charged in USD through Stripe. Both are overridable by env
 * if you consolidate onto one provider later.
 */
const ROUTING: Record<CurrencyCode, GatewayId> = {
  INR: (process.env.GATEWAY_INR as GatewayId) || "razorpay",
  USD: (process.env.GATEWAY_USD as GatewayId) || "stripe",
};

export function gatewayForCurrency(currency: CurrencyCode): PaymentGateway {
  return GATEWAYS[ROUTING[currency]] ?? GATEWAYS.razorpay;
}

export function getGateway(id: GatewayId): PaymentGateway {
  return GATEWAYS[id];
}

/** Used by the UI to show an honest "payments not live yet" state. */
export function isCurrencyPayable(currency: CurrencyCode): boolean {
  return gatewayForCurrency(currency).isConfigured();
}

export function configuredGateways(): GatewayId[] {
  return (Object.keys(GATEWAYS) as GatewayId[]).filter((id) => GATEWAYS[id].isConfigured());
}
