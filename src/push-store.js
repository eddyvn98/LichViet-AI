import { createHash } from "node:crypto";
import { readJsonFile, updateJsonAtomic } from "./atomic-json-store.js";

const PATH = process.env.PUSH_STORE_PATH || "./data/runtime/push-subscriptions.json";

function idFor(endpoint) {
  return createHash("sha256").update(endpoint).digest("hex").slice(0, 24);
}

async function readAll() {
  const parsed = await readJsonFile(PATH, []);
  return Array.isArray(parsed) ? parsed : [];
}

export async function listSubscriptions() {
  return readAll();
}

export async function upsertSubscription({ subscription, profile = null, profiles = [], plans = [], reminderTime = "07:30" }) {
  if (!subscription?.endpoint) throw new Error("Push subscription không hợp lệ");
  const id = idFor(subscription.endpoint);
  const item = {
    id, subscription, profile,
    profiles:Array.isArray(profiles) ? profiles.slice(0,8) : [],
    plans:plans.slice(0,20), reminderTime,
    updatedAt:new Date().toISOString()
  };
  await updateJsonAtomic(PATH, [], current => {
    const all = Array.isArray(current) ? current : [];
    const index = all.findIndex(x => x.id === id);
    if (index >= 0) all[index] = item; else all.push(item);
    return all;
  });
  return { id };
}

export async function removeSubscription(endpoint) {
  const id = idFor(endpoint || "");
  await updateJsonAtomic(PATH, [], current =>
    (Array.isArray(current) ? current : []).filter(x => x.id !== id)
  );
  return { removed:true };
}
