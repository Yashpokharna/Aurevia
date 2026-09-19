import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");

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

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readCollection<T>(file: string, seed: () => T[]): Promise<T[]> {
  const filePath = path.join(DATA_DIR, file);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const initial = seed();
    await writeCollection(file, initial);
    return initial;
  }
}

export async function writeCollection<T>(file: string, items: T[]): Promise<void> {
  await ensureDir();
  const filePath = path.join(DATA_DIR, file);
  // Write to a temp file then rename, so a crash mid-write can't truncate the
  // real one.
  const tempPath = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tempPath, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  await fs.rename(tempPath, filePath);
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
