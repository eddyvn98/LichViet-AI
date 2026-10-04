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

export function resolveEvidenceRecords(ids = []) {
  return [...new Set(ids)]
    .map(evidenceRecordById)
    .filter(Boolean);
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
  const explicitLevel = normalizeEvidenceLevel(
    rule?.evidenceLevel || rule?.verification
  );
  const policyLocked = ["PRODUCT_POLICY","EXPERIMENTAL"].includes(explicitLevel);

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
    supportingEvidenceLevel:bestRecord?.level || null,
    ...(policyLocked ? levelInfo :
      bestRecord ? evidenceLevelInfo(bestRecord.evidenceLevel) : levelInfo)
  };
}

function uniqueFamilies(items) {
  return new Set(
    items
      .map(item => item?.family || item?.sourceId || null)
      .filter(Boolean)
  );
}

function recordCanSupportStrongClaim(record, allowedApplicabilities = null) {
  if (!record) return false;
  if (record.applicability === "historical-support") return false;
  if (allowedApplicabilities?.length &&
      !allowedApplicabilities.includes(record.applicability)) {
    return false;
  }
  if (record.level === "ASTRONOMY_OFFICIAL") return true;
  if (record.level !== "PRIMARY_EXACT") return false;
  return record.authorityRank >= 4;
}

export function assessEvidence({
  evidence = [],
  crossChecks = [],
  experimental = false,
  strongClaimApplicabilities = null
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

  const records = normalized.flatMap(item =>
    item?.records?.length
      ? item.records
      : item?.id && item?.sourceId
        ? [item]
        : []
  );
  const maxRank = Math.max(0, ...normalized.map(item => Number(item.rank) || 0));
  const maxAuthority = Math.max(0, ...normalized.map(item => Number(item.authorityRank) || 0));
  const agreeingChecks = crossChecks.filter(item => item?.status === "agree");
  const families = uniqueFamilies(agreeingChecks);
  const hasStrongRecord = records.some(record =>
    recordCanSupportStrongClaim(record, strongClaimApplicabilities)
  );
  const hasStrongLegacy = normalized.some(item =>
    item?.strongClaim === true &&
    Number(item.authorityRank || 0) >= 4 &&
    !(item.records || []).length &&
    !(item?.id && item?.sourceId)
  );
  const qualifications = crossChecks.filter(item =>
    item?.status === "timezone-sensitive"
  );

  if (!experimental && (hasStrongRecord || hasStrongLegacy) &&
      qualifications.length === 0) {
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
      label:qualifications.length
        ? "Độ tin cậy khá, có khác biệt quy ước/múi giờ"
        : "Độ tin cậy khá",
      canMakeStrongClaim:false,
      independentFamilies:families.size,
      maxAuthority,
      qualifiedBy:qualifications.map(item => item.id || item.provider)
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


const CONFIDENCE_ORDER = {
  disputed:0,
  low:1,
  medium:2,
  high:3
};

export function combineConfidence(domains = {}) {
  const entries = Object.entries(domains)
    .filter(([,value]) => value?.code && value.code in CONFIDENCE_ORDER);
  if (!entries.length) {
    return {
      code:"low",
      label:"Chưa đủ dữ liệu theo miền",
      canMakeStrongClaim:false,
      domains:{}
    };
  }

  const [weakestName, weakest] = [...entries].sort((a,b) =>
    CONFIDENCE_ORDER[a[1].code] - CONFIDENCE_ORDER[b[1].code]
  )[0];

  return {
    code:weakest.code,
    label:`Độ tin cậy tổng hợp: ${weakest.label}`,
    canMakeStrongClaim:entries.every(([,value]) => value.canMakeStrongClaim === true),
    weakestDomain:weakestName,
    domains:Object.fromEntries(entries.map(([name,value]) => [name,value.code]))
  };
}
