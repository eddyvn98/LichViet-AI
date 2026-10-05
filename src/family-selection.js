import { personalizeDay } from "./personal-v2.js";
import { ruleSummary } from "./rule-engine.js";

export const FAMILY_POLICY = {
  id:"family-personalization-v1",
  evidenceLevel:"PRODUCT_POLICY",
  maxMembers:8,
  note:"Tín hiệu cá nhân của nhiều thành viên được tổng hợp bảo thủ. Một caution của thành viên được giữ lại; good của người khác không xóa caution. Lớp gia đình không tự tạo veto."
};

function memberName(profile, index) {
  return String(profile?.name || profile?.id || `Thành viên ${index + 1}`).slice(0,40);
}

export function personalizeFamily(profiles = [], dayBazi) {
  const input = Array.isArray(profiles) ? profiles.slice(0, FAMILY_POLICY.maxMembers) : [];
  if (!input.length) return null;

  const members = input.map((profile,index) => {
    const personal = personalizeDay(profile, dayBazi);
    return {
      id:String(profile?.id || `member-${index + 1}`).slice(0,80),
      name:memberName(profile,index),
      available:Boolean(personal),
      personal
    };
  });

  const signals = [];
  const ruleIds = [];

  for (const member of members) {
    if (!member.personal) continue;
    ruleIds.push(...(member.personal.ruleIds || []));
    for (const signal of member.personal.signals || []) {
      if (!["caution","good","info"].includes(signal.level)) continue;
      signals.push({
        ...signal,
        memberId:member.id,
        memberName:member.name,
        detail:`${member.name}: ${signal.detail}`
      });
    }
  }

  const uniqueRuleIds = [...new Set(ruleIds)];
  const cautionMembers = [...new Set(
    signals.filter(x => x.level === "caution").map(x => x.memberName)
  )];
  const goodMembers = [...new Set(
    signals.filter(x => x.level === "good").map(x => x.memberName)
  )];

  return {
    mode:"family",
    policy:FAMILY_POLICY,
    memberCount:members.length,
    availableCount:members.filter(x => x.available).length,
    unresolvedMembers:members.filter(x => !x.available).map(x => ({
      id:x.id,
      name:x.name
    })),
    members:members.map(x => ({
      id:x.id,
      name:x.name,
      available:x.available,
      summary:x.personal?.summary || "Chưa đủ dữ liệu để cá nhân hóa",
      tenGod:x.personal?.tenGod || null,
      signals:x.personal?.signals || []
    })),
    signals,
    ruleIds:uniqueRuleIds,
    evidence:ruleSummary(uniqueRuleIds),
    delta:0,
    summary:cautionMembers.length
      ? `Cần lưu ý cho ${cautionMembers.join(", ")}`
      : goodMembers.length
        ? `Có tín hiệu hỗ trợ cho ${goodMembers.join(", ")}`
        : "Không có tín hiệu gia đình nổi bật",
    confidence:"Quan hệ cá nhân có provenance; cách gộp nhiều thành viên là PRODUCT_POLICY và không tạo veto.",
    scoringPolicy:"family-personalization-v1"
  };
}
