import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const PATH = process.env.PUSH_STORE_PATH || "./data/runtime/push-subscriptions.json";

function idFor(endpoint) {
  return createHash("sha256").update(endpoint).digest("hex").slice(0, 24);
}

async function readAll() {
  try { return JSON.parse(await readFile(PATH, "utf8")); }
  catch { return []; }
}

async function writeAll(items) {
  await mkdir(dirname(PATH), { recursive:true });
  await writeFile(PATH, JSON.stringify(items, null, 2), { mode:0o600 });
}

export async function listSubscriptions() {
  return readAll();
}

export async function upsertSubscription({ subscription, profile = null, profiles = [], plans = [], reminderTime = "07:30" }) {
  if (!subscription?.endpoint) throw new Error("Push subscription không hợp lệ");
  const all = await readAll();
  const id = idFor(subscription.endpoint);
  const item = {
    id, subscription, profile,
    profiles:Array.isArray(profiles) ? profiles.slice(0,8) : [],
    plans:plans.slice(0,20), reminderTime,
    updatedAt:new Date().toISOString()
  };
  const index = all.findIndex(x => x.id === id);
  if (index >= 0) all[index] = item; else all.push(item);
  await writeAll(all);
  return { id };
}

export async function removeSubscription(endpoint) {
  const id = idFor(endpoint || "");
  const all = await readAll();
  await writeAll(all.filter(x => x.id !== id));
  return { removed:true };
}
