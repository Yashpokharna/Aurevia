"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

/** Keep in sync with the header's height in `site-header.tsx`. */
const HEADER_HEIGHT = "top-17";

export function MobileNav({ items }: { items: readonly { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // Lock scroll and listen for Escape while the panel is up. Navigation closes
  // the panel from the link's own onClick, so there's no route effect here.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        className="-mr-2 inline-flex h-10 w-10 items-center justify-center rounded-md text-ink md:hidden"
      >
        <span className="relative block h-3 w-5">
          <span
            className={`absolute left-0 block h-px w-5 bg-current transition-transform duration-200 ${
              open ? "top-1.5 rotate-45" : "top-0"
            }`}
          />
          <span
            className={`absolute left-0 block h-px w-5 bg-current transition-transform duration-200 ${
              open ? "top-1.5 -rotate-45" : "top-3"
            }`}
          />
        </span>
      </button>

      {/*
       * Portalled to <body> deliberately. The header uses `backdrop-blur`, and a
       * backdrop-filter makes an element the containing block for its
       * `position: fixed` descendants — rendering the panel inside the header
       * collapsed it to zero height against the header's own box.
       */}
      {open
        ? createPortal(
            <div
              id={panelId}
              className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas md:hidden ${HEADER_HEIGHT}`}
            >
              <nav className="shell flex flex-col gap-1 py-6" aria-label="Primary, mobile">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="border-b border-line py-4 font-display text-2xl text-ink"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>,
            document.body
          )
        : null}
    </>
  );
}
