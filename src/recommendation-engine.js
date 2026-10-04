import {
  getActivityPolicy,
  getDutyClassification
} from "./rule-engine.js";

export const DECISION_POLICY = {
  id:"activity-composition-v2",
  evidenceLevel:"PRODUCT_POLICY",
  principleEvidenceRefs:[
    "XLKY-12-DUTY-CLASSIFICATION",
    "XLKY-SELECTION-MULTIFACTOR"
  ],
  note:"Nhãn ưu tiên/cân nhắc là composition của app. Fact phân nhóm Trực có nguồn riêng; mapping theo loại việc là PRODUCT_POLICY.",
  order:{ blocked:0, caution:1, neutral:2, preferred:3 }
};

const LABELS = {
  preferred:"Ưu tiên",
  neutral:"Có thể cân nhắc",
  caution:"Cân nhắc thận trọng",
  blocked:"Không ưu tiên"
};

function uniqSignals(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = item.id + "|" + item.detail;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stateDecision({ raw, activity, eclipticGood, personal }) {
  const classification = getDutyClassification(raw);
  const activityPolicy = getActivityPolicy(activity);
  if (!classification || !activityPolicy) {
    throw new Error("Thiếu classification/policy cho recommendation engine");
  }

  const supports = [];
  const cautions = [];
  const vetoes = [];

  if (classification.traditionalClass === "good") {
    supports.push({
      id:"TRADITIONAL-DUTY-GOOD",
      origin:"primary-evidence",
      evidenceRefs:[classification.evidenceRef],
      detail:`Trực ${classification.vi} thuộc nhóm cát tổng quát trong corpus đã xác minh.`
    });
  } else {
    cautions.push({
      id:"TRADITIONAL-DUTY-BAD",
      origin:"primary-evidence",
      evidenceRefs:[classification.evidenceRef],
      detail:`Trực ${classification.vi} thuộc nhóm hung tổng quát; không dùng một mình tín hiệu này để kết luận.`
    });
  }

  const preferred = activityPolicy.preferredDuties.includes(raw);
  const avoided = activityPolicy.avoidDuties.includes(raw);
  const policyCaution = activityPolicy.cautionDuties.includes(raw);

  if (preferred) {
    supports.push({
      id:activityPolicy.id + "-PREFERRED",
      origin:"product-policy",
      evidenceRefs:activityPolicy.evidenceRefs,
      detail:`PRODUCT_POLICY xếp Trực ${classification.vi} vào nhóm ưu tiên cho ${activityPolicy.label}.`
    });
  }

  if (avoided) {
    cautions.push({
      id:activityPolicy.id + "-AVOID",
      origin:"product-policy",
      evidenceRefs:activityPolicy.evidenceRefs,
      detail:`PRODUCT_POLICY xếp Trực ${classification.vi} vào nhóm nên tránh cho ${activityPolicy.label}.`
    });
    if (classification.traditionalClass === "bad") {
      vetoes.push({
        id:activityPolicy.id + "-ALIGNED-VETO",
        origin:"composition-policy",
        evidenceRefs:activityPolicy.evidenceRefs,
        detail:"Tín hiệu hung tổng quát và policy theo loại việc cùng hướng xấu; planner chặn ưu tiên ngày này."
      });
    }
  }

  if (policyCaution) {
    cautions.push({
      id:activityPolicy.id + "-CAUTION",
      origin:"product-policy",
      evidenceRefs:activityPolicy.evidenceRefs,
      detail:`PRODUCT_POLICY đánh dấu Trực ${classification.vi} cần thận trọng cho ${activityPolicy.label}.`
    });
  }

  if (eclipticGood === true) {
    supports.push({
      id:"ECLIPTIC-GOOD",
      origin:"traditional-rule",
      evidenceRefs:["XJ-HUANGHEI"],
      detail:"Trạng thái Hoàng đạo hỗ trợ nhưng không tự quyết định kết luận."
    });
  } else if (eclipticGood === false) {
    cautions.push({
      id:"ECLIPTIC-BAD",
      origin:"traditional-rule",
      evidenceRefs:["XJ-HUANGHEI"],
      detail:"Trạng thái Hắc đạo là tín hiệu thận trọng; không dùng riêng để kết luận."
    });
  }

  const personalCaution = personal?.signals?.find(x => x.level === "caution");
  const personalGood = personal?.signals?.find(x => x.level === "good");
  if (personalCaution) {
    cautions.push({
      id:"PERSONAL-CAUTION",
      origin:"personalization-heuristic",
      evidenceRefs:personal?.evidence?.flatMap(x => x.evidence?.evidenceRefs || []) || [],
      detail:personalCaution.detail
    });
  }
  if (personalGood) {
    supports.push({
      id:"PERSONAL-GOOD",
      origin:"personalization-heuristic",
      evidenceRefs:personal?.evidence?.flatMap(x => x.evidence?.evidenceRefs || []) || [],
      detail:personalGood.detail
    });
  }

  let code = "neutral";
  if (vetoes.length) code = "blocked";
  else if (cautions.length) code = "caution";
  else if (preferred &&
      classification.traditionalClass === "good" &&
      eclipticGood === true) code = "preferred";

  return {
    raw,
    code,
    label:LABELS[code],
    classification,
    supports:uniqSignals(supports),
    cautions:uniqSignals(cautions),
    vetoes:uniqSignals(vetoes)
  };
}

export function composeActivityDecision({
  activity,
  dutyRaws = [],
  eclipticGoods = [],
  personal = null
} = {}) {
  const policy = getActivityPolicy(activity);
  if (!policy) throw new Error("Loại việc không hợp lệ");

  const raws = [...new Set(dutyRaws.filter(Boolean))];
  if (!raws.length) throw new Error("Thiếu Trực để composition");

  const states = raws.map((raw, index) => stateDecision({
    raw,
    activity,
    eclipticGood:eclipticGoods[index] ?? eclipticGoods[0] ?? null,
    personal
  }));

  const worst = [...states].sort((a,b) =>
    DECISION_POLICY.order[a.code] - DECISION_POLICY.order[b.code]
  )[0];

  const transition = states.length > 1;
  const supports = uniqSignals(states.flatMap(x => x.supports));
  const cautions = uniqSignals(states.flatMap(x => x.cautions));
  const vetoes = uniqSignals(states.flatMap(x => x.vetoes));

  if (transition) {
    cautions.push({
      id:"JIE-TRANSITION-CONSERVATIVE",
      origin:"primary-evidence",
      evidenceRefs:["XLKY-DUTY-TRANSITION","XLKY-SELECTION-MULTIFACTOR"],
      detail:"Ngày giao tiết có nhiều trạng thái Trực; planner lấy trạng thái bảo thủ hơn."
    });
  }

  return {
    code:worst.code,
    label:LABELS[worst.code],
    rank:DECISION_POLICY.order[worst.code],
    activity,
    activityPolicy:policy,
    transition,
    states,
    supports:uniqSignals(supports),
    cautions:uniqSignals(cautions),
    vetoes:uniqSignals(vetoes),
    evidenceRefs:[...new Set([
      ...DECISION_POLICY.principleEvidenceRefs,
      ...policy.evidenceRefs,
      ...states.flatMap(x => [
        x.classification.evidenceRef,
        ...x.supports.flatMap(s => s.evidenceRefs || []),
        ...x.cautions.flatMap(s => s.evidenceRefs || []),
        ...x.vetoes.flatMap(s => s.evidenceRefs || [])
      ])
    ])],
    policy:DECISION_POLICY
  };
}

export function decisionLabel(code) {
  return LABELS[code] || LABELS.neutral;
}
