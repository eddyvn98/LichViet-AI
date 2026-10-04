import { readFileSync } from "node:fs";

const SOURCES = JSON.parse(
  readFileSync(new URL("../data/sources.json", import.meta.url), "utf8")
);
const POLICY = JSON.parse(
  readFileSync(new URL("../data/source-policy.json", import.meta.url), "utf8")
);

const SOURCE_MAP = new Map(SOURCES.map(source => [source.id, source]));

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

export function allSources() {
  return SOURCES.map(source => structuredClone(source));
}

export function sourcePolicy() {
  return structuredClone(POLICY);
}

export function evidenceForRule(rule) {
  const source = sourceById(rule?.source);
  const levelInfo = evidenceLevelInfo(rule?.evidenceLevel || rule?.verification);
  return {
    ruleId: rule?.id || null,
    sourceId: rule?.source || null,
    sourceName: source?.name || rule?.source || "Không rõ",
    sourceRole: source?.role || null,
    family: source?.family || null,
    locator: rule?.locator || null,
    verification: rule?.verification || null,
    ...levelInfo
  };
}

function uniqueFamilies(items) {
  return new Set(
    items
      .map(item => item?.family || item?.sourceId || null)
      .filter(Boolean)
  );
}

export function assessEvidence({
  evidence = [],
  crossChecks = [],
  experimental = false
} = {}) {
  const disputes = crossChecks.filter(item => item?.status === "disputed");
  if (disputes.length) {
    return {
      code: "disputed",
      label: "Có bất đồng cần kiểm chứng",
      canMakeStrongClaim: false,
      disputes: disputes.map(item => item.id || item.provider)
    };
  }

  const normalized = evidence.map(item =>
    item?.rank === undefined
      ? { ...item, ...evidenceLevelInfo(item?.level || item?.verification) }
      : item
  );
  const maxRank = Math.max(0, ...normalized.map(item => Number(item.rank) || 0));
  const agreeingChecks = crossChecks.filter(item => item?.status === "agree");
  const families = uniqueFamilies(agreeingChecks);
  const hasStrongPrimary = normalized.some(item => item?.strongClaim === true);

  if (!experimental && hasStrongPrimary && agreeingChecks.length >= 1) {
    return {
      code: "high",
      label: "Độ tin cậy cao",
      canMakeStrongClaim: true,
      independentFamilies: families.size
    };
  }

  if (!experimental && maxRank >= 4) {
    return {
      code: "medium",
      label: "Độ tin cậy khá",
      canMakeStrongClaim: false,
      independentFamilies: families.size
    };
  }

  return {
    code: "low",
    label: experimental ? "Có phần heuristic" : "Cần thêm bằng chứng",
    canMakeStrongClaim: false,
    independentFamilies: families.size
  };
}
