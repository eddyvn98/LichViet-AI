import { readFileSync } from "node:fs";
import { allRules } from "./rule-engine.js";
import { allSources, sourcePolicy } from "./evidence.js";

const CASES = JSON.parse(
  readFileSync(new URL("../data/verification-cases.json", import.meta.url), "utf8")
);

export function verificationCases() {
  return CASES.map(item => structuredClone(item));
}

export function verificationSummary() {
  const rules = allRules();
  const sources = allSources();
  const byLevel = {};

  for (const rule of rules) {
    const level = rule.evidence?.level || "UNKNOWN";
    byLevel[level] = (byLevel[level] || 0) + 1;
  }

  return {
    version: "3.0",
    mode: "verified-engine",
    ruleCount: rules.length,
    sourceCount: sources.length,
    regressionCaseCount: CASES.length,
    rulesByEvidenceLevel: byLevel,
    sourcePolicy: sourcePolicy(),
    guarantees: [
      "AI không được tự tính lại lịch hoặc tạo rule.",
      "Implementation không được ghi đè kết quả engine.",
      "Bất đồng cross-check phải được giữ lại trong provenance.",
      "Heuristic phải được gắn nhãn và hạ confidence."
    ]
  };
}
