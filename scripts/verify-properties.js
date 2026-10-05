import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { buildDayInfo, publicDay } from "../src/traditional.js";
import { ACTIVITIES, compareDays, rankDays } from "../src/planner.js";
import { analyzeBirthProfile } from "../src/bazi-profile.js";
import { allDutyClassifications } from "../src/rule-engine.js";
import { engineManifest } from "../src/version.js";

function iso(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone:"Asia/Ho_Chi_Minh"
  }).format(date);
}

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map(item => {
      const [key, value = "true"] = item.replace(/^--/, "").split("=");
      return [key, value];
    })
  );
  return {
    from:args.from || "2024-01-01",
    to:args.to || "2028-12-31",
    out:args.out || ""
  };
}

function nextDay(value) {
  const d = new Date(value + "T12:00:00+07:00");
  d.setUTCDate(d.getUTCDate() + 1);
  return iso(d);
}

const { from, to, out } = parseArgs();
const manifest = engineManifest();
const dutySet = new Set(allDutyClassifications().map(x => x.raw));
const failures = [];
const summary = {
  from,
  to,
  engine:manifest.engine,
  checkedDays:0,
  plannerSamples:0,
  transitionDays:0,
  goodHourFailures:0,
  decisionFailures:0,
  confidenceFailures:0,
  provenanceFailures:0,
  traceFailures:0,
  familyPlannerSamples:0,
  familyFailures:0,
  compareSamples:0
};

const familyProfiles = [
  { ...analyzeBirthProfile("1995-04-14", "12:00"), id:"audit-a", name:"Audit A" },
  { ...analyzeBirthProfile("1997-11-17", "12:00"), id:"audit-b", name:"Audit B" }
];

let index = 0;
for (let date = from; date <= to; date = nextDay(date), index += 1) {
  const day = publicDay(buildDayInfo(date));
  summary.checkedDays += 1;

  if (!Array.isArray(day.goodHours) || day.goodHours.length !== 6) {
    summary.goodHourFailures += 1;
    failures.push({ date, type:"good-hours", count:day.goodHours?.length ?? null });
  }

  if (day.verdict?.policy?.id !== "general-day-composition-v1") {
    summary.decisionFailures += 1;
    failures.push({ date, type:"general-verdict-policy", verdict:day.verdict });
  }

  if (day.ranking?.role !== "tie-break-only" ||
      day.ranking?.policy?.id !== "ranking-tiebreak-v2") {
    summary.decisionFailures += 1;
    failures.push({
      date,
      type:"ranking-role",
      role:day.ranking?.role,
      policy:day.ranking?.policy?.id
    });
  }

  for (const name of ["calendar","bazi","traditional"]) {
    if (!day.confidence?.domains?.[name]?.code) {
      summary.confidenceFailures += 1;
      failures.push({ date, type:"missing-confidence-domain", domain:name });
    }
  }

  if (!Array.isArray(day.provenance?.evidenceRecords) ||
      !day.provenance.evidenceRecords.some(x => x.id === "XLKY-SELECTION-MULTIFACTOR")) {
    summary.provenanceFailures += 1;
    failures.push({ date, type:"missing-selection-principle-evidence" });
  }

  if (day.provenance?.trace?.algorithm !== "sha256" ||
      !/^[0-9a-f]{64}$/.test(day.provenance?.trace?.hash || "")) {
    summary.traceFailures += 1;
    failures.push({ date, type:"invalid-reproducibility-trace" });
  }

  if (day.dutyTransition) summary.transitionDays += 1;

  if (index % 14 === 0) {
    for (const activity of Object.keys(ACTIVITIES)) {
      const result = rankDays({ from:date, days:1, activity })[0];
      summary.plannerSamples += 1;
      const decision = result?.recommendationDecision;
      if (!decision ||
          decision.policy?.id !== "activity-composition-v2" ||
          !["preferred","neutral","caution","blocked"].includes(decision.code)) {
        summary.decisionFailures += 1;
        failures.push({ date, type:"planner-decision", activity, decision });
      }
      if (result?.activityRanking?.role !== "tie-break-only" ||
          result?.activityRanking?.policy?.id !== "ranking-tiebreak-v2") {
        summary.decisionFailures += 1;
        failures.push({
          date,
          type:"planner-ranking-role",
          activity,
          role:result?.activityRanking?.role,
          policy:result?.activityRanking?.policy?.id
        });
      }
      for (const state of decision?.states || []) {
        if (!dutySet.has(state.raw)) {
          summary.decisionFailures += 1;
          failures.push({ date, type:"unknown-duty-state", activity, raw:state.raw });
        }
      }
    }
  }

  if (index % 28 === 0) {
    const familyResults = rankDays({
      from:date,
      days:14,
      activity:"meeting",
      profiles:familyProfiles,
      constraints:{ dayType:"weekend" }
    });
    summary.familyPlannerSamples += 1;

    for (const item of familyResults) {
      if (item.family?.memberCount !== 2 ||
          item.constraintEvaluation?.policy?.id !== "selection-constraints-v1" ||
          item.recommendationDecision?.trace?.engine !== manifest.engine) {
        summary.familyFailures += 1;
        failures.push({
          date:item.date,
          type:"family-planner-invariant",
          family:item.family,
          constraints:item.constraintEvaluation
        });
      }
      if (item.constraintEvaluation?.weekend !== true) {
        summary.familyFailures += 1;
        failures.push({
          date:item.date,
          type:"family-weekend-constraint-failed"
        });
      }
    }

    const next = nextDay(date);
    const comparison = compareDays({
      dates:[date,next],
      activity:"contract",
      profiles:familyProfiles
    });
    summary.compareSamples += 1;
    if (comparison.familyMemberCount !== 2 ||
        comparison.policy?.id !== manifest.comparisonPolicy ||
        !comparison.explanation ||
        comparison.candidates.length !== 2) {
      summary.familyFailures += 1;
      failures.push({
        date,
        type:"family-compare-invariant",
        comparison
      });
    }
  }
}

const report = {
  generatedAt:new Date().toISOString(),
  manifest,
  summary,
  ok:failures.length === 0,
  failures:failures.slice(0,200)
};

const json = JSON.stringify(report, null, 2);
if (out) {
  await mkdir(dirname(out), { recursive:true });
  await writeFile(out, json);
  console.log(`Wrote property report to ${out}`);
}
console.log(json);

if (failures.length) process.exitCode = 1;
