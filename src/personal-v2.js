import { branchRelationship } from "./personal.js";
import { relationRule, ruleSummary, stemCombinationRule, trineRuleFor } from "./rule-engine.js";
import { tenGodForStem } from "./bazi-profile.js";

function applyBranchSignal({ relation, role, signals, ruleIds }) {
  if (!relation || relation.type === "neutral") return 0;
  const kind = relation.type;
  const rule = relationRule(kind, role.branch, role.current);
  if (rule) ruleIds.push(rule.id);

  if (kind === "clash") {
    signals.push({
      level:"caution",
      label:`Lục xung với chi ${role.label}`,
      detail:relation.detail
    });
    return role.weight === "day" ? -10 : -8;
  }
  if (kind === "harmony") {
    signals.push({
      level:"good",
      label:`Lục hợp với chi ${role.label}`,
      detail:relation.detail
    });
    return role.weight === "day" ? 5 : 4;
  }
  if (kind === "harm") {
    signals.push({
      level:"info",
      label:`Lục hại với chi ${role.label}`,
      detail:relation.detail
    });
  }
  return 0;
}

export function personalizeDay(profile, dayBazi) {
  if (!profile?.dayMaster?.raw) return null;

  const signals = [];
  let delta = 0;
  const ruleIds = [];
  const currentBranch = dayBazi.branches.day;

  const yearRel = branchRelationship(profile.yearBranch, currentBranch);
  delta += applyBranchSignal({
    relation:yearRel,
    role:{ label:"năm sinh", branch:profile.yearBranch, current:currentBranch, weight:"year" },
    signals, ruleIds
  });

  const dayRel = branchRelationship(profile.dayBranch, currentBranch);
  delta += applyBranchSignal({
    relation:dayRel,
    role:{ label:"ngày sinh", branch:profile.dayBranch, current:currentBranch, weight:"day" },
    signals, ruleIds
  });

  const trine = trineRuleFor([profile.yearBranch, profile.dayBranch, currentBranch]);
  if (trine) {
    ruleIds.push(trine.id);
    signals.push({
      level:"info",
      label:"Đủ bộ Tam hợp",
      detail:"Ba chi năm sinh, ngày sinh và ngày hiện tại cùng tạo một bộ Tam hợp. App chỉ hiển thị thông tin, chưa cộng điểm."
    });
  }

  const currentStem = dayBazi.raw.day[0];
  const stemCombination = stemCombinationRule(profile.dayMaster.raw, currentStem);
  if (stemCombination) {
    ruleIds.push(stemCombination.id);
    signals.push({
      level:"info",
      label:"Thiên Can có Ngũ hợp",
      detail:`Nhật chủ và Thiên Can ngày hiện tại thuộc cặp Ngũ hợp; app chưa tự suy diễn hóa khí.`
    });
  }

  const tenGod = tenGodForStem(profile.dayMaster.raw, currentStem);
  signals.push({
    level:"info",
    label:`Ngày mang quan hệ ${tenGod}`,
    detail:`Thiên Can ngày hiện tại được quy chiếu với Nhật chủ ${profile.dayMaster.name} theo hệ Thập thần.`
  });

  return {
    delta,
    summary:signals.find(x => x.level === "caution")?.label ||
      signals.find(x => x.level === "good")?.label ||
      signals.find(x => x.level === "info")?.label ||
      `Ngày ${tenGod}`,
    tenGod,
    signals,
    ruleIds:[...new Set(ruleIds)],
    evidence:ruleSummary([...new Set(ruleIds)]),
    scoringPolicy:"ranking-heuristic-v1",
    confidence:"Quan hệ truyền thống có provenance; phần cộng/trừ điểm và strength vẫn là heuristic của ứng dụng."
  };
}
