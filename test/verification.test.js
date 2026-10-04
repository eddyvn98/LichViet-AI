import test from "node:test";
import assert from "node:assert/strict";
import { crossCheckDay, lunarJavascriptSnapshot } from "../src/crosscheck.js";
import { assessEvidence, combineConfidence, evidenceRecordById, sourcePolicy } from "../src/evidence.js";
import { getBaZi, jieMonthTransitionForDate, solarTermMoment } from "../src/bazi.js";
import { solarToVietnameseLunar } from "../src/vietnamese-lunar.js";
import { verificationCases, verificationSummary } from "../src/verification.js";

test("source policy defines strong and experimental levels", () => {
  const policy = sourcePolicy();
  assert.equal(policy.levels.PRIMARY_EXACT.strongClaim, true);
  assert.equal(policy.levels.EXPERIMENTAL.strongClaim, false);
  assert.equal(policy.levels.PRODUCT_POLICY.strongClaim, false);
});

test("6tail reference snapshot exposes family identity", () => {
  const ref = lunarJavascriptSnapshot("2026-10-04", "12:00");
  assert.equal(ref.family, "6tail");
  assert.equal(ref.provider, "lunar-javascript");
  assert.ok(ref.bazi.day);
});

test("known BaZi date is cross-checked explicitly", () => {
  const date = "2026-10-04";
  const checks = crossCheckDay({
    date,
    time:"12:00",
    vietnameseLunar:solarToVietnameseLunar(date),
    bazi:getBaZi(date, "12:00"),
    tymeAligned:true
  });
  const bazi = checks.find(x => x.scope === "bazi-year-month-day");
  assert.ok(bazi);
  assert.ok(["agree","disputed"].includes(bazi.status));
  assert.equal(checks.filter(x => x.family === "6tail").length, 3);
});

test("dispute always blocks strong claims", () => {
  const confidence = assessEvidence({
    evidence:[{
      level:"PRIMARY_EXACT",
      rank:5,
      strongClaim:true,
      family:"xieji"
    }],
    crossChecks:[{
      id:"x",
      family:"reference-a",
      status:"disputed"
    }]
  });
  assert.equal(confidence.code, "disputed");
  assert.equal(confidence.canMakeStrongClaim, false);
});

test("verification registry is exposed", () => {
  const summary = verificationSummary();
  assert.equal(summary.mode, "verified-engine");
  assert.ok(summary.ruleCount >= 24);
  assert.ok(verificationCases().length >= 5);
});


test("knowledge base integrity passes", async () => {
  const { validateKnowledgeBase } = await import("../src/knowledge-validator.js");
  const result = validateKnowledgeBase();
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.ok(result.counts.evidenceRecords >= 10);
  assert.ok(result.counts.rules >= 35);
});

test("HKO official solar-term cases fit longitude tolerance", () => {
  const official = verificationCases().filter(x => x.kind === "solar-longitude-official");
  assert.ok(official.length >= 3);
  return import("../src/bazi.js").then(({ solarLongitudeDegrees }) => {
    for (const c of official) {
      const actual = solarLongitudeDegrees(c.date, c.time);
      const diff = Math.min(
        Math.abs(actual - c.expectedDegrees),
        360 - Math.abs(actual - c.expectedDegrees)
      );
      assert.ok(
        diff <= c.toleranceDegrees,
        `${c.id}: expected ${c.expectedDegrees}°, got ${actual}° (diff ${diff}°)`
      );
    }
  });
});

test("verified relation corpus includes harm, trine and stem combination", async () => {
  const { relationRule, rulesByKind, stemCombinationRule } = await import("../src/rule-engine.js");
  assert.equal(relationRule("harm", "子", "未")?.id, "HARMFUL-ZI-WEI");
  assert.equal(rulesByKind("trine").length, 4);
  assert.equal(stemCombinationRule("甲", "己")?.id, "STEM-COMB-JIA-JI");
});


test("hidden stems match the reviewed classical membership corpus", async () => {
  const { hiddenStemsForBranch } = await import("../src/bazi-profile.js");
  const expected = {
    "子":["癸"],"丑":["己","辛","癸"],"寅":["甲","丙","戊"],
    "卯":["乙"],"辰":["戊","乙","癸"],"巳":["丙","戊","庚"],
    "午":["丁","己"],"未":["丁","乙","己"],"申":["庚","壬","戊"],
    "酉":["辛"],"戌":["丁","辛","戊"],"亥":["壬","甲"]
  };
  for (const [branch, stems] of Object.entries(expected)) {
    const actual = hiddenStemsForBranch(branch);
    assert.deepEqual(actual.map(x => x.raw), stems);
    assert.ok(actual.every(x => x.weightStatus === "EXPERIMENTAL"));
  }
});

test("Ten-Gods mapping regression matches classical Yang/Jia row", async () => {
  const { tenGodForStem } = await import("../src/bazi-profile.js");
  const expected = {
    "甲":"Tỷ Kiên","乙":"Kiếp Tài","丙":"Thực Thần","丁":"Thương Quan",
    "戊":"Thiên Tài","己":"Chính Tài","庚":"Thất Sát","辛":"Chính Quan",
    "壬":"Thiên Ấn","癸":"Chính Ấn"
  };
  for (const [stem, label] of Object.entries(expected)) {
    assert.equal(tenGodForStem("甲", stem), label);
  }
});


test("solar-term solver stays close to HKO full-24 official times", async () => {
  const { solarTermMoment } = await import("../src/bazi.js");
  const cases = verificationCases().filter(x =>
    x.evidenceRef === "HKO-2015-ALL-24-TERMS"
  );
  assert.equal(cases.length, 24);
  for (const c of cases) {
    const actual = solarTermMoment(2015, c.expectedDegrees);
    const expectedMs = Date.parse(`${c.date}T${c.time}:00+07:00`);
    const diffMinutes = Math.abs(actual.epochMs - expectedMs) / 60000;
    assert.ok(
      diffMinutes <= 30,
      `${c.id}: solver differs from HKO by ${diffMinutes.toFixed(1)} minutes`
    );
  }
});


test("Twelve-Duty engine follows complete branch-offset cycle", async () => {
  const { calculateTwelveDuty, TWELVE_DUTIES } = await import("../src/twelve-duty.js");
  const branches = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    for (let offset = 0; offset < 12; offset += 1) {
      const dayIndex = (monthIndex + offset) % 12;
      const result = calculateTwelveDuty(branches[monthIndex], branches[dayIndex]);
      assert.equal(result.raw, TWELVE_DUTIES[offset]);
    }
  }
});


test("yellow-black path engine yields exactly six good deities and hours", async () => {
  const {
    calculateEclipticDay,
    eclipticHoursForDay,
    ECLIPTIC_DEITIES
  } = await import("../src/ecliptic.js");
  const branches = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

  for (const anchor of branches) {
    const dayResults = branches.map(day => calculateEclipticDay(anchor, day));
    assert.deepEqual(
      dayResults.map(x => x.deity).sort(),
      [...ECLIPTIC_DEITIES].sort()
    );
    assert.equal(dayResults.filter(x => x.good).length, 6);

    const hours = eclipticHoursForDay(anchor);
    assert.equal(hours.length, 12);
    assert.equal(hours.filter(x => x.good).length, 6);
  }
});

test("BaZi rejects nonexistent Gregorian dates", () => {
  assert.throws(() => getBaZi("2026-02-31", "12:00"), /không tồn tại/i);
});


test("confidence applicability prevents unrelated official evidence from elevating a domain", () => {
  const result = assessEvidence({
    evidence:[
      evidenceRecordById("VN-UTC7-OFFICIAL"),
      evidenceRecordById("VN-LUNAR-HND-ALGORITHM")
    ],
    crossChecks:[],
    strongClaimApplicabilities:["modern-vietnamese-lunar-calculation"]
  });
  assert.equal(result.code, "medium");
  assert.equal(result.canMakeStrongClaim, false);
});

test("timezone-sensitive cross-check qualifies otherwise strong evidence", () => {
  const result = assessEvidence({
    evidence:[evidenceRecordById("XJ-HUANGHEI")],
    crossChecks:[{
      id:"tz",
      family:"reference",
      status:"timezone-sensitive"
    }]
  });
  assert.equal(result.code, "medium");
  assert.equal(result.canMakeStrongClaim, false);
  assert.deepEqual(result.qualifiedBy, ["tz"]);
});

test("combined confidence uses the weakest evidence domain", () => {
  const combined = combineConfidence({
    calendar:{ code:"medium", label:"calendar", canMakeStrongClaim:false },
    bazi:{ code:"high", label:"bazi", canMakeStrongClaim:true },
    traditional:{ code:"high", label:"traditional", canMakeStrongClaim:true }
  });
  assert.equal(combined.code, "medium");
  assert.equal(combined.weakestDomain, "calendar");
  assert.equal(combined.canMakeStrongClaim, false);
});

function vnLocalParts(epochMs) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone:"Asia/Ho_Chi_Minh",
    year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit",
    hour12:false
  }).formatToParts(new Date(epochMs));
  const pick = type => parts.find(x => x.type === type)?.value;
  return {
    date:`${pick("year")}-${pick("month")}-${pick("day")}`,
    time:`${pick("hour")}:${pick("minute")}`
  };
}

test("all 12 Jie boundaries switch BaZi month pillar across the exact moment", () => {
  const jieDegrees = [285,315,345,15,45,75,105,135,165,195,225,255];
  for (const degree of jieDegrees) {
    const moment = solarTermMoment(2015, degree);
    const before = vnLocalParts(moment.epochMs - 60_000);
    const after = vnLocalParts(moment.epochMs + 60_000);
    const beforeBazi = getBaZi(before.date, before.time);
    const afterBazi = getBaZi(after.date, after.time);
    assert.notEqual(
      beforeBazi.raw.month,
      afterBazi.raw.month,
      `${degree}° should switch month pillar at ${moment.iso}`
    );

    const transition = jieMonthTransitionForDate(moment.date);
    assert.ok(transition, `missing transition for ${moment.iso}`);
    assert.equal(transition.degree, degree);
    assert.equal(beforeBazi.branches.month, transition.previousMonthBranch);
    assert.equal(afterBazi.branches.month, transition.newMonthBranch);
  }
});


test("all twelve duty classification primary goldens are registered", async () => {
  const goldens = verificationCases().filter(x =>
    x.kind === "twelve-duty-primary-golden"
  );
  assert.equal(goldens.length, 12);
  const { allDutyClassifications } = await import("../src/rule-engine.js");
  const byRaw = new Map(allDutyClassifications().map(x => [x.raw,x]));
  for (const item of goldens) {
    const actual = byRaw.get(item.raw);
    assert.ok(actual, item.raw);
    assert.equal(actual.traditionalClass, item.expected.traditionalClass);
    assert.equal(actual.tier, item.expected.tier);
    assert.equal(actual.evidenceRef, item.evidenceRef);
  }
});

test("pre-2002 Vietnamese lunar result is explicitly proleptic historical reconstruction", () => {
  const historical = solarToVietnameseLunar("1900-01-01");
  const current = solarToVietnameseLunar("2026-10-04");
  assert.equal(historical.calculation.scope, "historical-proleptic-utc7");
  assert.equal(historical.calculation.historicalReconstruction, true);
  assert.ok(historical.calculation.historicalContextEvidenceRefs.includes(
    "VN-ARCHIVES-HIEPKY-XIEJI"
  ));
  assert.equal(current.calculation.scope, "official-current-utc7-reference");
  assert.equal(current.calculation.historicalReconstruction, false);
});
