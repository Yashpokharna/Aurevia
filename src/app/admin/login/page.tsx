import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminConfigured, isSignedIn } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Store admin",
  robots: { index: false },
};

export default async function LoginPage() {
  if (await isSignedIn()) redirect("/admin");
  const configured = isAdminConfigured();

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-xl tracking-[0.22em] text-ink">
          {brand.wordmark}
        </Link>
        <h1 className="mt-8 font-display text-3xl text-ink">Store admin</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Manage the catalogue, pricing and media.
        </p>

        {configured ? (
          <LoginForm />
        ) : (
          <div className="mt-8 rounded-lg border border-line bg-brass-wash px-5 py-5 text-sm leading-relaxed text-ink-soft">
            <p className="font-medium text-ink">Admin is locked</p>
            <p className="mt-2">
              No password is set, so the admin area stays closed. Add this to{" "}
              <code className="rounded-sm bg-canvas px-1.5 py-0.5 text-xs">.env.local</code> and
              restart the dev server:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-md bg-ink px-4 py-3 text-xs text-canvas">
              ADMIN_PASSWORD=choose-something-long
            </pre>
          </div>
        )}

        <p className="mt-8 text-xs text-ink-muted">
          <Link href="/" className="underline underline-offset-2">
            Back to the store
          </Link>
        </p>
      </div>
    </div>
  );
}
