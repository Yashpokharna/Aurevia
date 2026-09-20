export type CurrencyCode = "INR" | "USD";

export const CURRENCIES: readonly CurrencyCode[] = ["INR", "USD"];

export type MediaKind = "image" | "video";

export interface ProductMedia {
  id: string;
  kind: MediaKind;
  /** Public URL: a local `/uploads/...` path or a remote https URL. */
  url: string;
  /** Poster frame for videos. Optional but strongly recommended. */
  posterUrl?: string;
  alt: string;
}

/** Amounts are always in minor units (paise for INR, cents for USD). */
export type PriceMap = Record<CurrencyCode, number>;

export interface Product {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  highlights: string[];
  media: ProductMedia[];
  price: PriceMap;
  /** Strike-through "was" price, per currency. Partial: set only where it applies. */
  compareAtPrice?: Partial<PriceMap>;
  /** `null` means "always in stock" (made to order, digital, etc.). */
  inventory: number | null;
  status: "draft" | "published";
  /** Categories are not modelled yet — this is the hook for when they are. */
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = "created" | "paid" | "failed" | "refunded";

export interface Order {
  id: string;
  productId: string;
  productTitle: string;
  quantity: number;
  currency: CurrencyCode;
  /** Total charged, in minor units. */
  amount: number;
  gateway: "razorpay" | "stripe";
  /** Razorpay order id, or Stripe checkout session id. */
  gatewayRef: string;
  /** Payment id once captured. */
  paymentRef?: string;
  status: OrderStatus;
  email?: string;
  createdAt: string;
  updatedAt: string;
}
