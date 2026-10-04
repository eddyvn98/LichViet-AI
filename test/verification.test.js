import test from "node:test";
import assert from "node:assert/strict";
import { crossCheckDay, lunarJavascriptSnapshot } from "../src/crosscheck.js";
import { assessEvidence, sourcePolicy } from "../src/evidence.js";
import { getBaZi } from "../src/bazi.js";
import { solarToVietnameseLunar } from "../src/vietnamese-lunar.js";
import { verificationCases, verificationSummary } from "../src/verification.js";

test("source policy defines strong and experimental levels", () => {
  const policy = sourcePolicy();
  assert.equal(policy.levels.PRIMARY_EXACT.strongClaim, true);
  assert.equal(policy.levels.EXPERIMENTAL.strongClaim, false);
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
