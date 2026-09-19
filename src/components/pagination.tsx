import Link from "next/link";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Path the links point at, e.g. "/products". */
  basePath: string;
  /** Other query params to carry across (filters, search). */
  params?: Record<string, string | undefined>;
}

/** [1, "…", 4, 5, 6, "…", 12] — always shows first, last and a window around current. */
function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);

  const result: (number | "gap")[] = [];
  let previous = 0;
  for (const current of sorted) {
    if (previous && current - previous > 1) result.push("gap");
    result.push(current);
    previous = current;
  }
  return result;
}

export function Pagination({ page, totalPages, basePath, params = {} }: PaginationProps) {
  if (totalPages <= 1) return null;

  const hrefFor = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const items = pageWindow(page, totalPages);
  const arrow =
    "inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-sm text-ink-soft transition-colors hover:border-line-strong hover:text-ink";

  return (
    <nav className="mt-14 flex items-center justify-between gap-4" aria-label="Pagination">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={arrow} rel="prev">
          <span aria-hidden="true">&larr;</span> Previous
        </Link>
      ) : (
        <span className={`${arrow} cursor-not-allowed opacity-40`} aria-disabled="true">
          <span aria-hidden="true">&larr;</span> Previous
        </span>
      )}

      <ol className="hidden items-center gap-1 sm:flex">
        {items.map((item, index) =>
          item === "gap" ? (
            <li key={`gap-${index}`} className="px-2 text-sm text-ink-muted" aria-hidden="true">
              &hellip;
            </li>
          ) : (
            <li key={item}>
              <Link
                href={hrefFor(item)}
                aria-label={`Page ${item}`}
                aria-current={item === page ? "page" : undefined}
                className={
                  item === page
                    ? "inline-flex h-9 min-w-9 items-center justify-center rounded-md bg-ink px-3 text-sm font-medium text-canvas"
                    : "inline-flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm text-ink-soft transition-colors hover:bg-canvas-deep hover:text-ink"
                }
              >
                {item}
              </Link>
            </li>
          )
        )}
      </ol>

      <p className="text-sm text-ink-muted sm:hidden">
        Page {page} of {totalPages}
      </p>

      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={arrow} rel="next">
          Next <span aria-hidden="true">&rarr;</span>
        </Link>
      ) : (
        <span className={`${arrow} cursor-not-allowed opacity-40`} aria-disabled="true">
          Next <span aria-hidden="true">&rarr;</span>
        </span>
      )}
    </nav>
  );
}
