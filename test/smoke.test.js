import test from "node:test";import assert from "node:assert/strict";import { SolarDay } from "tyme4ts";
test("Tyme4TS stable known case",()=>{const d=SolarDay.fromYmd(2023,10,19).getLunarDay();assert.equal(d.getDuty().getName(),"建")});
test("Leap lunar conversion known case",()=>{assert.match(SolarDay.fromYmd(2020,5,24).getLunarDay().toString(),/闰四月初二/)});
