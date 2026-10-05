import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function readJsonFile(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return structuredClone(fallback);
  }
}

export async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive:true });
  const temp = path + ".tmp";
  await writeFile(temp, JSON.stringify(value, null, 2), { mode:0o600 });
  await rename(temp, path);
}

export async function updateJsonAtomic(path, fallback, updater) {
  const current = await readJsonFile(path, fallback);
  const next = await updater(current);
  await writeJsonAtomic(path, next);
  return next;
}
