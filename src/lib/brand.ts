/**
 * Single source of truth for everything brand-facing.
 * Change the values here and the whole site follows.
 */
export const brand = {
  name: "Aurevia",
  wordmark: "AUREVIA",
  tagline: "Objects worth keeping.",
  description:
    "A small, considered catalogue. Each piece is chosen for how it is made, how it wears, and how long it lasts.",
  // Override in .env.local without touching code.
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@aurevia.com",
  supportHours: "Mon–Fri, 10:00–18:00 IST",
  social: [
    { label: "Instagram", href: "https://instagram.com" },
    { label: "X", href: "https://x.com" },
  ],
  legalName: "Aurevia",
  foundedYear: 2026,
} as const;

export const siteNav = [
  { label: "Shop", href: "/products" },
  { label: "Our story", href: "/#story" },
  { label: "Contact", href: "/#contact" },
] as const;
