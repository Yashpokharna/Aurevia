import "server-only";
import { createWriteStream } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import type { MediaKind } from "../types";

export interface StoredFile {
  url: string;
  kind: MediaKind;
  bytes: number;
  contentType: string;
}

export interface StorageAdapter {
  save(file: File): Promise<StoredFile>;
  remove(url: string): Promise<void>;
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
export const MAX_VIDEO_BYTES = Number(process.env.MAX_VIDEO_BYTES ?? 100 * 1024 * 1024);

export const ACCEPT_ATTRIBUTE = Object.keys(ACCEPTED).join(",");

export class UploadError extends Error {}

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const PUBLIC_PREFIX = "/uploads/";

/**
 * Writes to `public/uploads`. Good enough to develop against with zero setup.
 *
 * For production, replace this object with a Cloudinary / S3 / Bunny adapter —
 * every caller goes through `storage.save()`, so nothing else changes. Serving
 * large video off your own app server is the main reason to make that switch.
 */
const localStorageAdapter: StorageAdapter = {
  async save(file) {
    const accepted = ACCEPTED[file.type];
    if (!accepted) {
      throw new UploadError(
        `"${file.type || "unknown"}" files aren't supported. Use JPEG, PNG, WebP, AVIF, MP4, WebM or MOV.`
      );
    }

    const limit = accepted.kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > limit) {
      throw new UploadError(
        `That ${accepted.kind} is ${formatBytes(file.size)}. The limit is ${formatBytes(limit)}.`
      );
    }
    if (file.size === 0) {
      throw new UploadError("That file is empty.");
    }

    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    // Random name: the original filename is attacker-controlled and never
    // touches the filesystem.
    const filename = `${randomUUID()}.${accepted.ext}`;
    const destination = path.join(UPLOAD_DIR, filename);

    await pipeline(Readable.fromWeb(file.stream() as never), createWriteStream(destination));

    return {
      url: `${PUBLIC_PREFIX}${filename}`,
      kind: accepted.kind,
      bytes: file.size,
      contentType: file.type,
    };
  },

  async remove(url) {
    if (!url.startsWith(PUBLIC_PREFIX)) return; // Remote URL — nothing of ours to delete.
    const filename = path.basename(url);
    // Re-join from the basename only, so a crafted URL can't escape the folder.
    await fs.rm(path.join(UPLOAD_DIR, filename), { force: true });
  },
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const storage: StorageAdapter = localStorageAdapter;
