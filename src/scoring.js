export const SCORE_POLICY = {
  id:"ranking-heuristic-v1",
  evidenceLevel:"EXPERIMENTAL",
  note:"Điểm số là chính sách xếp hạng của ứng dụng, không phải thang điểm cổ điển.",
  baseline:50,
  ecliptic:{ good:4, bad:-3 },
  activityDirect:{ recommended:20, avoid:-32 }
};

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function scoreDayBase({ dutyBase = 0, eclipticGood = false, personalDelta = 0 } = {}) {
  const components = [
    { id:"BASELINE", value:SCORE_POLICY.baseline, origin:"product-policy" },
    { id:"DUTY_BASE", value:Number(dutyBase) || 0, origin:"traditional-rule-normalization" },
    {
      id:"ECLIPTIC_IMPLEMENTATION",
      value:eclipticGood ? SCORE_POLICY.ecliptic.good : SCORE_POLICY.ecliptic.bad,
      origin:"implementation-crosscheck"
    }
  ];
  if (personalDelta) {
    components.push({
      id:"PERSONAL_RELATION",
      value:Number(personalDelta) || 0,
      origin:"personalization-heuristic"
    });
  }
  return {
    score:clamp(components.reduce((sum,x) => sum + x.value, 0)),
    components,
    policy:SCORE_POLICY
  };
}

export function scoreActivity({
  baseScore,
  activityDelta = 0,
  recommendedHit = false,
  avoidHit = false
} = {}) {
  const components = [
    { id:"DAY_BASE", value:Number(baseScore) || 0, origin:"day-score" }
  ];
  if (activityDelta) {
    components.push({
      id:"DUTY_ACTIVITY",
      value:Number(activityDelta) || 0,
      origin:"traditional-rule-normalization"
    });
  }
  if (recommendedHit) {
    components.push({
      id:"DIRECT_RECOMMENDATION",
      value:SCORE_POLICY.activityDirect.recommended,
      origin:"implementation-crosscheck"
    });
  }
  if (avoidHit) {
    components.push({
      id:"DIRECT_AVOID",
      value:SCORE_POLICY.activityDirect.avoid,
      origin:"implementation-crosscheck"
    });
  }
  return {
    score:clamp(components.reduce((sum,x) => sum + x.value, 0)),
    components,
    policy:SCORE_POLICY
  };
}

export function classifyScore(score) {
  if (score >= 72) return { code:"good", label:"Khá thuận" };
  if (score >= 52) return { code:"normal", label:"Bình thường" };
  return { code:"careful", label:"Nên thận trọng" };
}
