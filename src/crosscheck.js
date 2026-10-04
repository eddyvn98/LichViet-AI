import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { Solar } = require("lunar-javascript");

function parseIso(date, time = "12:00") {
  const [year, month, day] = String(date).split("-").map(Number);
  const [hour, minute] = String(time || "12:00").split(":").map(Number);
  return { year, month, day, hour: hour || 0, minute: minute || 0 };
}

function compareFields(actual, expected, fields) {
  const differences = [];
  for (const field of fields) {
    if (actual?.[field] !== expected?.[field]) {
      differences.push({
        field,
        engine: actual?.[field] ?? null,
        reference: expected?.[field] ?? null
      });
    }
  }
  return differences;
}

export function lunarJavascriptSnapshot(date, time = "12:00") {
  const { year, month, day, hour, minute } = parseIso(date, time);
  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();

  return {
    provider: "lunar-javascript",
    family: "6tail",
    role: "implementation-crosscheck",
    lunar: {
      year: lunar.getYear(),
      month: Math.abs(lunar.getMonth()),
      day: lunar.getDay(),
      leap: lunar.getMonth() < 0
    },
    bazi: {
      year: lunar.getYearInGanZhiExact(),
      month: lunar.getMonthInGanZhiExact(),
      day: lunar.getDayInGanZhi()
    }
  };
}

export function crossCheckDay({
  date,
  time = "12:00",
  vietnameseLunar,
  bazi,
  tymeAligned = null
}) {
  const ref = lunarJavascriptSnapshot(date, time);
  const baziDiff = compareFields(
    bazi?.raw || {},
    ref.bazi,
    ["year", "month", "day"]
  );
  const lunarDiff = compareFields(
    vietnameseLunar || {},
    ref.lunar,
    ["year", "month", "day", "leap"]
  );

  const results = [
    {
      id: "XCHK-BAZI-LUNARJS",
      provider: ref.provider,
      family: ref.family,
      scope: "bazi-year-month-day",
      status: baziDiff.length ? "disputed" : "agree",
      differences: baziDiff,
      note: "Đối chiếu implementation. Không thay thế engine chính."
    },
    {
      id: "XCHK-LUNAR-LUNARJS",
      provider: ref.provider,
      family: ref.family,
      scope: "lunar-calendar",
      status: lunarDiff.length ? "timezone-sensitive" : "agree",
      differences: lunarDiff,
      note: lunarDiff.length
        ? "Lịch Việt dùng UTC+7; implementation tham chiếu có thể theo quy ước lịch Trung Quốc. Sai khác không tự động được coi là lỗi."
        : "Kết quả ngày âm trùng implementation tham chiếu."
    }
  ];

  if (typeof tymeAligned === "boolean") {
    results.push({
      id: "XCHK-LUNAR-TYME4TS",
      provider: "tyme4ts",
      family: "6tail",
      scope: "lunar-calendar",
      status: tymeAligned ? "agree" : "timezone-sensitive",
      differences: [],
      note: "Tyme4TS thuộc cùng họ 6tail với lunar-javascript; không tính là nguồn độc lập thứ hai."
    });
  }

  return results;
}
