import { jdFromDate, sunLongitudeRadians } from "./vietnamese-lunar.js";
import { BRANCH, SOLAR_TERMS, STEM, pillarVi } from "./i18n.js";

const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const JIE_START = 315;
const JIE_STEP = 30;

function mod(n, m) { return ((n % m) + m) % m; }

function validateTime(time) {
  if (!/^\d{2}:\d{2}$/.test(time)) throw new Error("Giờ không hợp lệ");
  const [hour, minute] = time.split(":").map(Number);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error("Giờ không hợp lệ");
  }
  return { hour, minute };
}

export function solarLongitudeDegrees(isoDate, time = "12:00") {
  const safeTime = /^\d{2}:\d{2}$/.test(time) ? time : "12:00";
  const ms = Date.parse(`${isoDate}T${safeTime}:00+07:00`);
  if (!Number.isFinite(ms)) throw new Error("Ngày hoặc giờ không hợp lệ");
  const jd = ms / 86400000 + 2440587.5;
  return sunLongitudeRadians(jd) * 180 / Math.PI;
}

function cycleFromYear(year) {
  return { stemIndex: mod(year + 6, 10), branchIndex: mod(year + 8, 12) };
}

function cycleRaw(stemIndex, branchIndex) {
  return STEMS[mod(stemIndex, 10)] + BRANCHES[mod(branchIndex, 12)];
}

function jieBoundary(longitude) {
  const shifted = mod(longitude - JIE_START, 360);
  const within = mod(shifted, JIE_STEP);
  const backward = within;
  const forward = JIE_STEP - within;
  const distance = Math.min(backward, forward);
  const nearestShifted = backward <= forward ? shifted - backward : shifted + forward;
  const nearestDegree = mod(JIE_START + nearestShifted, 360);
  return {
    nearestDegree:Number(nearestDegree.toFixed(3)),
    distanceDegrees:Number(distance.toFixed(3)),
    nearBoundary:distance <= 0.5,
    thresholdDegrees:0.5
  };
}

function civilDayJdn(day, month, year, hour, dayBoundary) {
  let jdn = jdFromDate(day, month, year);
  if (dayBoundary === "zi-hour" && hour >= 23) jdn += 1;
  return jdn;
}

export function getBaZi(isoDate, time = "12:00", options = {}) {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) throw new Error("Ngày không hợp lệ");
  const { hour } = validateTime(time);
  const dayBoundary = options.dayBoundary || "civil-midnight";
  if (!["civil-midnight","zi-hour"].includes(dayBoundary)) {
    throw new Error("dayBoundary không hợp lệ");
  }

  const longitude = solarLongitudeDegrees(isoDate, time);
  const baziYear = month <= 2 && longitude < 315 ? year - 1 : year;
  const yearCycle = cycleFromYear(baziYear);

  const shifted = mod(longitude - JIE_START, 360);
  const solarMonth = Math.floor(shifted / JIE_STEP) + 1;
  const monthBranch = mod(2 + solarMonth - 1, 12);
  const firstMonthStem = mod(yearCycle.stemIndex * 2 + 2, 10);
  const monthStem = mod(firstMonthStem + solarMonth - 1, 10);

  const jdn = civilDayJdn(day, month, year, hour, dayBoundary);
  const dayStem = mod(jdn + 9, 10);
  const dayBranch = mod(jdn + 1, 12);

  const hourBranch = mod(Math.floor((hour + 1) / 2), 12);
  const hourStem = mod((dayStem % 5) * 2 + hourBranch, 10);

  const termDeg = Math.floor(longitude / 15) * 15;
  const boundary = jieBoundary(longitude);
  const raw = {
    year:cycleRaw(yearCycle.stemIndex, yearCycle.branchIndex),
    month:cycleRaw(monthStem, monthBranch),
    day:cycleRaw(dayStem, dayBranch),
    hour:cycleRaw(hourStem, hourBranch)
  };

  return {
    raw,
    vi:{
      year:pillarVi(raw.year),
      month:pillarVi(raw.month),
      day:pillarVi(raw.day),
      hour:pillarVi(raw.hour)
    },
    branches:{
      year:raw.year[1],
      month:raw.month[1],
      day:raw.day[1],
      hour:raw.hour[1]
    },
    solarTerm:SOLAR_TERMS[termDeg] || "",
    solarLongitude:Number(longitude.toFixed(3)),
    boundary,
    calculation:{
      timezone:"Asia/Ho_Chi_Minh (UTC+7)",
      yearBoundary:"Lập xuân (315° kinh độ Mặt Trời)",
      monthBoundary:"12 tiết, mỗi 30° từ Lập xuân",
      dayBoundary:dayBoundary === "zi-hour"
        ? "23:00 (Tý sơ) theo tùy chọn trường phái"
        : "00:00 dân dụng (mặc định app)",
      hourMethod:"Ngũ thử độn",
      monthStemMethod:"Ngũ hổ độn",
      evidenceRefs:["HKO-24-SOLAR-TERMS","XJ-WUHU","XJ-WUSHU"],
      warning:boundary.nearBoundary
        ? "Thời điểm ở gần ranh giới tháng tiết khí; cần ưu tiên thời điểm tiết khí chính xác khi xác minh ca quan trọng."
        : null
    }
  };
}

export function birthProfile(birthDate, birthTime = "", options = {}) {
  if (!birthDate) return null;
  const hasTime = /^\d{2}:\d{2}$/.test(birthTime);
  const bazi = getBaZi(birthDate, hasTime ? birthTime : "12:00", options);
  return {
    birthDate,
    birthTime:hasTime ? birthTime : null,
    pillars:hasTime
      ? [bazi.vi.year, bazi.vi.month, bazi.vi.day, bazi.vi.hour]
      : [bazi.vi.year, bazi.vi.month, bazi.vi.day],
    rawPillars:hasTime
      ? [bazi.raw.year, bazi.raw.month, bazi.raw.day, bazi.raw.hour]
      : [bazi.raw.year, bazi.raw.month, bazi.raw.day],
    yearBranch:bazi.branches.year,
    yearBranchVi:BRANCH[bazi.branches.year],
    boundary:bazi.boundary,
    calculation:bazi.calculation,
    note:hasTime
      ? "Đủ 4 trụ theo giờ sinh đã nhập."
      : "Chưa có giờ sinh nên chỉ hiển thị 3 trụ; app không tự đoán giờ."
  };
}
