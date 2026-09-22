"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { MediaKind, ProductMedia } from "@/lib/types";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime";

let counter = 0;
const nextId = () => `m-${Date.now().toString(36)}-${counter++}`;

interface UploadResult {
  url: string;
  kind: MediaKind;
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json();
    return payload.error ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Two-step upload. The server checks the session, type and size and either
 * hands back a signed URL (Supabase) — in which case the file goes straight
 * from this browser to storage, never through our server — or says "server",
 * in which case we POST the file to /api/upload as in local development.
 */
async function uploadFile(file: File): Promise<UploadResult> {
  const sign = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contentType: file.type, size: file.size }),
  });
  if (!sign.ok) throw new Error(await readError(sign, "Upload failed."));
  const plan = await sign.json();

  if (plan.mode === "direct") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      throw new Error("Supabase public URL/key missing — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
    }
    // Loaded only when actually uploading, so it never weighs on the storefront.
    const { createClient } = await import("@supabase/supabase-js");
    const { error } = await createClient(url, key)
      .storage.from(plan.bucket)
      .uploadToSignedUrl(plan.path, plan.token, file, { contentType: file.type, cacheControl: "31536000" });
    if (error) throw new Error(error.message);
    return { url: plan.publicUrl, kind: plan.kind };
  }

  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/api/upload", { method: "POST", body });
  if (!response.ok) throw new Error(await readError(response, "Upload failed."));
  const payload = await response.json();
  return { url: payload.url, kind: payload.kind };
}

export function MediaManager({
  value,
  onChange,
  maxVideoLabel = "100MB",
}: {
  value: ProductMedia[];
  onChange: (media: ProductMedia[]) => void;
  /** Supabase's free plan caps files at 50MB, so the server tells us the real limit. */
  maxVideoLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [urlDraft, setUrlDraft] = useState("");
  const [urlKind, setUrlKind] = useState<MediaKind>("image");

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;

    setErrors([]);
    setUploading(list.map((file) => file.name));

    const added: ProductMedia[] = [];
    const failures: string[] = [];

    // Sequential: a parallel burst of 100MB videos is a good way to run the
    // dev server out of memory.
    for (const file of list) {
      try {
        const result = await uploadFile(file);
        added.push({ id: nextId(), kind: result.kind, url: result.url, alt: "" });
      } catch (error) {
        failures.push(`${file.name}: ${error instanceof Error ? error.message : "upload failed"}`);
      } finally {
        setUploading((current) => current.filter((name) => name !== file.name));
      }
    }

    if (added.length) onChange([...value, ...added]);
    if (failures.length) setErrors(failures);
    setUploading([]);
  }

  function addByUrl() {
    const url = urlDraft.trim();
    if (!url) return;
    onChange([...value, { id: nextId(), kind: urlKind, url, alt: "" }]);
    setUrlDraft("");
  }

  function patch(id: string, changes: Partial<ProductMedia>) {
    onChange(value.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  // Width is deliberately not baked in: `w-full` here would collide with the
  // narrower width the select wants, and Tailwind resolves that by CSS order,
  // not by the order you wrote the classes in.
  const controlBase =
    "h-10 rounded-md border border-line bg-canvas px-3 text-sm text-ink outline-none transition-colors focus:border-brass";
  const control = `${controlBase} w-full`;

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void upload(event.dataTransfer.files);
        }}
        className={`rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? "border-brass bg-brass-wash" : "border-line-strong bg-canvas-deep/35"
        }`}
      >
        <p className="text-sm text-ink-soft">
          Drag images or video here, or{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-medium text-brass underline underline-offset-2"
          >
            choose files
          </button>
        </p>
        <p className="mt-1.5 text-xs text-ink-muted">
          JPEG, PNG, WebP, AVIF up to 15MB · MP4, WebM, MOV up to {maxVideoLabel}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          onChange={(event) => {
            if (event.target.files) void upload(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {uploading.length > 0 ? (
        <p className="mt-3 text-sm text-ink-muted" aria-live="polite">
          Uploading {uploading.join(", ")}…
        </p>
      ) : null}

      {errors.length > 0 ? (
        <ul className="mt-3 space-y-1" role="alert">
          {errors.map((message) => (
            <li key={message} className="text-sm text-critical">
              {message}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          type="url"
          value={urlDraft}
          onChange={(event) => setUrlDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addByUrl();
            }
          }}
          placeholder="…or paste a hosted image / video URL"
          className={`${control} min-w-56 flex-1`}
        />
        <select
          value={urlKind}
          onChange={(event) => setUrlKind(event.target.value as MediaKind)}
          aria-label="Media type"
          className={`${controlBase} w-28`}
        >
          <option value="image">Image</option>
          <option value="video">Video</option>
        </select>
        <button
          type="button"
          onClick={addByUrl}
          className="h-10 rounded-md border border-line-strong px-4 text-sm font-medium text-ink transition-colors hover:border-ink"
        >
          Add
        </button>
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        Remote image hosts must be allowlisted in <code>next.config.ts</code> before they render.
      </p>

      {value.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {value.map((item, index) => (
            <li
              key={item.id}
              className="flex gap-4 rounded-lg border border-line bg-canvas p-3"
            >
              <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-canvas-deep">
                {item.kind === "video" ? (
                  item.posterUrl ? (
                    <Image src={item.posterUrl} alt="" fill sizes="80px" className="object-cover" unoptimized />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[0.625rem] uppercase tracking-wider text-ink-muted">
                      Video
                    </span>
                  )
                ) : (
                  <Image src={item.url} alt="" fill sizes="80px" className="object-cover" unoptimized />
                )}
                {index === 0 ? (
                  <span className="absolute inset-x-0 bottom-0 bg-ink/80 py-0.5 text-center text-[0.5625rem] uppercase tracking-wider text-canvas">
                    Cover
                  </span>
                ) : null}
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <p className="truncate text-xs text-ink-muted" title={item.url}>
                  {item.kind === "video" ? "Video" : "Image"} · {item.url}
                </p>
                <input
                  type="text"
                  value={item.alt}
                  onChange={(event) => patch(item.id, { alt: event.target.value })}
                  placeholder="Alt text — describe what's shown"
                  className={control}
                />
                {item.kind === "video" ? (
                  <input
                    type="url"
                    value={item.posterUrl ?? ""}
                    onChange={(event) => patch(item.id, { posterUrl: event.target.value })}
                    placeholder="Poster image URL (shown before play)"
                    className={control}
                  />
                ) : null}
              </div>

              <div className="flex shrink-0 flex-col items-end justify-between">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                    className="h-7 w-7 rounded-sm border border-line text-xs text-ink-soft disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === value.length - 1}
                    aria-label="Move down"
                    className="h-7 w-7 rounded-sm border border-line text-xs text-ink-soft disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((media) => media.id !== item.id))}
                  className="text-xs text-ink-muted transition-colors hover:text-critical"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-ink-muted">
          No media yet. The first image becomes the cover shot everywhere on the store.
        </p>
      )}
    </div>
  );
}
