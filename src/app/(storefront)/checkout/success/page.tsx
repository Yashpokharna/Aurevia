import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { formatMoney } from "@/lib/money";
import { retrieveCheckoutStatus } from "@/lib/payments";
import { orders } from "@/lib/repository/orders";

export const metadata: Metadata = {
  title: "Order confirmed",
  robots: { index: false },
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CheckoutSuccessPage(props: PageProps<"/checkout/success">) {
  const searchParams = await props.searchParams;
  const orderId = firstValue(searchParams.order);
  const stripeSessionId = firstValue(searchParams.session_id);

  let order = orderId ? await orders.findById(orderId) : null;

  // Stripe sends the customer back before the webhook necessarily lands. Ask
  // Stripe directly so we show the right thing on the first paint.
  if (order && order.status === "created" && order.gateway === "stripe" && stripeSessionId) {
    const status = await retrieveCheckoutStatus(stripeSessionId);
    if (status?.paid) {
      order = (await orders.markStatus(order.gatewayRef, "paid", status.paymentRef)) ?? order;
    }
  }

  const confirmed = order?.status === "paid";

  return (
    <div className="shell flex min-h-[70vh] items-center py-20">
      <div className="mx-auto max-w-lg text-center">
        <span
          className={`inline-flex h-14 w-14 items-center justify-center rounded-full ${
            confirmed ? "bg-positive/12 text-positive" : "bg-brass-wash text-brass"
          }`}
          aria-hidden="true"
        >
          {confirmed ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="m5 13 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>

        <h1 className="mt-7 font-display text-4xl leading-tight text-ink">
          {confirmed ? "Thank you — your order is in." : "We're confirming your payment"}
        </h1>

        <p className="mt-4 text-base leading-relaxed text-ink-soft">
          {confirmed
            ? "A receipt is on its way to your inbox. We'll email you again the moment it ships."
            : "This usually takes a few seconds. Refresh the page, or leave it with us — we'll email you either way."}
        </p>

        {order ? (
          <dl className="mt-10 divide-y divide-line rounded-lg border border-line bg-canvas-deep/40 text-left text-sm">
            <div className="flex justify-between gap-4 px-5 py-3.5">
              <dt className="text-ink-muted">Order</dt>
              <dd className="font-mono text-xs text-ink">{order.id.slice(0, 13)}</dd>
            </div>
            <div className="flex justify-between gap-4 px-5 py-3.5">
              <dt className="text-ink-muted">Item</dt>
              <dd className="text-right text-ink">
                {order.productTitle} × {order.quantity}
              </dd>
            </div>
            <div className="flex justify-between gap-4 px-5 py-3.5">
              <dt className="text-ink-muted">Total</dt>
              <dd className="font-medium tabular-nums text-ink">
                {formatMoney(order.amount, order.currency)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-8 text-sm text-ink-muted">
            We couldn&apos;t find that order reference. If money has left your account, email{" "}
            <a href={`mailto:${brand.contactEmail}`} className="text-brass underline underline-offset-2">
              {brand.contactEmail}
            </a>{" "}
            and we&apos;ll sort it out.
          </p>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/products"
            className="inline-flex h-11 items-center rounded-md bg-ink px-6 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
          >
            Keep browsing
          </Link>
          <a
            href={`mailto:${brand.contactEmail}`}
            className="inline-flex h-11 items-center rounded-md border border-line-strong px-6 text-sm font-medium text-ink transition-colors hover:border-ink"
          >
            Contact us
          </a>
        </div>
      </div>
    </div>
  );
}
