import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "av_admin";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

function adminPassword(): string | undefined {
  return process.env.ADMIN_PASSWORD;
}

function sessionSecret(): string {
  // Falls back to the password so a single env var is enough to get going,
  // but set ADMIN_SESSION_SECRET in production so rotating one doesn't
  // invalidate the other.
  return process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? "";
}

/** Admin is locked until you set a password — never open by default. */
export function isAdminConfigured(): boolean {
  return Boolean(adminPassword());
}

function safeCompare(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function sign(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("hex");
}

export function checkPassword(candidate: string): boolean {
  const expected = adminPassword();
  if (!expected) return false;
  return safeCompare(candidate, expected);
}

export async function startSession(): Promise<void> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = String(expiresAt);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function endSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}

export async function isSignedIn(): Promise<boolean> {
  if (!isAdminConfigured()) return false;
  const raw = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!raw) return false;

  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return false;
  if (!safeCompare(sign(payload), signature)) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

/**
 * Call this at the top of every admin Server Action. Server Actions are
 * reachable by direct POST, so guarding the layout alone is not enough.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isSignedIn())) {
    throw new Error("Not authorised.");
  }
}
