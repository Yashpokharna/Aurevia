"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductMedia } from "@/lib/types";

export function ProductGallery({ media, title }: { media: ProductMedia[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (media.length === 0) {
    return (
      <div className="flex aspect-4/5 items-center justify-center self-start rounded-lg bg-canvas-deep text-sm text-ink-muted">
        No media yet
      </div>
    );
  }

  const active = media[Math.min(activeIndex, media.length - 1)];

  return (
    /*
     * `self-start` matters: this sits in a two-column grid whose other column is
     * usually taller, and without it the grid stretches the gallery and the
     * aspect ratio on the stage is overridden — images render distorted.
     */
    <div className="flex flex-col-reverse gap-4 self-start lg:sticky lg:top-24 lg:flex-row lg:items-start">
      {media.length > 1 ? (
        <ul
          className="flex gap-3 overflow-x-auto pb-1 lg:w-20 lg:flex-col lg:overflow-visible lg:pb-0"
          aria-label={`${title} media`}
        >
          {media.map((item, index) => (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-current={index === activeIndex ? "true" : undefined}
                aria-label={`View ${item.kind} ${index + 1} of ${media.length}`}
                className={`relative block h-20 w-16 overflow-hidden rounded-md bg-canvas-deep transition-all lg:h-24 lg:w-20 ${
                  index === activeIndex
                    ? "ring-2 ring-ink ring-offset-2 ring-offset-canvas"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <Image
                  src={item.kind === "video" ? (item.posterUrl ?? "") : item.url}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized={item.kind === "video" && !item.posterUrl}
                />
                {item.kind === "video" ? (
                  <span className="absolute inset-0 grid place-items-center bg-ink/25">
                    <svg width="12" height="14" viewBox="0 0 9 10" fill="white" aria-hidden="true">
                      <path d="M0 .8C0 .2.7-.2 1.2.1l6.6 4.2c.5.3.5 1 0 1.3L1.2 9.9C.7 10.2 0 9.8 0 9.2V.8Z" />
                    </svg>
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative aspect-4/5 flex-1 overflow-hidden rounded-lg bg-canvas-deep">
        {active.kind === "video" ? (
          <video
            key={active.id}
            src={active.url}
            poster={active.posterUrl}
            controls
            playsInline
            preload="metadata"
            className="h-full w-full bg-ink object-cover"
          >
            <p className="p-6 text-sm text-canvas">
              Your browser can&apos;t play this video.{" "}
              <a href={active.url} className="underline">
                Download it instead
              </a>
              .
            </p>
          </video>
        ) : (
          <Image
            key={active.id}
            src={active.url}
            alt={active.alt || title}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            quality={90}
            className="object-cover"
          />
        )}
      </div>
    </div>
  );
}
