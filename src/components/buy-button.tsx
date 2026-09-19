"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CurrencyCode } from "@/lib/types";
import { brand } from "@/lib/brand";

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
  on(event: string, handler: (payload: unknown) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("script")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not reach Razorpay. Check your connection."));
    document.body.appendChild(script);
  });
}

export function BuyButton({
  productId,
  currency,
  maxQuantity,
  soldOut,
  payable,
}: {
  productId: string;
  currency: CurrencyCode;
  /** `null` for unlimited stock. */
  maxQuantity: number | null;
  soldOut: boolean;
  payable: boolean;
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ceiling = Math.min(maxQuantity ?? 10, 10);

  async function startCheckout() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId, quantity, currency }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Checkout could not be started.");

      if (payload.gateway === "stripe") {
        window.location.href = payload.url;
        return;
      }

      await loadRazorpay();
      const Razorpay = window.Razorpay;
      if (!Razorpay) throw new Error("Razorpay failed to load.");

      const checkout = new Razorpay({
        key: payload.keyId,
        order_id: payload.razorpayOrderId,
        amount: payload.amount,
        currency: payload.currency,
        name: payload.name,
        description: payload.description,
        prefill: payload.prefillEmail ? { email: payload.prefillEmail } : undefined,
        theme: { color: "#9a6b35" },
        handler: async (result: RazorpayResponse) => {
          // Confirm server-side before showing anything as paid — the browser's
          // word alone is never enough.
          const confirmation = await fetch("/api/checkout/confirm", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ...result, orderId: payload.orderId }),
          });
          if (confirmation.ok) {
            router.push(`/checkout/success?order=${payload.orderId}`);
          } else {
            setError("We couldn't verify that payment. Please email us before trying again.");
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => setBusy(false),
        },
      });

      checkout.on("payment.failed", () => {
        setError("That payment didn't go through. No money has left your account.");
        setBusy(false);
      });

      checkout.open();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (soldOut) {
    return (
      <div className="mt-8">
        <button
          type="button"
          disabled
          className="h-13 w-full cursor-not-allowed rounded-md border border-line bg-canvas-deep text-sm font-medium text-ink-muted"
        >
          Sold out
        </button>
        <p className="mt-3 text-sm text-ink-muted">
          Email{" "}
          <a href={`mailto:${brand.contactEmail}`} className="text-brass underline underline-offset-2">
            {brand.contactEmail}
          </a>{" "}
          and we&apos;ll tell you when it&apos;s back.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-stretch gap-3">
        <div className="flex items-center rounded-md border border-line">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            disabled={quantity <= 1 || busy}
            aria-label="Decrease quantity"
            className="h-13 w-11 text-lg text-ink-soft transition-colors hover:text-ink disabled:opacity-35"
          >
            &minus;
          </button>
          <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.min(ceiling, value + 1))}
            disabled={quantity >= ceiling || busy}
            aria-label="Increase quantity"
            className="h-13 w-11 text-lg text-ink-soft transition-colors hover:text-ink disabled:opacity-35"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={startCheckout}
          disabled={busy || !payable}
          className="h-13 flex-1 rounded-md bg-ink px-8 text-sm font-medium tracking-wide text-canvas transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy ? "Opening secure checkout…" : "Buy now"}
        </button>
      </div>

      {!payable ? (
        <p className="mt-3 text-sm text-ink-muted">
          Checkout for {currency} isn&apos;t live yet. Email{" "}
          <a href={`mailto:${brand.contactEmail}`} className="text-brass underline underline-offset-2">
            {brand.contactEmail}
          </a>{" "}
          to order in the meantime.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-critical">
          {error}
        </p>
      ) : null}
    </div>
  );
}
