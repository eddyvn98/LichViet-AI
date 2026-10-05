import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analyzeBirthProfile } from "../src/bazi-profile.js";
import { buildFamilyDailySummary } from "../src/family-daily.js";
import { writeJsonAtomic, readJsonFile } from "../src/atomic-json-store.js";

test("atomic JSON store writes parseable state", async () => {
  const dir = await mkdtemp(join(tmpdir(), "lichviet-v8-"));
  const path = join(dir, "state.json");
  try {
    await writeJsonAtomic(path, { version:8 });
    assert.equal(JSON.parse(await readFile(path, "utf8")).version, 8);
    assert.equal((await readJsonFile(path, {})).version, 8);
  } finally {
    await rm(dir, { recursive:true, force:true });
  }
});

test("family daily summary is deterministic and omits birth data", () => {
  const profiles = [
    { ...analyzeBirthProfile("1995-04-14","12:00"), id:"a", name:"A" },
    { ...analyzeBirthProfile("1997-11-17","12:00"), id:"b", name:"B" }
  ];
  const x = buildFamilyDailySummary({ date:"2026-10-04", profiles });
  assert.equal(x.policy.id, "family-daily-summary-v1");
  assert.equal(x.selectedCount, 2);
  assert.match(x.trace.hash, /^[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(x).includes("1995-04-14"), false);
});
