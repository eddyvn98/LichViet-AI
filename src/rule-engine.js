import { readFileSync } from "node:fs";
import { evidenceForRule } from "./evidence.js";

const RULES = JSON.parse(
  readFileSync(new URL("../data/rules.json", import.meta.url), "utf8")
);
const DUTY_CLASSIFICATION = JSON.parse(
  readFileSync(new URL("../data/duty-classification.json", import.meta.url), "utf8")
);
const ACTIVITY_POLICIES = JSON.parse(
  readFileSync(new URL("../data/activity-policies.json", import.meta.url), "utf8")
);
const DUTY_RULES = new Map(
  RULES.filter(x => x.kind === "duty").map(x => [x.raw, x])
);
const DUTY_CLASS_MAP = new Map(
  DUTY_CLASSIFICATION.map(x => [x.raw, x])
);
const ACTIVITY_POLICY_MAP = new Map(
  ACTIVITY_POLICIES.map(x => [x.activity, x])
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

export function getDutyClassification(raw) {
  const item = DUTY_CLASS_MAP.get(raw);
  return item ? structuredClone(item) : null;
}

export function getActivityPolicy(activity) {
  const item = ACTIVITY_POLICY_MAP.get(activity);
  return item ? structuredClone(item) : null;
}

export function allActivityPolicies() {
  return ACTIVITY_POLICIES.map(item => structuredClone(item));
}

export function evaluateDuty(raw, activity = null) {
  const rule = getDutyRule(raw);
  const classification = getDutyClassification(raw);
  if (!rule || !classification) {
    return {
      baseScore:0, activityDelta:0, score:0,
      ruleIds:[], reasons:[], evidence:[],
      classification:null, activityPolicy:null
    };
  }

  const baseScore = Number(rule.base) || 0;
  const activityPolicy = activity ? getActivityPolicy(activity) : null;
  let activityDelta = 0;
  const reasons = [];

  if (activityPolicy?.preferredDuties?.includes(raw)) {
    activityDelta += 7;
    reasons.push(
      `Trực ${rule.vi} nằm trong nhóm ưu tiên của PRODUCT_POLICY cho loại việc này; đây không phải nghi/kỵ nguyên điển.`
    );
  }
  if (activityPolicy?.avoidDuties?.includes(raw)) {
    activityDelta -= 10;
    reasons.push(
      `Trực ${rule.vi} nằm trong nhóm tránh của PRODUCT_POLICY cho loại việc này; đây không phải thang điểm cổ điển.`
    );
  }
  if (activityPolicy?.cautionDuties?.includes(raw)) {
    reasons.push(
      `Trực ${rule.vi} được PRODUCT_POLICY đánh dấu cần thận trọng cho loại việc này.`
    );
  }

  return {
    baseScore,
    activityDelta,
    score:baseScore + activityDelta,
    ruleIds:[rule.id],
    reasons,
    evidence:[rule.evidence],
    scoringPolicy:rule.scorePolicy || null,
    classification,
    activityPolicy
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
