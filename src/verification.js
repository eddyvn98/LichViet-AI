import { readFileSync } from "node:fs";
import { allActivityPolicies, allDutyClassifications, allRules } from "./rule-engine.js";
import { allEvidenceRecords, allSources, sourcePolicy } from "./evidence.js";
import { validateKnowledgeBase } from "./knowledge-validator.js";
import { engineManifest } from "./version.js";

const CASES = JSON.parse(
  readFileSync(new URL("../data/verification-cases.json", import.meta.url), "utf8")
);

export function verificationCases() {
  return CASES.map(item => structuredClone(item));
}

export function verificationSummary() {
  const rules = allRules();
  const sources = allSources();
  const evidenceRecords = allEvidenceRecords();
  const integrity = validateKnowledgeBase();
  const manifest = engineManifest();
  const dutyClassifications = allDutyClassifications();
  const activityPolicies = allActivityPolicies();
  const byLevel = {};
  const byKind = {};
  const byReviewStatus = {};

  for (const rule of rules) {
    const level = rule.evidence?.level || "UNKNOWN";
    byLevel[level] = (byLevel[level] || 0) + 1;
    byKind[rule.kind] = (byKind[rule.kind] || 0) + 1;
  }

  for (const record of evidenceRecords) {
    const status = record.reviewStatus || "unknown";
    byReviewStatus[status] = (byReviewStatus[status] || 0) + 1;
  }

  return {
    version:manifest.verificationVersion,
    mode:"verified-engine",
    integrity,
    ruleCount:rules.length,
    sourceCount:sources.length,
    evidenceRecordCount:evidenceRecords.length,
    regressionCaseCount:CASES.length,
    dutyClassificationCount:dutyClassifications.length,
    activityPolicyCount:activityPolicies.length,
    manifest,
    rulesByEvidenceLevel:byLevel,
    rulesByKind:byKind,
    evidenceByReviewStatus:byReviewStatus,
    sourcePolicy:sourcePolicy(),
    guarantees:[
      "AI không được tự tính lại lịch hoặc tạo rule.",
      "Implementation không được ghi đè kết quả engine.",
      "Bất đồng cross-check phải được giữ lại trong provenance.",
      "Heuristic phải được gắn nhãn và hạ confidence.",
      "Evidence precision và source authority được đánh giá riêng.",
      "Confidence được tách theo calendar, BaZi và traditional; tổng hợp lấy miền yếu nhất.",
      "Fact nguyên điển và PRODUCT_POLICY phải tách riêng; evidence mạnh không được nâng policy nội bộ thành canonical.",
      "Verdict/chọn ngày dùng multi-signal composition; ranking score chỉ tie-break.",
      "Lịch tính lùi trước phạm vi hiện đại phải giữ nhãn historical-proleptic.",
      "Knowledge base phải qua validator trước test/UI."
    ]
  };
}
