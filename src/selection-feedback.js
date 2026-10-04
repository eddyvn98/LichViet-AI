import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { engineManifest } from "./version.js";

const PATH = process.env.SELECTION_FEEDBACK_PATH ||
  "./data/runtime/selection-feedback.json";
const MAX_ITEMS = 500;

async function readAll() {
  try {
    const parsed = JSON.parse(await readFile(PATH, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cleanText(value, max) {
  return String(value || "").trim().slice(0,max);
}

export async function saveSelectionFeedback(input = {}) {
  const feedback = ["agree","review"].includes(input.feedback)
    ? input.feedback
    : null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(input.date || ""))
    ? String(input.date)
    : null;
  const traceHash = /^[0-9a-f]{64}$/.test(String(input.traceHash || ""))
    ? String(input.traceHash)
    : null;

  if (!feedback || !date || !traceHash) {
    throw new Error("Feedback cần date, traceHash và feedback=agree/review");
  }

  const manifest = engineManifest();
  const item = {
    id:crypto.randomUUID(),
    createdAt:new Date().toISOString(),
    feedback,
    date,
    activity:cleanText(input.activity,40) || null,
    decision:cleanText(input.decision,40) || null,
    note:cleanText(input.note,500) || null,
    traceHash,
    engine:manifest.engine,
    decisionPolicy:manifest.decisionPolicy,
    rankingPolicy:manifest.rankingPolicy
  };

  const items = await readAll();
  items.unshift(item);
  await mkdir(dirname(PATH), { recursive:true });
  await writeFile(PATH, JSON.stringify(items.slice(0,MAX_ITEMS),null,2), {
    mode:0o600
  });
  return item;
}

export async function listSelectionFeedback(limit = 50) {
  const safe = Math.max(1,Math.min(Number(limit) || 50,200));
  return (await readAll()).slice(0,safe);
}
