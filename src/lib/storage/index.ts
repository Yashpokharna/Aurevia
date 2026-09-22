import "server-only";
import { createWriteStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import { isSupabaseConfigured, MEDIA_BUCKET, supabaseAdmin } from "../supabase/server";
import type { MediaKind } from "../types";

export interface StoredFile {
  url: string;
  kind: MediaKind;
  bytes: number;
  contentType: string;
}

/** A pre-authorised upload the browser performs itself, straight to storage. */
export interface DirectUpload {
  bucket: string;
  path: string;
  token: string;
  publicUrl: string;
  kind: MediaKind;
}

export interface StorageAdapter {
  save(file: File): Promise<StoredFile>;
  remove(url: string): Promise<void>;
  /**
   * Present when the backend supports browser-to-storage uploads. Needed for
   * video on serverless hosts: Netlify rejects function request bodies over
   * ~6 MB, so large files can't be relayed through our own server.
   */
  createDirectUpload?(contentType: string, size: number): Promise<DirectUpload>;
}

/**
 * Allowlist by content type. Anything not listed here is rejected — we never
 * trust the file extension the browser sends.
 */
const ACCEPTED: Record<string, { kind: MediaKind; ext: string }> = {
  "image/jpeg": { kind: "image", ext: "jpg" },
  "image/png": { kind: "image", ext: "png" },
  "image/webp": { kind: "image", ext: "webp" },
  "image/avif": { kind: "image", ext: "avif" },
  "video/mp4": { kind: "video", ext: "mp4" },
  "video/webm": { kind: "video", ext: "webm" },
  "video/quicktime": { kind: "video", ext: "mov" },
};

export const MAX_IMAGE_BYTES = Number(process.env.MAX_IMAGE_BYTES ?? 15 * 1024 * 1024);
export const MAX_VIDEO_BYTES = Number(
  process.env.MAX_VIDEO_BYTES ??
    // Supabase's free plan caps a single file at 50 MB; locally we allow more.
    (isSupabaseConfigured() ? 50 * 1024 * 1024 : 100 * 1024 * 1024)
);

export const ACCEPT_ATTRIBUTE = Object.keys(ACCEPTED).join(",");

export class UploadError extends Error {}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Shared validation for both upload paths. Throws UploadError with a readable message. */
export function validateUpload(contentType: string, size: number): { kind: MediaKind; ext: string } {
  const accepted = ACCEPTED[contentType];
  if (!accepted) {
    throw new UploadError(
      `"${contentType || "unknown"}" files aren't supported. Use JPEG, PNG, WebP, AVIF, MP4, WebM or MOV.`
    );
  }
  const limit = accepted.kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (size > limit) {
    throw new UploadError(`That ${accepted.kind} is ${formatBytes(size)}. The limit is ${formatBytes(limit)}.`);
  }
  if (size <= 0) throw new UploadError("That file is empty.");
  return accepted;
}

// ─── Local disk (development) ────────────────────────────────────────────────

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const LOCAL_PREFIX = "/uploads/";

const localStorageAdapter: StorageAdapter = {
  async save(file) {
    const accepted = validateUpload(file.type, file.size);
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    // Random name: the original filename is attacker-controlled and never
    // touches the filesystem.
    const filename = `${randomUUID()}.${accepted.ext}`;
    await pipeline(
      Readable.fromWeb(file.stream() as never),
      createWriteStream(path.join(UPLOAD_DIR, filename))
    );
    return { url: `${LOCAL_PREFIX}${filename}`, kind: accepted.kind, bytes: file.size, contentType: file.type };
  },

  async remove(url) {
    if (!url.startsWith(LOCAL_PREFIX)) return; // Remote URL — nothing of ours to delete.
    // Re-join from the basename only, so a crafted URL can't escape the folder.
    await fs.rm(path.join(UPLOAD_DIR, path.basename(url)), { force: true });
  },
};

// ─── Supabase Storage (production) ───────────────────────────────────────────

function objectPath(ext: string): string {
  const month = new Date().toISOString().slice(0, 7); // e.g. 2026-09
  return `products/${month}/${randomUUID()}.${ext}`;
}

function publicUrlFor(objectKey: string): string {
  return supabaseAdmin().storage.from(MEDIA_BUCKET).getPublicUrl(objectKey).data.publicUrl;
}

/** The object key inside our bucket, or null if the URL points anywhere else. */
function objectKeyFrom(url: string): string | null {
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}

const supabaseStorageAdapter: StorageAdapter = {
  async save(file) {
    const accepted = validateUpload(file.type, file.size);
    const key = objectPath(accepted.ext);
    const { error } = await supabaseAdmin()
      .storage.from(MEDIA_BUCKET)
      .upload(key, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (error) throw new Error(`[supabase] upload failed: ${error.message}`);
    return { url: publicUrlFor(key), kind: accepted.kind, bytes: file.size, contentType: file.type };
  },

  async remove(url) {
    const key = objectKeyFrom(url);
    if (!key) return; // Not in our bucket (pasted URL, seed image) — leave it.
    const { error } = await supabaseAdmin().storage.from(MEDIA_BUCKET).remove([key]);
    if (error) console.warn(`[supabase] could not delete ${key}: ${error.message}`);
  },

  async createDirectUpload(contentType, size) {
    const accepted = validateUpload(contentType, size);
    const key = objectPath(accepted.ext);
    const { data, error } = await supabaseAdmin().storage.from(MEDIA_BUCKET).createSignedUploadUrl(key);
    if (error || !data) throw new Error(`[supabase] could not sign upload: ${error?.message ?? "no data"}`);
    return { bucket: MEDIA_BUCKET, path: data.path, token: data.token, publicUrl: publicUrlFor(key), kind: accepted.kind };
  },
};

export const storage: StorageAdapter = isSupabaseConfigured() ? supabaseStorageAdapter : localStorageAdapter;
