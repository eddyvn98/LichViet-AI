import { writeFile } from "node:fs/promises";
import { buildDayInfo, publicDay } from "../src/traditional.js";

function addDays(iso, amount) {
  const date = new Date(iso + "T12:00:00+07:00");
  date.setUTCDate(date.getUTCDate() + amount);
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
    from: args.from || "2026-01-01",
    days: Math.max(1, Math.min(Number(args.days) || 366, 3660)),
    out: args.out || ""
  };
}

const { from, days, out } = parseArgs();
const rows = [];
const summary = {
  from,
  days,
  checked:0,
  baziDisputes:0,
  lunarTimezoneSensitive:0,
  otherDisputes:0
};

for (let i = 0; i < days; i += 1) {
  const date = addDays(from, i);
  const day = publicDay(buildDayInfo(date));
  const checks = day.provenance.crossChecks || [];
  const noteworthy = checks.filter(x =>
    x.status === "disputed" || x.status === "timezone-sensitive"
  );

  summary.checked += 1;
  for (const check of noteworthy) {
    if (check.scope === "bazi-year-month-day" && check.status === "disputed") {
      summary.baziDisputes += 1;
    } else if (check.scope === "lunar-calendar" && check.status === "timezone-sensitive") {
      summary.lunarTimezoneSensitive += 1;
    } else {
      summary.otherDisputes += 1;
    }
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
  engine:"verified-engine-v3",
  summary,
  cases:rows
};

const json = JSON.stringify(report, null, 2);
if (out) {
  await writeFile(out, json);
  console.log(`Wrote ${rows.length} noteworthy cases to ${out}`);
}
console.log(json);
