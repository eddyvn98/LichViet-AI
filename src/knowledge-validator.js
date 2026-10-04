import { readFileSync } from "node:fs";
import { normalizeEvidenceLevel, sourcePolicy } from "./evidence.js";

const BRANCHES = new Set(["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"]);
const ACTIVITIES = new Set(["contract","wedding","move","opening","travel","build","medical","meeting"]);

function readJson(path) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
}

function duplicateValues(values) {
  const seen = new Set();
  const dup = new Set();
  for (const value of values) {
    if (seen.has(value)) dup.add(value);
    seen.add(value);
  }
  return [...dup];
}

export function validateKnowledgeBase() {
  const rules = readJson("../data/rules.json");
  const sources = readJson("../data/sources.json");
  const evidence = readJson("../data/evidence-records.json");
  const policy = sourcePolicy();
  const errors = [];
  const warnings = [];

  const sourceIds = new Set(sources.map(x => x.id));
  const evidenceIds = new Set(evidence.map(x => x.id));

  for (const id of duplicateValues(sources.map(x => x.id))) {
    errors.push(`Nguồn trùng ID: ${id}`);
  }
  for (const id of duplicateValues(evidence.map(x => x.id))) {
    errors.push(`Evidence trùng ID: ${id}`);
  }
  for (const id of duplicateValues(rules.map(x => x.id))) {
    errors.push(`Rule trùng ID: ${id}`);
  }

  for (const source of sources) {
    if (!source.id || !source.url || !source.family || !source.role) {
      errors.push(`Nguồn thiếu metadata bắt buộc: ${source.id || "(no id)"}`);
    }
    if (!policy.levels[normalizeEvidenceLevel(source.evidenceLevel)]) {
      errors.push(`Nguồn có evidenceLevel không hợp lệ: ${source.id}`);
    }
  }

  for (const record of evidence) {
    if (!sourceIds.has(record.sourceId)) {
      errors.push(`Evidence ${record.id} trỏ tới source không tồn tại: ${record.sourceId}`);
    }
    if (!record.locator || !record.claimType || !record.applicability) {
      errors.push(`Evidence thiếu locator/claim/applicability: ${record.id}`);
    }
    if (!policy.levels[normalizeEvidenceLevel(record.evidenceLevel)]) {
      errors.push(`Evidence level không hợp lệ: ${record.id}`);
    }
    if (normalizeEvidenceLevel(record.evidenceLevel) === "PRIMARY_EXACT" &&
        !/line|Table|卷|本原|简文|Almanac/i.test(record.locator)) {
      warnings.push(`PRIMARY_EXACT nên có locator chi tiết hơn: ${record.id}`);
    }
  }

  for (const rule of rules) {
    if (!rule.id || !rule.kind) errors.push("Rule thiếu id/kind");
    if (rule.source && !sourceIds.has(rule.source)) {
      errors.push(`Rule ${rule.id} trỏ tới source không tồn tại: ${rule.source}`);
    }
    for (const ref of rule.evidenceRefs || []) {
      if (!evidenceIds.has(ref)) errors.push(`Rule ${rule.id} thiếu evidenceRef: ${ref}`);
    }
    for (const activity of [...(rule.good || []), ...(rule.avoid || [])]) {
      if (!ACTIVITIES.has(activity)) errors.push(`Rule ${rule.id} có activity lạ: ${activity}`);
    }
    if (rule.a && !BRANCHES.has(rule.a)) errors.push(`Rule ${rule.id} có chi a không hợp lệ`);
    if (rule.b && !BRANCHES.has(rule.b)) errors.push(`Rule ${rule.id} có chi b không hợp lệ`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    counts: {
      sources:sources.length,
      evidenceRecords:evidence.length,
      rules:rules.length
    }
  };
}

export function assertKnowledgeBaseValid() {
  const result = validateKnowledgeBase();
  if (!result.ok) {
    throw new Error("Knowledge base invalid:\n" + result.errors.join("\n"));
  }
  return result;
}
