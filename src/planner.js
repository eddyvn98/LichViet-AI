import { buildDayInfo, publicDay } from "./traditional.js";
import { evaluateDuty, ruleSummary } from "./rule-engine.js";
import { scoreActivity } from "./scoring.js";
import { composeActivityDecision } from "./recommendation-engine.js";

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

function activityScore(day, activity) {
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
    personal:day.personal
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

export function rankDays({ from, days = 14, activity = "contract", profile = null }) {
  if (!ACTIVITIES[activity]) throw new Error("Loại việc không hợp lệ");
  const count = Math.max(1, Math.min(Number(days) || 14, 60));
  const ranked = [];

  for (let i = 0; i < count; i += 1) {
    const date = addDays(from, i);
    const day = buildDayInfo(date, profile);
    const {
      score, ranking, decision, reasons, ruleIds, advisoryAllowed
    } = activityScore(day, activity);
    ranked.push({
      ...publicDay(day),
      match:decision.label,
      reasons,
      recommendationDecision:decision,
      activityRanking:{
        ...ranking,
        role:"tie-break-only"
      },
      advisoryImplementationUsed:false,
      advisoryImplementationVisible:advisoryAllowed,
      rankingProvenance:ruleSummary(ruleIds),
      _decisionRank:decision.rank,
      _score:score
    });
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

export function rangeDays({ from, days = 7, profile = null }) {
  const count = Math.max(1, Math.min(Number(days) || 7, 31));
  return Array.from({ length:count }, (_,i) =>
    publicDay(buildDayInfo(addDays(from,i), profile))
  );
}
