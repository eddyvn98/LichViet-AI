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
  if (!rule) {
    return {
      baseScore:0, activityDelta:0, score:0,
      ruleIds:[], reasons:[], evidence:[]
    };
  }

  const baseScore = Number(rule.base) || 0;
  let activityDelta = 0;
  const reasons = [];

  if (activity && rule.good?.includes(activity)) {
    activityDelta += 7;
    reasons.push(`Trực ${rule.vi} thuộc nhóm ưu tiên cho loại việc này theo normalization của app.`);
  }
  if (activity && rule.avoid?.includes(activity)) {
    activityDelta -= 10;
    reasons.push(`Trực ${rule.vi} không được ưu tiên cho loại việc này theo normalization của app.`);
  }

  return {
    baseScore,
    activityDelta,
    score:baseScore + activityDelta,
    ruleIds:[rule.id],
    reasons,
    evidence:[rule.evidence],
    scoringPolicy:rule.scorePolicy || null
  };
}

export function relationRule(kind, a, b) {
  const rule = RULES.find(x =>
    x.kind === kind &&
    ((x.a === a && x.b === b) || (x.a === b && x.b === a))
  );
  return enrich(rule || null);
}

export function trineRuleFor(branches = []) {
  const wanted = new Set(branches.filter(Boolean));
  if (wanted.size < 3) return null;
  const rule = RULES.find(x =>
    x.kind === "trine" &&
    Array.isArray(x.members) &&
    x.members.every(member => wanted.has(member))
  );
  return enrich(rule || null);
}

export function stemCombinationRule(a, b) {
  const rule = RULES.find(x =>
    x.kind === "stem-combination" &&
    ((x.aStem === a && x.bStem === b) || (x.aStem === b && x.bStem === a))
  );
  return enrich(rule || null);
}

export function rulesByKind(kind) {
  return RULES.filter(x => x.kind === kind).map(enrich);
}

export function ruleSummary(ids = []) {
  const wanted = new Set(ids);
  return RULES.filter(x => wanted.has(x.id)).map(x => {
    const evidence = evidenceForRule(x);
    return {
      id:x.id,
      kind:x.kind,
      source:x.source,
      locator:evidence.locator || x.locator,
      verification:x.verification,
      evidence
    };
  });
}
