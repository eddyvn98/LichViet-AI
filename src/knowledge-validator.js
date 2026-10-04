import { readFileSync } from "node:fs";
import { sourcePolicy } from "./evidence.js";

const BRANCHES = new Set(["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"]);
const STEMS = new Set(["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"]);
const DUTIES = new Set(["建","除","满","平","定","执","破","危","成","收","开","闭"]);
const ELEMENTS = new Set(["wood","fire","earth","metal","water"]);
const ACTIVITIES = new Set(["contract","wedding","move","opening","travel","build","medical","meeting"]);
const REVIEW_STATUSES = new Set(["reviewed","pending","disputed","deprecated"]);
const LEGACY_LEVELS = new Set([
  "primary_text_family","traditional_relation","canonical_verified",
  "official_secondary","implementation_crosscheck","experimental"
]);

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

function validLevel(value, policy) {
  return Boolean(policy.levels[String(value || "")]) || LEGACY_LEVELS.has(String(value || ""));
}

function validHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function validateKnowledgeBase() {
  const rules = readJson("../data/rules.json");
  const sources = readJson("../data/sources.json");
  const evidence = readJson("../data/evidence-records.json");
  const dutyClassification = readJson("../data/duty-classification.json");
  const activityPolicies = readJson("../data/activity-policies.json");
  const policy = sourcePolicy();
  const errors = [];
  const warnings = [];

  const sourceIds = new Set(sources.map(x => x.id));
  const evidenceIds = new Set(evidence.map(x => x.id));
  const dutyClassByRaw = new Map(dutyClassification.map(x => [x.raw, x]));
  const activityPolicyById = new Map(activityPolicies.map(x => [x.activity, x]));

  for (const id of duplicateValues(sources.map(x => x.id))) errors.push(`Nguồn trùng ID: ${id}`);
  for (const id of duplicateValues(evidence.map(x => x.id))) errors.push(`Evidence trùng ID: ${id}`);
  for (const id of duplicateValues(rules.map(x => x.id))) errors.push(`Rule trùng ID: ${id}`);
  for (const id of duplicateValues(dutyClassification.map(x => x.raw))) errors.push(`Duty classification trùng raw: ${id}`);
  for (const id of duplicateValues(activityPolicies.map(x => x.activity))) errors.push(`Activity policy trùng activity: ${id}`);

  for (const source of sources) {
    if (!source.id || !source.url || !source.family || !source.role) {
      errors.push(`Nguồn thiếu metadata bắt buộc: ${source.id || "(no id)"}`);
    }
    if (!validHttpUrl(source.url)) errors.push(`Nguồn có URL không hợp lệ: ${source.id}`);
    if (!validLevel(source.evidenceLevel, policy)) {
      errors.push(`Nguồn có evidenceLevel không hợp lệ: ${source.id} = ${source.evidenceLevel}`);
    }
    if (!Number.isInteger(source.authorityRank) || source.authorityRank < 0 || source.authorityRank > 5) {
      errors.push(`Nguồn có authorityRank ngoài 0..5: ${source.id}`);
    }
    if (!Array.isArray(source.canonicalFor)) errors.push(`Nguồn thiếu canonicalFor[]: ${source.id}`);
  }

  for (const record of evidence) {
    if (!record.id) errors.push("Evidence thiếu id");
    if (!sourceIds.has(record.sourceId)) {
      errors.push(`Evidence ${record.id} trỏ tới source không tồn tại: ${record.sourceId}`);
    }
    if (!record.locator || !record.claimType || !record.applicability) {
      errors.push(`Evidence thiếu locator/claim/applicability: ${record.id}`);
    }
    if (!validLevel(record.evidenceLevel, policy)) {
      errors.push(`Evidence level không hợp lệ: ${record.id} = ${record.evidenceLevel}`);
    }
    if (!REVIEW_STATUSES.has(record.reviewStatus || "")) {
      errors.push(`Evidence reviewStatus không hợp lệ: ${record.id}`);
    }
    if (record.evidenceLevel === "PRIMARY_EXACT" &&
        !/line|Table|卷|本原|简文|Điều|Official|chapter/i.test(record.locator)) {
      warnings.push(`PRIMARY_EXACT nên có locator chi tiết hơn: ${record.id}`);
    }
    const source = sources.find(x => x.id === record.sourceId);
    if (record.evidenceLevel === "PRIMARY_EXACT" &&
        Number(source?.authorityRank || 0) < 4) {
      warnings.push(`PRIMARY_EXACT nhưng source authority < 4, không được dùng cho strong claim: ${record.id}`);
    }
  }

  const DUTY_CLASSES = new Set(["good","bad"]);
  const DUTY_TIERS = new Set(["top-good","second-good","good","bad","very-bad"]);

  for (const item of dutyClassification) {
    if (!DUTIES.has(item.raw)) errors.push(`Duty classification raw lạ: ${item.raw}`);
    if (!DUTY_CLASSES.has(item.traditionalClass)) {
      errors.push(`Duty classification class lạ: ${item.raw} = ${item.traditionalClass}`);
    }
    if (!DUTY_TIERS.has(item.tier)) {
      errors.push(`Duty classification tier lạ: ${item.raw} = ${item.tier}`);
    }
    if (!evidenceIds.has(item.evidenceRef)) {
      errors.push(`Duty classification thiếu evidenceRef: ${item.raw} -> ${item.evidenceRef}`);
    }
  }
  if (dutyClassification.length !== 12 ||
      new Set(dutyClassification.map(x => x.raw)).size !== 12 ||
      [...DUTIES].some(x => !dutyClassByRaw.has(x))) {
    errors.push("Duty classification phải có đúng 12 Trực duy nhất");
  }

  for (const item of activityPolicies) {
    if (!item.id || !ACTIVITIES.has(item.activity)) {
      errors.push(`Activity policy không hợp lệ: ${item.id || "(no id)"}`);
    }
    if (item.evidenceLevel !== "PRODUCT_POLICY") {
      errors.push(`Activity policy phải là PRODUCT_POLICY: ${item.id}`);
    }
    if (item.policyVersion !== "activity-composition-v2") {
      errors.push(`Activity policy sai version: ${item.id}`);
    }
    for (const key of ["preferredDuties","avoidDuties","cautionDuties"]) {
      if (!Array.isArray(item[key]) || item[key].some(x => !DUTIES.has(x))) {
        errors.push(`Activity policy ${item.id} có ${key} không hợp lệ`);
      }
    }
    const overlap = [
      ...(item.preferredDuties || []).filter(x => (item.avoidDuties || []).includes(x)),
      ...(item.preferredDuties || []).filter(x => (item.cautionDuties || []).includes(x)),
      ...(item.avoidDuties || []).filter(x => (item.cautionDuties || []).includes(x))
    ];
    if (overlap.length) {
      errors.push(`Activity policy ${item.id} overlap duty: ${[...new Set(overlap)].join(",")}`);
    }
    for (const ref of item.evidenceRefs || []) {
      if (!evidenceIds.has(ref)) errors.push(`Activity policy ${item.id} thiếu evidenceRef: ${ref}`);
    }
  }
  if (activityPolicies.length !== ACTIVITIES.size ||
      [...ACTIVITIES].some(x => !activityPolicyById.has(x))) {
    errors.push("Activity policy phải phủ đủ 8 loại việc duy nhất");
  }

  for (const rule of rules) {
    if (!rule.id || !rule.kind) errors.push("Rule thiếu id/kind");
    if (rule.source && !sourceIds.has(rule.source)) {
      errors.push(`Rule ${rule.id} trỏ tới source không tồn tại: ${rule.source}`);
    }
    for (const ref of rule.evidenceRefs || []) {
      if (!evidenceIds.has(ref)) errors.push(`Rule ${rule.id} thiếu evidenceRef: ${ref}`);
    }
    if (rule.verification === "canonical_verified" && !(rule.evidenceRefs || []).length) {
      errors.push(`Rule canonical thiếu evidenceRef: ${rule.id}`);
    }
    for (const activity of [...(rule.good || []), ...(rule.avoid || [])]) {
      if (!ACTIVITIES.has(activity)) errors.push(`Rule ${rule.id} có activity lạ: ${activity}`);
    }
    const overlap = (rule.good || []).filter(x => (rule.avoid || []).includes(x));
    if (overlap.length) errors.push(`Rule ${rule.id} vừa good vừa avoid: ${overlap.join(",")}`);

    if (["clash","harmony","harm"].includes(rule.kind)) {
      if (!BRANCHES.has(rule.a) || !BRANCHES.has(rule.b) || rule.a === rule.b) {
        errors.push(`Rule quan hệ chi không hợp lệ: ${rule.id}`);
      }
    }

    if (rule.kind === "trine") {
      if (!Array.isArray(rule.members) || rule.members.length !== 3 ||
          new Set(rule.members).size !== 3 || rule.members.some(x => !BRANCHES.has(x))) {
        errors.push(`Rule Tam hợp không đủ 3 chi hợp lệ: ${rule.id}`);
      }
      if (!ELEMENTS.has(rule.element)) errors.push(`Rule Tam hợp có element lạ: ${rule.id}`);
    }

    if (rule.kind === "stem-combination") {
      if (!STEMS.has(rule.aStem) || !STEMS.has(rule.bStem) || rule.aStem === rule.bStem) {
        errors.push(`Rule Ngũ hợp có Thiên Can không hợp lệ: ${rule.id}`);
      }
      if (!ELEMENTS.has(rule.transform)) errors.push(`Rule Ngũ hợp có transform lạ: ${rule.id}`);
    }

    if (rule.kind === "duty") {
      if (!DUTIES.has(rule.raw)) errors.push(`Rule Trực có raw không hợp lệ: ${rule.id}`);
      if (rule.scorePolicy !== "ranking-tiebreak-v2") {
        errors.push(`Rule Trực phải khai báo scorePolicy ranking-tiebreak-v2: ${rule.id}`);
      }
      if (rule.evidenceLevel !== "PRODUCT_POLICY" ||
          rule.verification !== "product_policy") {
        errors.push(`Rule Trực activity mapping phải khóa ở PRODUCT_POLICY: ${rule.id}`);
      }
      if (!dutyClassByRaw.has(rule.raw)) {
        errors.push(`Rule Trực thiếu canonical classification: ${rule.id}`);
      }

      const expectedGood = activityPolicies
        .filter(x => x.preferredDuties.includes(rule.raw))
        .map(x => x.activity).sort();
      const expectedAvoid = activityPolicies
        .filter(x => x.avoidDuties.includes(rule.raw))
        .map(x => x.activity).sort();
      const actualGood = [...(rule.good || [])].sort();
      const actualAvoid = [...(rule.avoid || [])].sort();
      if (JSON.stringify(actualGood) !== JSON.stringify(expectedGood)) {
        errors.push(`Rule ${rule.id} good[] drift khỏi activity-policies.json`);
      }
      if (JSON.stringify(actualAvoid) !== JSON.stringify(expectedAvoid)) {
        errors.push(`Rule ${rule.id} avoid[] drift khỏi activity-policies.json`);
      }
    }
  }

  const dutyRaw = rules.filter(x => x.kind === "duty").map(x => x.raw);
  if (dutyRaw.length !== 12 || new Set(dutyRaw).size !== 12 ||
      [...DUTIES].some(x => !dutyRaw.includes(x))) {
    errors.push("Corpus 12 Trực phải có đúng 12 Trực duy nhất");
  }

  return {
    ok:errors.length === 0,
    errors,
    warnings,
    counts:{
      sources:sources.length,
      evidenceRecords:evidence.length,
      rules:rules.length,
      canonicalRules:rules.filter(x => x.verification === "canonical_verified").length,
      dutyClassifications:dutyClassification.length,
      activityPolicies:activityPolicies.length
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
