import { readFileSync } from "node:fs";

const RULES = JSON.parse(readFileSync(new URL("../data/rules.json", import.meta.url), "utf8"));
const DUTY_RULES = new Map(RULES.filter(x => x.kind === "duty").map(x => [x.raw, x]));

export function allRules() {
  return RULES.map(x => ({ ...x }));
}

export function getDutyRule(raw) {
  return DUTY_RULES.get(raw) || null;
}

export function evaluateDuty(raw, activity = null) {
  const rule = getDutyRule(raw);
  if (!rule) return { score:0, ruleIds:[], reasons:[] };

  let score = rule.base || 0;
  const reasons = [];
  if (activity && rule.good?.includes(activity)) {
    score += 7;
    reasons.push(`Trực ${rule.vi} thuộc nhóm ưu tiên cho loại việc này.`);
  }
  if (activity && rule.avoid?.includes(activity)) {
    score -= 10;
    reasons.push(`Trực ${rule.vi} không được ưu tiên cho loại việc này.`);
  }

  return { score, ruleIds:[rule.id], reasons };
}

export function relationRule(kind, a, b) {
  return RULES.find(x =>
    x.kind === kind &&
    ((x.a === a && x.b === b) || (x.a === b && x.b === a))
  ) || null;
}

export function ruleSummary(ids = []) {
  const wanted = new Set(ids);
  return RULES.filter(x => wanted.has(x.id)).map(x => ({
    id:x.id, source:x.source, locator:x.locator, verification:x.verification
  }));
}
