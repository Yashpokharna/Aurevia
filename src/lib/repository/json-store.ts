import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");

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

  const filePath = path.join(DATA_DIR, file);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;

    const initial = seed();
    try {
      await writeCollection(file, initial);
    } catch (writeError) {
      if (!(writeError instanceof ReadOnlyStorageError)) throw writeError;
      console.warn(
        `[store] ${file}: filesystem is read-only — serving seed data from memory. Edits will not persist; connect a database for production.`
      );
      memory.set(file, initial);
    }
    return initial;
  }
}

export async function writeCollection<T>(file: string, items: T[]): Promise<void> {
  const filePath = path.join(DATA_DIR, file);
  // Write to a temp file then rename, so a crash mid-write can't truncate the
  // real one.
  const tempPath = `${filePath}.${process.pid}.tmp`;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
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
    const { items, result } = await mutator(current);
    await writeCollection(file, items);
    return result;
  });
}
