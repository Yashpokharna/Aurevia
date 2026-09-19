import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { gatewayForCurrency, PaymentConfigError } from "@/lib/payments";
import { orders } from "@/lib/repository/orders";
import { products } from "@/lib/repository/products";
import { isCurrency } from "@/lib/region";

export const dynamic = "force-dynamic";

const MAX_QUANTITY = 10;

/** Trust the proxy's forwarded host so return URLs are right behind a CDN. */
function originOf(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) return `${forwardedProto ?? "https"}://${forwardedHost}`;
  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  let body: { productId?: string; quantity?: number; currency?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const { productId, currency, email } = body;
  const quantity = Math.floor(Number(body.quantity ?? 1));

  if (!productId || !isCurrency(currency)) {
    return Response.json({ error: "Missing product or currency." }, { status: 400 });
  }
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return Response.json({ error: `Quantity must be between 1 and ${MAX_QUANTITY}.` }, { status: 400 });
  }

  const product = await products.findById(productId);
  if (!product || product.status !== "published") {
    return Response.json({ error: "That product is no longer available." }, { status: 404 });
  }
  if (product.inventory !== null && product.inventory < quantity) {
    return Response.json(
      { error: product.inventory === 0 ? "That product is sold out." : `Only ${product.inventory} left.` },
      { status: 409 }
    );
  }

  const unitPrice = product.price[currency];
  if (!unitPrice || unitPrice <= 0) {
    return Response.json({ error: `This product has no ${currency} price set.` }, { status: 409 });
  }

  // Price is always recomputed here. Whatever the client sent is ignored.
  const amount = unitPrice * quantity;
  const gateway = gatewayForCurrency(currency);

  if (!gateway.isConfigured()) {
    return Response.json(
      { error: `${gateway.label} isn't configured yet, so ${currency} checkout is unavailable.` },
      { status: 503 }
    );
  }

  const internalOrderId = randomUUID();

  try {
    const session = await gateway.createSession({
      product,
      quantity,
      currency,
      amount,
      origin: originOf(request),
      orderId: internalOrderId,
      email,
    });

    await orders.create({
      id: internalOrderId,
      productId: product.id,
      productTitle: product.title,
      quantity,
      currency,
      amount,
      gateway: gateway.id,
      gatewayRef: session.gateway === "razorpay" ? session.razorpayOrderId : session.sessionId,
      status: "created",
      email,
    });

    return Response.json(session);
  } catch (error) {
    if (error instanceof PaymentConfigError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    console.error("[checkout] failed to create session", error);
    return Response.json({ error: "We couldn't start checkout. Please try again." }, { status: 502 });
  }
}
