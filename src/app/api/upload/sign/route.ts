import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { storage, UploadError } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Step one of an upload. When the storage backend supports it, returns a
 * short-lived signed URL so the browser can send the file straight to storage
 * — required for video on Netlify, which rejects function bodies over ~6 MB.
 * Otherwise tells the browser to POST the file to /api/upload as before.
 *
 * Type and size are validated here, before anything is signed; the bucket
 * enforces the same limits again on its side.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Not authorised." }, { status: 401 });
  }

  if (!storage.createDirectUpload) {
    return Response.json({ mode: "server" });
  }

  let body: { contentType?: string; size?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  try {
    const upload = await storage.createDirectUpload(String(body.contentType ?? ""), Number(body.size ?? 0));
    return Response.json({ mode: "direct", ...upload });
  } catch (error) {
    if (error instanceof UploadError) {
      return Response.json({ error: error.message }, { status: 415 });
    }
    console.error("[upload/sign] failed", error);
    return Response.json({ error: "Could not prepare the upload. Please try again." }, { status: 500 });
  }
}
