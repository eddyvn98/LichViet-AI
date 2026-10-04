import { buildDayInfo, publicDay } from "./traditional.js";
import { evaluateDuty, ruleSummary } from "./rule-engine.js";
import { scoreActivity } from "./scoring.js";
import { composeActivityDecision } from "./recommendation-engine.js";
import { reproducibilityTrace } from "./trace.js";
import { getBaZi } from "./bazi.js";
import { personalizeFamily } from "./family-selection.js";
import { evaluateSelectionConstraints, normalizeSelectionConstraints } from "./selection-constraints.js";

export const ACTIVITIES = {
  contract:{ label:"Ký hợp đồng / giao dịch", positive:["交易","立券","纳财","开市"] },
  wedding:{ label:"Cưới hỏi / đính hôn", positive:["嫁娶","订婚","纳采","订盟"] },
  move:{ label:"Chuyển nhà / nhập trạch", positive:["入宅","移徙","安床"] },
  opening:{ label:"Khai trương", positive:["开市","交易","挂匾","纳财"] },
  travel:{ label:"Xuất hành", positive:["出行","赴任"] },
  build:{ label:"Sửa nhà / động thổ", positive:["动土","修造","起基","上梁"] },
  medical:{ label:"Khám chữa bệnh", positive:["求医","治病"] },
  meeting:{ label:"Gặp gỡ / trao đổi", positive:["会亲友","会友","见贵"] }
};

function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00+07:00`);
  d.setUTCDate(d.getUTCDate() + n);
  return new Intl.DateTimeFormat("en-CA",{ timeZone:"Asia/Ho_Chi_Minh" }).format(d);
}

function activityScore(day, activity, personal = day.personal) {
  const cfg = ACTIVITIES[activity];
  const dutyRaws = Array.isArray(day._dutyRaws) && day._dutyRaws.length
    ? day._dutyRaws
    : [day._dutyRaw];
  const dutyEvaluations = dutyRaws.map(raw => evaluateDuty(raw, activity));
  const dutyEval = {
    activityDelta:Math.min(...dutyEvaluations.map(x => x.activityDelta)),
    reasons:[...new Set(dutyEvaluations.flatMap(x => x.reasons))],
    ruleIds:[...new Set(dutyEvaluations.flatMap(x => x.ruleIds))]
  };
  const decision = composeActivityDecision({
    activity,
    dutyRaws,
    eclipticGoods:day._eclipticGoods || [],
    personal
  });
  const reasons = [
    ...decision.vetoes.map(x => x.detail),
    ...decision.cautions.map(x => x.detail),
    ...decision.supports.map(x => x.detail),
    ...dutyEval.reasons
  ];
  const ruleIds = [...dutyEval.ruleIds];

  if (dutyRaws.length > 1) {
    reasons.unshift(
      "Ngày giao tiết có hai Trực; recommendation engine lấy trạng thái bảo thủ hơn."
    );
  }

  const advisoryAllowed = day._implementationAdviceUsable === true;
  const recommendedHit = advisoryAllowed
    ? cfg.positive.find(x => day._rawRecommended.includes(x))
    : null;
  const avoidHit = advisoryAllowed
    ? cfg.positive.find(x => day._rawAvoid.includes(x))
    : null;
  const ranking = scoreActivity({
    baseScore:day._ranking,
    activityDelta:dutyEval.activityDelta
  });

  if (recommendedHit) {
    reasons.unshift("Implementation nghi/kỵ xếp việc này vào nhóm nên làm; chỉ hiển thị tham khảo, không đổi decision.");
  }
  if (avoidHit) {
    reasons.unshift("Implementation nghi/kỵ xếp việc này vào nhóm nên tránh; chỉ hiển thị tham khảo, không đổi decision.");
  }
  if (!advisoryAllowed) {
    reasons.push("Nghi/kỵ chi tiết từ implementation bị loại khỏi decision/ranking vì lịch UTC+7 không khớp reference ngày này.");
  }

  return {
    score:ranking.score,
    ranking,
    decision,
    reasons:[...new Set(reasons)],
    ruleIds,
    advisoryAllowed
  };
}

export function evaluatePlannerDay({
  date,
  activity = "contract",
  profile = null,
  profiles = [],
  constraints = {}
} = {}) {
  if (!ACTIVITIES[activity]) throw new Error("Loại việc không hợp lệ");

  const familyProfiles = Array.isArray(profiles)
    ? profiles.filter(Boolean).slice(0,8)
    : [];
  const familyMode = familyProfiles.length > 0;
  const day = buildDayInfo(date, familyMode ? null : profile);
  const family = familyMode
    ? personalizeFamily(familyProfiles, getBaZi(date, "12:00"))
    : null;
  const personal = family || day.personal;
  const constraintEvaluation = evaluateSelectionConstraints(
    day,
    date,
    constraints
  );

  const {
    score, ranking, decision, reasons, ruleIds, advisoryAllowed
  } = activityScore(day, activity, personal);
  const familyCautions = family?.signals?.filter(x => x.level === "caution").length || 0;
  const familySupports = family?.signals?.filter(x => x.level === "good").length || 0;

  const recommendationTrace = reproducibilityTrace({
    type:"activity-recommendation",
    date,
    activity,
    decision:decision.code,
    stateCodes:decision.states.map(x => x.code),
    dutyRaws:decision.states.map(x => x.raw),
    evidenceRefs:decision.evidenceRefs,
    ruleIds,
    constraints:constraintEvaluation.constraints,
    family:{
      memberCount:family?.memberCount || (profile ? 1 : 0),
      cautionCount:familyCautions,
      supportCount:familySupports,
      unresolvedCount:family?.unresolvedMembers?.length || 0
    },
    tieBreakScore:score
  });

  return {
    ...publicDay(day),
    eligible:constraintEvaluation.accepted,
    constraintEvaluation,
    family,
    match:constraintEvaluation.accepted
      ? decision.label
      : "Bị loại bởi ràng buộc",
    reasons:constraintEvaluation.accepted
      ? reasons
      : [
          ...constraintEvaluation.failures.map(x => x.detail),
          ...reasons
        ],
    recommendationDecision:{ ...decision, trace:recommendationTrace },
    activityRanking:{
      ...ranking,
      role:"tie-break-only"
    },
    advisoryImplementationUsed:false,
    advisoryImplementationVisible:advisoryAllowed,
    rankingProvenance:ruleSummary(ruleIds),
    _decisionRank:decision.rank,
    _score:score
  };
}

export function rankDays({
  from,
  days = 14,
  activity = "contract",
  profile = null,
  profiles = [],
  constraints = {}
}) {
  if (!ACTIVITIES[activity]) throw new Error("Loại việc không hợp lệ");
  const count = Math.max(1, Math.min(Number(days) || 14, 60));
  const ranked = [];

  for (let i = 0; i < count; i += 1) {
    const date = addDays(from, i);
    const result = evaluatePlannerDay({
      date,
      activity,
      profile,
      profiles,
      constraints
    });
    if (result.eligible) ranked.push(result);
  }

  return ranked
    .sort((a,b) =>
      b._decisionRank - a._decisionRank ||
      b._score - a._score ||
      a.date.localeCompare(b.date)
    )
    .slice(0,5)
    .map(({ _decisionRank, _score, ...x }) => x);
}

export function compareDays({
  dates = [],
  activity = "contract",
  profile = null,
  profiles = [],
  constraints = {}
} = {}) {
  if (!ACTIVITIES[activity]) throw new Error("Loại việc không hợp lệ");
  const normalizedDates = [...new Set(
    (Array.isArray(dates) ? dates : [])
      .map(String)
      .filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x))
  )].slice(0,5);
  if (normalizedDates.length < 2) {
    throw new Error("Cần ít nhất 2 ngày hợp lệ để so sánh");
  }

  const candidates = normalizedDates.map(date =>
    evaluatePlannerDay({
      date,
      activity,
      profile,
      profiles,
      constraints
    })
  );

  const sortedEligible = candidates
    .filter(x => x.eligible)
    .sort((a,b) =>
      b._decisionRank - a._decisionRank ||
      b._score - a._score ||
      a.date.localeCompare(b.date)
    );
  const winner = sortedEligible[0] || null;

  return {
    activity:{
      id:activity,
      label:ACTIVITIES[activity].label
    },
    constraints:normalizeSelectionConstraints(constraints),
    familyMemberCount:Array.isArray(profiles) && profiles.length
      ? Math.min(profiles.length,8)
      : profile ? 1 : 0,
    winner: winner ? {
      date:winner.date,
      match:winner.match,
      decision:winner.recommendationDecision.code,
      traceHash:winner.recommendationDecision.trace.hash
    } : null,
    candidates:candidates.map(({ _decisionRank, _score, ...item }) => ({
      ...item,
      comparison:{
        decisionRank:_decisionRank,
        tieBreakScore:_score,
        supportCount:item.recommendationDecision.supports.length,
        cautionCount:item.recommendationDecision.cautions.length,
        vetoCount:item.recommendationDecision.vetoes.length,
        familyCautionCount:item.family?.signals?.filter(x => x.level === "caution").length || 0
      }
    }))
  };
}

export function rangeDays({ from, days = 7, profile = null }) {
  const count = Math.max(1, Math.min(Number(days) || 7, 31));
  return Array.from({ length:count }, (_,i) =>
    publicDay(buildDayInfo(addDays(from,i), profile))
  );
}
