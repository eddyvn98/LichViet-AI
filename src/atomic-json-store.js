import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const queues = new Map();

function clone(value) {
  return structuredClone(value);
}

export async function readJsonFile(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return clone(fallback);
  }
}

async function writeUnlocked(path, value) {
  await mkdir(dirname(path), { recursive:true });
  const temp = path + "." + process.pid + "." + Date.now() + ".tmp";
  try {
    await writeFile(temp, JSON.stringify(value, null, 2), { mode:0o600 });
    await rename(temp, path);
  } finally {
    await rm(temp, { force:true }).catch(() => {});
  }
}

async function serial(path, task) {
  const previous = queues.get(path) || Promise.resolve();
  const current = previous.catch(() => {}).then(task);
  queues.set(path, current);
  try {
    return await current;
  } finally {
    if (queues.get(path) === current) queues.delete(path);
  }
}

export async function writeJsonAtomic(path, value) {
  return serial(path, async () => {
    await writeUnlocked(path, value);
    return value;
  });
}

export async function updateJsonAtomic(path, fallback, updater) {
  return serial(path, async () => {
    const current = await readJsonFile(path, fallback);
    const next = await updater(current);
    await writeUnlocked(path, next);
    return next;
  });
}
