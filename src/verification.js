import { readFileSync } from "node:fs";
import { allRules } from "./rule-engine.js";
import { allEvidenceRecords, allSources, sourcePolicy } from "./evidence.js";
import { validateKnowledgeBase } from "./knowledge-validator.js";

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
    version:"5.0",
    mode:"verified-engine",
    integrity,
    ruleCount:rules.length,
    sourceCount:sources.length,
    evidenceRecordCount:evidenceRecords.length,
    regressionCaseCount:CASES.length,
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
      "Knowledge base phải qua validator trước test/UI."
    ]
  };
}
