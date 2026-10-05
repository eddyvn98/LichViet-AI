import test from "node:test";
import assert from "node:assert/strict";
import { analyzeBirthProfile } from "../src/bazi-profile.js";
import { buildBrief } from "../src/brief.js";
import { evaluateDuty, allRules, relationRule } from "../src/rule-engine.js";

test("rule catalog keeps canonical source separate from product-policy provenance", () => {
  const rules = allRules();
  assert.ok(rules.length >= 24);
  assert.ok(rules.every(r => r.id && r.locator && r.verification));
  const duties = rules.filter(r => r.kind === "duty");
  const canonical = rules.filter(r => r.kind !== "duty");
  assert.ok(canonical.every(r => r.source));
  assert.ok(duties.every(r => r.evidence?.level === "PRODUCT_POLICY"));
  assert.ok(duties.every(r =>
    r.evidence?.records?.some(x => x.id === "XLKY-12-DUTY-CLASSIFICATION")
  ));
});

test("Thành duty is preferred for contract in V2 normalized rules", () => {
  const x = evaluateDuty("成", "contract");
  assert.ok(x.score > 8);
  assert.ok(x.ruleIds.includes("DUTY-CHENG"));
  assert.ok(x.reasons.length > 0);
});

test("branch relation rules are machine readable", () => {
  assert.equal(relationRule("clash", "卯", "酉")?.id, "REL-MAO-YOU");
  assert.equal(relationRule("harmony", "子", "丑")?.id, "HARM-ZI-CHOU");
});

test("advanced profile exposes day master, elements and ten gods", () => {
  const p = analyzeBirthProfile("2026-10-04", "12:00");
  assert.equal(p.dayMaster.name, "Tân");
  assert.equal(p.dayMaster.element, "Kim");
  assert.equal(p.pillars.length, 4);
  assert.equal(p.tenGods[2].relation, "Nhật chủ");
  const total = Object.values(p.elements).reduce((s, x) => s + x.pct, 0);
  assert.ok(total >= 98 && total <= 102);
});

test("advanced profile still refuses to invent unknown hour", () => {
  const p = analyzeBirthProfile("2026-10-04", "");
  assert.equal(p.birthTime, null);
  assert.equal(p.pillars.length, 3);
  assert.equal(p.completeness, "three-pillars");
});

test("daily brief proactively scans saved plans", () => {
  const brief = buildBrief({
    date: "2026-10-04",
    profile: null,
    plans: [{
      id: "p1",
      title: "Ký hợp đồng",
      activity: "contract",
      from: "2026-10-04",
      to: "2026-10-11"
    }]
  });
  assert.equal(brief.generatedBy, "deterministic-brief-v4");
  assert.ok(brief.headline);
  assert.ok(Array.isArray(brief.alerts));
  assert.ok(brief.alerts.length >= 1);
  assert.equal(brief.alerts[0].title, "Ký hợp đồng");
});

test("V6 rules expose policy-locked evidence metadata", () => {
  const rules = allRules();
  assert.ok(rules.every(r => r.evidence?.level && Number.isFinite(r.evidence?.rank)));
  const duty = rules.find(r => r.id === "DUTY-CHENG");
  assert.equal(duty?.evidence?.level, "PRODUCT_POLICY");
  assert.equal(duty?.evidence?.strongClaim, false);
  assert.equal(duty?.evidence?.supportingEvidenceLevel, "PRIMARY_EXACT");
  assert.ok(duty?.evidence?.records?.some(x =>
    x.family === "xingli-kaoyuan"
  ));
});


test("daily brief resolves plan participant IDs against family profiles", () => {
  const profiles = [
    { ...analyzeBirthProfile("1995-04-14", "12:00"), id:"a", name:"A" },
    { ...analyzeBirthProfile("1997-11-17", "12:00"), id:"b", name:"B" }
  ];
  const brief = buildBrief({
    date:"2026-10-04",
    profiles,
    plans:[{
      id:"family-plan",
      title:"Việc gia đình",
      activity:"meeting",
      from:"2026-10-04",
      to:"2026-10-11",
      participantIds:["a","b"]
    }]
  });
  assert.equal(brief.generatedBy, "deterministic-brief-v4");
  assert.ok(brief.alerts.length >= 1);
  assert.equal(brief.alerts[0].familyMemberCount, 2);
});


test("deleted family participant is not replaced by active profile", () => {
  const active = analyzeBirthProfile("1995-04-14", "12:00");
  const brief = buildBrief({
    date:"2026-10-04",
    profile:active,
    profiles:[],
    plans:[{
      id:"stale-plan",
      title:"Kế hoạch cũ",
      activity:"meeting",
      from:"2026-10-04",
      to:"2026-10-11",
      participantIds:["deleted-member"]
    }]
  });
  assert.ok(brief.alerts.length >= 1);
  assert.equal(brief.alerts[0].familyMemberCount, 0);
  assert.equal(brief.alerts[0].unresolvedParticipantCount, 1);
});
