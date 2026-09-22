import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Resolved lazily, never at import time: on some serverless runtimes the
 * working directory is unusual enough that touching it at module load throws,
 * which fails every import of this file — and with it every storefront route.
 */
function dataDir(): string {
  return path.join(process.cwd(), "data");
}

function errorCode(error: unknown): string {
  return (error as NodeJS.ErrnoException | undefined)?.code ?? (error as Error)?.name ?? "unknown";
}

/**
 * Thrown when a write is attempted on a host whose filesystem is read-only
 * (Netlify, Vercel and most serverless platforms). Callers turn this into a
 * clear "connect a database" message instead of a generic 500.
 */
export class ReadOnlyStorageError extends Error {
  constructor() {
    super(
      "This host's filesystem is read-only, so changes can't be saved. Connect a database to edit products and record orders in production."
    );
    this.name = "ReadOnlyStorageError";
  }
}

export function isReadOnlyFsError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === "EROFS" || code === "EACCES" || code === "EPERM";
}

/**
 * When the disk can't be written, collections are served from memory instead.
 * The storefront keeps working (showing the seed catalogue) rather than every
 * page crashing on its first read — which is what used to happen on Netlify.
 */
const memory = new Map<string, unknown[]>();

/** "memory" once any collection has fallen back because the disk is read-only. */
export function storageMode(): "file" | "memory" {
  return memory.size > 0 ? "memory" : "file";
}

/**
 * Serialises writes per file. Node is single-threaded but `await` gives other
 * requests a chance to interleave between read and write, which is exactly how
 * a JSON store loses records. Every mutation goes through this chain.
 */
const locks = new Map<string, Promise<unknown>>();

function withLock<T>(file: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(file) ?? Promise.resolve();
  const next = previous.then(task, task);
  locks.set(
    file,
    next.catch(() => undefined)
  );
  return next;
}

export async function readCollection<T>(file: string, seed: () => T[]): Promise<T[]> {
  const cached = memory.get(file);
  if (cached) return cached as T[];

  let raw: string | null = null;
  try {
    raw = await fs.readFile(path.join(dataDir(), file), "utf8");
  } catch (error) {
    // Missing file is the normal first-run case. Anything else (odd working
    // directory, permissions, sandboxed runtime) is treated the same way:
    // the disk isn't usable, so fall through to the seed. Never crash a page
    // over it — log the real code so it's diagnosable from the host's logs.
    if (errorCode(error) !== "ENOENT") {
      console.warn(`[store] ${file}: cannot read from disk (${errorCode(error)}); falling back to seed data.`);
    }
  }

  if (raw !== null) {
    // A file that exists but is corrupt is a real problem — surface it.
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  }

  const initial = seed();
  try {
    await writeCollection(file, initial);
  } catch (error) {
    console.warn(
      `[store] ${file}: cannot write to disk (${error instanceof ReadOnlyStorageError ? "read-only" : errorCode(error)}) — serving seed data from memory. Edits will not persist; connect a database for production.`
    );
    memory.set(file, initial);
  }
  return initial;
}

export async function writeCollection<T>(file: string, items: T[]): Promise<void> {
  try {
    const dir = dataDir();
    const filePath = path.join(dir, file);
    // Write to a temp file then rename, so a crash mid-write can't truncate
    // the real one.
    const tempPath = `${filePath}.${process.pid}.tmp`;
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(tempPath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
    await fs.rename(tempPath, filePath);
  } catch (error) {
    if (isReadOnlyFsError(error)) throw new ReadOnlyStorageError();
    throw error;
  }
}

/** Read, transform and write a collection atomically with respect to other callers. */
export async function mutateCollection<T, R>(
  file: string,
  seed: () => T[],
  mutator: (items: T[]) => { items: T[]; result: R } | Promise<{ items: T[]; result: R }>
): Promise<R> {
  return withLock(file, async () => {
    const current = await readCollection<T>(file, seed);
    // Already running from memory: the disk is known to be unusable, so say so
    // clearly instead of failing on whatever error the write would produce.
    if (memory.has(file)) throw new ReadOnlyStorageError();
    const { items, result } = await mutator(current);
    await writeCollection(file, items);
    return result;
  });
}
