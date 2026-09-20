"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveProductAction, type FormState } from "@/app/admin/actions";
import { INR_PER_USD, suggestUsdFromInr, toMajorUnits, toMinorUnits } from "@/lib/money";
import type { Product, ProductMedia } from "@/lib/types";
import { MediaManager } from "./media-manager";

const control =
  "mt-2 h-11 w-full rounded-md border border-line bg-canvas px-3.5 text-sm text-ink outline-none transition-colors focus:border-brass";
const labelClass = "block text-sm font-medium text-ink";
const hintClass = "mt-1.5 text-xs text-ink-muted";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-6 border-t border-line py-8 md:grid-cols-[minmax(0,15rem)_1fr] md:gap-12">
      <div>
        <h2 className="font-display text-lg text-ink">{title}</h2>
        {description ? <p className="mt-1.5 text-sm text-ink-muted">{description}</p> : null}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function SaveButton({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-md bg-ink px-6 text-sm font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {pending ? "Saving…" : isNew ? "Create product" : "Save changes"}
    </button>
  );
}

export function ProductForm({ product }: { product?: Product }) {
  const [state, formAction] = useActionState<FormState, FormData>(saveProductAction, {});
  const [media, setMedia] = useState<ProductMedia[]>(product?.media ?? []);
  const [title, setTitle] = useState(product?.title ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [priceInr, setPriceInr] = useState(product ? toMajorUnits(product.price.INR, "INR") : "");
  const [priceUsd, setPriceUsd] = useState(product ? toMajorUnits(product.price.USD, "USD") : "");

  const isNew = !product;
  const fieldError = (name: string) => state.fieldErrors?.[name];

  return (
    <form action={formAction} className="pb-20">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      {/* Media lives in React state and rides along as JSON. */}
      <input type="hidden" name="media" value={JSON.stringify(media)} />

      <div className="flex flex-wrap items-end justify-between gap-4 pb-8">
        <div>
          <Link href="/admin" className="text-sm text-ink-muted transition-colors hover:text-ink">
            &larr; Products
          </Link>
          <h1 className="mt-2 font-display text-3xl text-ink">
            {isNew ? "Add a product" : product.title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {!isNew ? (
            <Link
              href={`/products/${product.slug}`}
              className="h-11 rounded-md border border-line-strong px-5 text-sm font-medium leading-[2.6rem] text-ink transition-colors hover:border-ink"
            >
              Preview
            </Link>
          ) : null}
          <SaveButton isNew={isNew} />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="mb-6 rounded-md border border-critical/25 bg-critical/8 px-4 py-3 text-sm text-critical">
          {state.error}
        </p>
      ) : null}

      <Section title="Basics" description="What it is and how it reads on the page.">
        <div>
          <label htmlFor="title" className={labelClass}>
            Name
          </label>
          <input
            id="title"
            name="title"
            required
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!slugTouched) setSlug(slugify(event.target.value));
            }}
            className={control}
            placeholder="Brass Desk Lamp No. 4"
          />
          {fieldError("title") ? <p className="mt-1.5 text-xs text-critical">{fieldError("title")}</p> : null}
        </div>

        <div>
          <label htmlFor="subtitle" className={labelClass}>
            Short line <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <input
            id="subtitle"
            name="subtitle"
            defaultValue={product?.subtitle ?? ""}
            className={control}
            placeholder="Solid brass, hand-polished"
          />
        </div>

        <div>
          <label htmlFor="slug" className={labelClass}>
            URL
          </label>
          <div className="mt-2 flex items-center rounded-md border border-line bg-canvas focus-within:border-brass">
            <span className="pl-3.5 text-sm text-ink-muted">/products/</span>
            <input
              id="slug"
              name="slug"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              className="h-11 flex-1 bg-transparent pr-3.5 text-sm text-ink outline-none"
              placeholder="brass-desk-lamp-no-4"
            />
          </div>
          <p className={hintClass}>Changing this on a live product breaks existing links.</p>
        </div>

        <div>
          <label htmlFor="description" className={labelClass}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={6}
            defaultValue={product?.description ?? ""}
            className={`${control} h-auto resize-y py-3 leading-relaxed`}
            placeholder="What it's made of, how it's made, how it wears in."
          />
          {fieldError("description") ? (
            <p className="mt-1.5 text-xs text-critical">{fieldError("description")}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="highlights" className={labelClass}>
            Details
          </label>
          <textarea
            id="highlights"
            name="highlights"
            rows={4}
            defaultValue={product?.highlights.join("\n") ?? ""}
            className={`${control} h-auto resize-y py-3 leading-relaxed`}
            placeholder={"One per line\nSolid brass, unlacquered\n24 × 16 × 3 cm"}
          />
          <p className={hintClass}>One bullet per line.</p>
        </div>
      </Section>

      <Section
        title="Media"
        description="The first image is the cover. Video gets its own tab in the gallery."
      >
        <MediaManager value={media} onChange={setMedia} />
      </Section>

      <Section
        title="Pricing"
        description="Each currency is priced separately — nothing is converted at checkout."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="priceINR" className={labelClass}>
              Price — ₹ INR
            </label>
            <input
              id="priceINR"
              name="priceINR"
              type="number"
              step="0.01"
              min="0"
              required
              value={priceInr}
              onChange={(event) => setPriceInr(event.target.value)}
              className={control}
              placeholder="12990.00"
            />
            {fieldError("priceINR") ? (
              <p className="mt-1.5 text-xs text-critical">{fieldError("priceINR")}</p>
            ) : (
              <p className={hintClass}>Shown to visitors in India.</p>
            )}
          </div>

          <div>
            <label htmlFor="priceUSD" className={labelClass}>
              Price — $ USD
            </label>
            <input
              id="priceUSD"
              name="priceUSD"
              type="number"
              step="0.01"
              min="0"
              required
              value={priceUsd}
              onChange={(event) => setPriceUsd(event.target.value)}
              className={control}
              placeholder="148.00"
            />
            {fieldError("priceUSD") ? (
              <p className="mt-1.5 text-xs text-critical">{fieldError("priceUSD")}</p>
            ) : (
              <p className={hintClass}>
                Shown everywhere else.{" "}
                <button
                  type="button"
                  onClick={() =>
                    setPriceUsd(
                      (suggestUsdFromInr(toMinorUnits(priceInr || "0", "INR")) / 100).toFixed(2)
                    )
                  }
                  className="text-brass underline underline-offset-2"
                >
                  Suggest from ₹
                </button>{" "}
                at ≈₹{INR_PER_USD}/$.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="compareINR" className={labelClass}>
              Was — ₹ INR <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              id="compareINR"
              name="compareINR"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.compareAtPrice?.INR ? toMajorUnits(product.compareAtPrice.INR, "INR") : ""}
              className={control}
            />
          </div>

          <div>
            <label htmlFor="compareUSD" className={labelClass}>
              Was — $ USD <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              id="compareUSD"
              name="compareUSD"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.compareAtPrice?.USD ? toMajorUnits(product.compareAtPrice.USD, "USD") : ""}
              className={control}
            />
          </div>
        </div>
        <p className={hintClass}>
          A &ldquo;was&rdquo; price above the current one shows a strike-through and a discount badge.
        </p>
      </Section>

      <Section title="Availability" description="Stock, category and whether it's visible.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="inventory" className={labelClass}>
              Stock
            </label>
            <input
              id="inventory"
              name="inventory"
              type="number"
              min="0"
              step="1"
              defaultValue={product?.inventory ?? ""}
              className={control}
              placeholder="Leave blank for unlimited"
            />
            <p className={hintClass}>Blank = always available. 0 = sold out.</p>
          </div>

          <div>
            <label htmlFor="status" className={labelClass}>
              Visibility
            </label>
            <select
              id="status"
              name="status"
              defaultValue={product?.status ?? "draft"}
              className={control}
            >
              <option value="draft">Draft — hidden from the store</option>
              <option value="published">Live — visible to everyone</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="category" className={labelClass}>
              Category <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              id="category"
              name="category"
              defaultValue={product?.category ?? ""}
              className={control}
              placeholder="Lighting"
            />
            <p className={hintClass}>
              Filters appear on the shop page automatically once any product has one.
            </p>
          </div>
        </div>
      </Section>

      <div className="flex items-center justify-end gap-3 border-t border-line pt-8">
        <Link
          href="/admin"
          className="h-11 rounded-md border border-line-strong px-5 text-sm font-medium leading-[2.6rem] text-ink transition-colors hover:border-ink"
        >
          Cancel
        </Link>
        <SaveButton isNew={isNew} />
      </div>
    </form>
  );
}
