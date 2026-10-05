import { access, mkdir, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname } from "node:path";
import { aiStatus } from "./ai-service.js";
import { pushStatus } from "./push.js";
import { telegramStatus } from "./telegram.js";
import { engineManifest } from "./version.js";

const stores = {
  notifications:() => process.env.NOTIFICATION_SETTINGS_PATH || "./data/runtime/notification-settings.json",
  feedback:() => process.env.SELECTION_FEEDBACK_PATH || "./data/runtime/selection-feedback.json",
  push:() => process.env.PUSH_STORE_PATH || "./data/runtime/push-subscriptions.json"
};

async function inspect(path) {
  await mkdir(dirname(path), { recursive:true });
  let writable = true;
  try { await access(dirname(path), constants.W_OK); } catch { writable = false; }

  let exists = true;
  let valid = true;
  try { JSON.parse(await readFile(path, "utf8")); }
  catch (error) {
    exists = error?.code !== "ENOENT";
    valid = !exists;
  }
  return { writable, exists, valid, healthy:writable && valid };
}

export async function opsStatus() {
  const runtime = {};
  for (const [name,getPath] of Object.entries(stores)) {
    runtime[name] = await inspect(getPath());
  }

  const manifest = engineManifest();
  const warnings = [];
  for (const [name,status] of Object.entries(runtime)) {
    if (!status.writable) warnings.push("Không ghi được runtime store: " + name);
    if (status.exists && !status.valid) warnings.push("Runtime JSON lỗi: " + name);
  }
  if (!process.env.CRON_SECRET) warnings.push("CRON_SECRET chưa cấu hình.");
  if (!telegramStatus().enabled) warnings.push("Telegram chưa cấu hình.");
  if (!pushStatus().enabled) warnings.push("Web Push chưa cấu hình.");

  return {
    ok:Object.values(runtime).every(x => x.healthy),
    version:manifest.version,
    engine:manifest.engine,
    runtimePolicy:manifest.runtimePolicy || null,
    uptimeSeconds:Math.round(process.uptime()),
    node:process.version,
    runtime,
    integrations:{
      ai:{ provider:aiStatus().provider, model:aiStatus().model, auth:aiStatus().auth },
      telegram:{ enabled:telegramStatus().enabled },
      push:{ enabled:pushStatus().enabled },
      cronProtected:Boolean(process.env.CRON_SECRET)
    },
    warnings
  };
}
