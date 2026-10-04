import { branchRelationship } from "./personal.js";
import { relationRule, ruleSummary } from "./rule-engine.js";
import { tenGodForStem } from "./bazi-profile.js";

export function personalizeDay(profile, dayBazi) {
  if (!profile?.dayMaster?.raw) return null;

  const signals = [];
  let delta = 0;
  const ruleIds = [];

  const yearRel = branchRelationship(profile.yearBranch, dayBazi.branches.day);
  if (yearRel?.type === "clash") {
    delta -= 8; signals.push({ level:"caution", label:"Xung chi năm", detail:yearRel.detail });
    const r = relationRule("clash", profile.yearBranch, dayBazi.branches.day);
    if (r) ruleIds.push(r.id);
  } else if (yearRel?.type === "harmony") {
    delta += 4; signals.push({ level:"good", label:"Hợp chi năm", detail:yearRel.detail });
    const r = relationRule("harmony", profile.yearBranch, dayBazi.branches.day);
    if (r) ruleIds.push(r.id);
  }

  const dayRel = branchRelationship(profile.dayBranch, dayBazi.branches.day);
  if (dayRel?.type === "clash") {
    delta -= 10;
    signals.push({ level:"caution", label:"Xung chi ngày sinh", detail:dayRel.detail.replace("năm sinh","ngày sinh") });
    const r = relationRule("clash", profile.dayBranch, dayBazi.branches.day);
    if (r) ruleIds.push(r.id);
  } else if (dayRel?.type === "harmony") {
    delta += 5;
    signals.push({ level:"good", label:"Hợp chi ngày sinh", detail:dayRel.detail.replace("năm sinh","ngày sinh") });
    const r = relationRule("harmony", profile.dayBranch, dayBazi.branches.day);
    if (r) ruleIds.push(r.id);
  }

  const tenGod = tenGodForStem(profile.dayMaster.raw, dayBazi.raw.day[0]);
  signals.push({
    level:"info",
    label:`Ngày mang quan hệ ${tenGod}`,
    detail:`Thiên Can ngày hiện tại được quy chiếu với Nhật chủ ${profile.dayMaster.name} theo hệ Thập thần.`
  });

  return {
    delta,
    summary:signals.find(x => x.level === "caution")?.label ||
      signals.find(x => x.level === "good")?.label || `Ngày ${tenGod}`,
    tenGod,
    signals,
    ruleIds,
    evidence:ruleSummary(ruleIds),
    confidence:"Theo mô hình Bát Tự V2; Dụng thần chưa được khẳng định tự động."
  };
}
