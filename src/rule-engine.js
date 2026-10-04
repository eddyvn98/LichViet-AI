import { readFileSync } from "node:fs";
import { evidenceForRule } from "./evidence.js";

const RULES = JSON.parse(
  readFileSync(new URL("../data/rules.json", import.meta.url), "utf8")
);
const DUTY_RULES = new Map(
  RULES.filter(x => x.kind === "duty").map(x => [x.raw, x])
);

function enrich(rule) {
  return rule ? { ...rule, evidence:evidenceForRule(rule) } : null;
}

export function allRules() {
  return RULES.map(enrich);
}

export function getDutyRule(raw) {
  return enrich(DUTY_RULES.get(raw) || null);
}

export function evaluateDuty(raw, activity = null) {
  const rule = getDutyRule(raw);
  if (!rule) return { score:0, ruleIds:[], reasons:[], evidence:[] };

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

  return {
    score,
    ruleIds:[rule.id],
    reasons,
    evidence:[rule.evidence]
  };
}

export function relationRule(kind, a, b) {
  const rule = RULES.find(x =>
    x.kind === kind &&
    ((x.a === a && x.b === b) || (x.a === b && x.b === a))
  );
  return enrich(rule || null);
}

export function ruleSummary(ids = []) {
  const wanted = new Set(ids);
  return RULES.filter(x => wanted.has(x.id)).map(x => {
    const evidence = evidenceForRule(x);
    return {
      id:x.id,
      kind:x.kind,
      source:x.source,
      locator:x.locator,
      verification:x.verification,
      evidence
    };
  });
}
