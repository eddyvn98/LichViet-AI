import { readFileSync } from "node:fs";

const SOURCES = JSON.parse(
  readFileSync(new URL("../data/sources.json", import.meta.url), "utf8")
);
const POLICY = JSON.parse(
  readFileSync(new URL("../data/source-policy.json", import.meta.url), "utf8")
);
const RECORDS = JSON.parse(
  readFileSync(new URL("../data/evidence-records.json", import.meta.url), "utf8")
);

const SOURCE_MAP = new Map(SOURCES.map(source => [source.id, source]));
const RECORD_MAP = new Map(RECORDS.map(record => [record.id, record]));

const LEGACY_LEVELS = {
  primary_text_family: "PRIMARY_FAMILY",
  traditional_relation: "PRIMARY_FAMILY",
  canonical_verified: "PRIMARY_EXACT",
  official_secondary: "OFFICIAL_SECONDARY",
  implementation_crosscheck: "IMPLEMENTATION_CROSSCHECK",
  experimental: "EXPERIMENTAL"
};

export function normalizeEvidenceLevel(value) {
  const raw = String(value || "").trim();
  if (POLICY.levels[raw]) return raw;
  return LEGACY_LEVELS[raw] || "COMMUNITY_REFERENCE";
}

export function evidenceLevelInfo(value) {
  const level = normalizeEvidenceLevel(value);
  return { level, ...POLICY.levels[level] };
}

export function sourceById(id) {
  const source = SOURCE_MAP.get(id);
  return source ? structuredClone(source) : null;
}

export function evidenceRecordById(id) {
  const record = RECORD_MAP.get(id);
  if (!record) return null;
  const source = sourceById(record.sourceId);
  return {
    ...structuredClone(record),
    source,
    authorityRank:Number(source?.authorityRank || 0),
    family:source?.family || record.sourceId,
    ...evidenceLevelInfo(record.evidenceLevel)
  };
}

export function allEvidenceRecords() {
  return RECORDS.map(record => evidenceRecordById(record.id));
}

export function allSources() {
  return SOURCES.map(source => structuredClone(source));
}

export function sourcePolicy() {
  return structuredClone(POLICY);
}

export function evidenceForRule(rule) {
  const source = sourceById(rule?.source);
  const levelInfo = evidenceLevelInfo(rule?.evidenceLevel || rule?.verification);
  const records = (rule?.evidenceRefs || [])
    .map(evidenceRecordById)
    .filter(Boolean);

  const bestRecord = [...records].sort((a,b) =>
    (b.rank + b.authorityRank) - (a.rank + a.authorityRank)
  )[0] || null;

  return {
    ruleId:rule?.id || null,
    sourceId:rule?.source || null,
    sourceName:source?.name || rule?.source || "Không rõ",
    sourceRole:source?.role || null,
    family:source?.family || null,
    authorityRank:Number(source?.authorityRank || 0),
    canonicalFor:source?.canonicalFor || [],
    locator:bestRecord?.locator || rule?.locator || null,
    verification:rule?.verification || null,
    evidenceRefs:records.map(x => x.id),
    records,
    ...(bestRecord ? evidenceLevelInfo(bestRecord.evidenceLevel) : levelInfo)
  };
}

function uniqueFamilies(items) {
  return new Set(
    items
      .map(item => item?.family || item?.sourceId || null)
      .filter(Boolean)
  );
}

function recordCanSupportStrongClaim(record) {
  if (!record) return false;
  if (record.applicability === "historical-support") return false;
  if (record.level === "ASTRONOMY_OFFICIAL") return true;
  if (record.level !== "PRIMARY_EXACT") return false;
  return record.authorityRank >= 4;
}

export function assessEvidence({
  evidence = [],
  crossChecks = [],
  experimental = false
} = {}) {
  const disputes = crossChecks.filter(item => item?.status === "disputed");
  if (disputes.length) {
    return {
      code:"disputed",
      label:"Có bất đồng cần kiểm chứng",
      canMakeStrongClaim:false,
      disputes:disputes.map(item => item.id || item.provider)
    };
  }

  const normalized = evidence.map(item =>
    item?.rank === undefined
      ? { ...item, ...evidenceLevelInfo(item?.level || item?.verification) }
      : item
  );

  const records = normalized.flatMap(item => item.records || []);
  const maxRank = Math.max(0, ...normalized.map(item => Number(item.rank) || 0));
  const maxAuthority = Math.max(0, ...normalized.map(item => Number(item.authorityRank) || 0));
  const agreeingChecks = crossChecks.filter(item => item?.status === "agree");
  const families = uniqueFamilies(agreeingChecks);
  const hasStrongRecord = records.some(recordCanSupportStrongClaim);
  const hasStrongLegacy = normalized.some(item =>
    item?.strongClaim === true &&
    Number(item.authorityRank || 0) >= 4 &&
    !(item.records || []).length
  );

  if (!experimental && (hasStrongRecord || hasStrongLegacy)) {
    return {
      code:"high",
      label:"Độ tin cậy cao",
      canMakeStrongClaim:true,
      independentFamilies:families.size,
      maxAuthority
    };
  }

  if (!experimental && maxRank >= 4 && maxAuthority >= 3) {
    return {
      code:"medium",
      label:"Độ tin cậy khá",
      canMakeStrongClaim:false,
      independentFamilies:families.size,
      maxAuthority
    };
  }

  return {
    code:"low",
    label:experimental ? "Có phần heuristic" : "Cần thêm bằng chứng",
    canMakeStrongClaim:false,
    independentFamilies:families.size,
    maxAuthority
  };
}
