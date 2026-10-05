import { readJsonFile, updateJsonAtomic } from "./atomic-json-store.js";
import { engineManifest } from "./version.js";

const PATH = process.env.SELECTION_FEEDBACK_PATH ||
  "./data/runtime/selection-feedback.json";
const MAX_ITEMS = 500;

async function readAll() {
  const parsed = await readJsonFile(PATH, []);
  return Array.isArray(parsed) ? parsed : [];
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
    rankingPolicy:manifest.rankingPolicy,
    familyPolicy:manifest.familyPolicy,
    constraintPolicy:manifest.constraintPolicy,
    comparisonPolicy:manifest.comparisonPolicy
  };

  await updateJsonAtomic(PATH, [], items => {
    const safe = Array.isArray(items) ? items : [];
    return [item, ...safe].slice(0,MAX_ITEMS);
  });
  return item;
}

export async function listSelectionFeedback(limit = 50) {
  const safe = Math.max(1,Math.min(Number(limit) || 50,200));
  return (await readAll()).slice(0,safe);
}
