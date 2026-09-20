import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { storage, UploadError } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Media upload endpoint for the admin product form. A Route Handler rather than
 * a Server Action because Server Actions cap request bodies at 1MB by default,
 * which no video will fit under.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Not authorised." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Could not read the upload." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file was sent." }, { status: 400 });
  }

  try {
    const stored = await storage.save(file);
    return Response.json(stored);
  } catch (error) {
    if (error instanceof UploadError) {
      return Response.json({ error: error.message }, { status: 415 });
    }
    console.error("[upload] failed", error);
    return Response.json({ error: "The upload failed. Please try again." }, { status: 500 });
  }
}
