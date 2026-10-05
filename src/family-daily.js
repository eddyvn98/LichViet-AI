import { getBaZi } from "./bazi.js";
import { personalizeFamily } from "./family-selection.js";
import { reproducibilityTrace } from "./trace.js";

export const FAMILY_DAILY_POLICY = {
  id:"family-daily-summary-v1",
  evidenceLevel:"PRODUCT_POLICY",
  note:"Tóm tắt tín hiệu của các thành viên đã chọn; không tạo verdict mới."
};

export function buildFamilyDailySummary({ date, profiles = [] } = {}) {
  const input = Array.isArray(profiles) ? profiles.filter(Boolean).slice(0,8) : [];
  if (!input.length) {
    return {
      date,
      policy:FAMILY_DAILY_POLICY,
      selectedCount:0,
      availableCount:0,
      unresolvedCount:0,
      summary:"Chưa chọn thành viên.",
      signals:[],
      trace:null
    };
  }

  const family = personalizeFamily(input, getBaZi(date, "12:00"));
  const signals = (family?.signals || []).slice(0,8).map(x => ({
    level:x.level,
    label:x.label,
    detail:x.detail,
    memberId:x.memberId,
    memberName:x.memberName
  }));
  const cautions = [...new Set(signals.filter(x => x.level === "caution").map(x => x.memberName))];
  const supports = [...new Set(signals.filter(x => x.level === "good").map(x => x.memberName))];

  return {
    date,
    policy:FAMILY_DAILY_POLICY,
    selectedCount:family?.memberCount || input.length,
    availableCount:family?.availableCount || 0,
    unresolvedCount:family?.unresolvedMembers?.length || 0,
    summary:cautions.length
      ? "Cần lưu ý cho " + cautions.join(", ")
      : supports.length
        ? "Có tín hiệu hỗ trợ cho " + supports.join(", ")
        : "Không có tín hiệu gia đình nổi bật.",
    signals,
    trace:reproducibilityTrace({
      type:"family-daily-summary",
      date,
      policy:FAMILY_DAILY_POLICY.id,
      memberCount:family?.memberCount || input.length,
      availableCount:family?.availableCount || 0,
      unresolvedCount:family?.unresolvedMembers?.length || 0,
      signalLevels:signals.map(x => x.level),
      ruleIds:family?.ruleIds || []
    })
  };
}
