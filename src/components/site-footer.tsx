import Link from "next/link";
import { brand } from "@/lib/brand";
import { CURRENCY_META } from "@/lib/money";
import { getCurrency } from "@/lib/region";

export async function SiteFooter() {
  const currency = await getCurrency();
  const year = new Date().getFullYear();

  return (
    <footer id="contact" className="mt-24 bg-ink text-canvas">
      <div className="shell py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr] md:gap-16">
          <div>
            <p className="eyebrow text-brass-bright">Get in touch</p>
            <h2 className="mt-4 font-display text-3xl leading-tight md:text-4xl">
              Questions about a piece,
              <br />
              an order, or a country we
              <br />
              don&apos;t ship to yet?
            </h2>
            <a
              href={`mailto:${brand.contactEmail}`}
              className="mt-6 inline-block border-b border-brass-bright/50 pb-1 text-lg text-brass-bright transition-colors hover:border-brass-bright hover:text-canvas"
            >
              {brand.contactEmail}
            </a>
            <p className="mt-3 text-sm text-canvas/55">
              We reply to everything, {brand.supportHours}.
            </p>
          </div>

          <nav aria-label="Shop">
            <p className="eyebrow text-canvas/40">Shop</p>
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <Link href="/products" className="text-canvas/75 transition-colors hover:text-canvas">
                  All products
                </Link>
              </li>
              <li>
                <Link href="/#featured" className="text-canvas/75 transition-colors hover:text-canvas">
                  New arrivals
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Elsewhere">
            <p className="eyebrow text-canvas/40">Elsewhere</p>
            <ul className="mt-5 space-y-3 text-sm">
              {brand.social.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    rel="noreferrer noopener"
                    target="_blank"
                    className="text-canvas/75 transition-colors hover:text-canvas"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href={`mailto:${brand.contactEmail}`}
                  className="text-canvas/75 transition-colors hover:text-canvas"
                >
                  Email us
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-16 flex flex-col gap-6 border-t border-canvas/12 pt-8 text-xs text-canvas/50 md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {brand.legalName}. {brand.tagline}
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span>
              Showing {CURRENCY_META[currency].label} ({currency})
            </span>
            <span>Secure payments by Razorpay &amp; Stripe</span>
            <Link href="/admin" className="transition-colors hover:text-canvas">
              Store admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
