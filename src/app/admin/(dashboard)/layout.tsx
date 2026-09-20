import Link from "next/link";
import { redirect } from "next/navigation";
import { brand } from "@/lib/brand";
import { isSignedIn } from "@/lib/auth";
import { signOutAction } from "../actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isSignedIn())) redirect("/admin/login");

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-line bg-canvas-deep/50">
        <div className="shell flex h-16 items-center justify-between gap-6">
          <div className="flex items-baseline gap-4">
            <Link href="/admin" className="font-display text-base tracking-[0.2em] text-ink">
              {brand.wordmark}
            </Link>
            <span className="eyebrow text-ink-muted">Store admin</span>
          </div>

          <div className="flex items-center gap-5 text-sm">
            <Link href="/" className="text-ink-soft transition-colors hover:text-ink">
              View store
            </Link>
            <form action={signOutAction}>
              <button type="submit" className="text-ink-soft transition-colors hover:text-ink">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24">{children}</main>
    </div>
  );
}
