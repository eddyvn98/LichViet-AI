import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { buildDayInfo, publicDay } from "../src/traditional.js";
import { engineManifest } from "../src/version.js";
import {
  solarToVietnameseLunar,
  vietnameseLunarToSolar
} from "../src/vietnamese-lunar.js";

function addDays(iso, amount) {
  const date = new Date(iso + "T12:00:00+07:00");
  date.setUTCDate(date.getUTCDate() + amount);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone:"Asia/Ho_Chi_Minh"
  }).format(date);
}

function bool(value) {
  return ["true","1","yes","on"].includes(String(value || "").toLowerCase());
}

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map(item => {
      const [key, value = "true"] = item.replace(/^--/, "").split("=");
      return [key, value];
    })
  );
  return {
    from:args.from || "2026-01-01",
    days:Math.max(1, Math.min(Number(args.days) || 366, 36525)),
    step:Math.max(1, Math.min(Number(args.step) || 1, 365)),
    strict:bool(args.strict),
    out:args.out || ""
  };
}

const { from, days, step, strict, out } = parseArgs();
const manifest = engineManifest();
const rows = [];
const invariantCases = [];
const summary = {
  from, days, step,
  checked:0,
  baziDisputes:0,
  lunarTimezoneSensitive:0,
  otherDisputes:0,
  lunarRoundTripFailures:0,
  invariantFailures:0,
  nearSolarTermBoundaries:0
};

for (let i = 0; i < days; i += step) {
  const date = addDays(from, i);
  const day = publicDay(buildDayInfo(date));
  const checks = day.provenance.crossChecks || [];
  const noteworthy = checks.filter(x =>
    x.status === "disputed" || x.status === "timezone-sensitive"
  );

  summary.checked += 1;
  if (day.baziBoundary?.nearBoundary) summary.nearSolarTermBoundaries += 1;

  for (const check of noteworthy) {
    if (check.scope === "bazi-year-month-day" && check.status === "disputed") {
      summary.baziDisputes += 1;
    } else if (
      check.scope === "lunar-calendar" &&
      check.status === "timezone-sensitive"
    ) {
      summary.lunarTimezoneSensitive += 1;
    } else {
      summary.otherDisputes += 1;
    }
  }

  const lunar = solarToVietnameseLunar(date);
  let reversed = null;
  try {
    reversed = vietnameseLunarToSolar(lunar);
    if (reversed.iso !== date) {
      summary.lunarRoundTripFailures += 1;
      invariantCases.push({
        date, type:"lunar-round-trip",
        lunar, reversed:reversed.iso
      });
    }
  } catch (error) {
    summary.lunarRoundTripFailures += 1;
    invariantCases.push({
      date, type:"lunar-round-trip-error",
      lunar, error:String(error?.message || error)
    });
  }

  const violations = [];
  if (!Number.isFinite(day.ranking?.score) ||
      day.ranking.score < 0 || day.ranking.score > 100) {
    violations.push("ranking-out-of-range");
  }
  if (!day.confidence?.facts?.code) violations.push("missing-fact-confidence");
  const confidenceDomains = day.confidence?.domains || {};
  for (const name of ["calendar","bazi","traditional"]) {
    if (!confidenceDomains[name]?.code) {
      violations.push(`missing-confidence-domain-${name}`);
    }
  }
  const confidenceRank = { disputed:0, low:1, medium:2, high:3 };
  const domainRanks = ["calendar","bazi","traditional"]
    .map(name => confidenceRank[confidenceDomains[name]?.code])
    .filter(Number.isFinite);
  const overallRank = confidenceRank[day.confidence?.facts?.code];
  if (domainRanks.length === 3 &&
      Number.isFinite(overallRank) &&
      overallRank > Math.min(...domainRanks)) {
    violations.push("aggregate-confidence-exceeds-weakest-domain");
  }
  if (day.confidence?.ranking?.code !== "experimental") {
    violations.push("ranking-not-marked-experimental");
  }
  if (day.ranking?.role !== "tie-break-only" ||
      day.ranking?.policy?.id !== manifest.rankingPolicy) {
    violations.push("ranking-not-tie-break-only");
  }
  if (day.verdict?.policy?.id !== manifest.generalVerdictPolicy) {
    violations.push("general-verdict-not-composition-v1");
  }
  if (!Array.isArray(day.provenance?.rules) ||
      !Array.isArray(day.provenance?.crossChecks)) {
    violations.push("missing-provenance");
  }

  if (violations.length) {
    summary.invariantFailures += 1;
    invariantCases.push({ date, type:"invariant", violations });
  }

  if (noteworthy.length) {
    rows.push({
      date,
      lunar:day.lunar,
      canChi:day.canChi,
      checks:noteworthy
    });
  }
}

const report = {
  generatedAt:new Date().toISOString(),
  engine:manifest.engine,
  strict,
  summary,
  noteworthyCases:rows,
  invariantCases
};

const json = JSON.stringify(report, null, 2);
if (out) {
  await mkdir(dirname(out), { recursive:true });
  await writeFile(out, json);
  console.log(`Wrote audit report to ${out}`);
}
console.log(json);

if (strict && (
  summary.baziDisputes > 0 ||
  summary.otherDisputes > 0 ||
  summary.lunarRoundTripFailures > 0 ||
  summary.invariantFailures > 0
)) {
  process.exitCode = 1;
}
