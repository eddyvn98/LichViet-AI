import { jdFromDate, sunLongitudeRadians } from "./vietnamese-lunar.js";
import { BRANCH, SOLAR_TERMS, STEM, pillarVi } from "./i18n.js";

const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const JIE_START = 315;
const JIE_STEP = 30;
const JIE_DEGREES = [285,315,345,15,45,75,105,135,165,195,225,255];
const TERM_CACHE = new Map();

function mod(n, m) { return ((n % m) + m) % m; }

function validateIsoDate(isoDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(isoDate || ""))) {
    throw new Error("Ngày không hợp lệ");
  }
  const [year, month, day] = isoDate.split("-").map(Number);
  if (year < 1800 || year > 2199 || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error("Ngày ngoài phạm vi 1800–2199");
  }
  const ms = Date.parse(`${isoDate}T12:00:00+07:00`);
  if (!Number.isFinite(ms)) throw new Error("Ngày không hợp lệ");
  const normalized = new Intl.DateTimeFormat("en-CA", {
    timeZone:"Asia/Ho_Chi_Minh"
  }).format(new Date(ms));
  if (normalized !== isoDate) throw new Error("Ngày dương không tồn tại");
  return { year, month, day };
}

function validateTime(time) {
  if (!/^\d{2}:\d{2}$/.test(time)) throw new Error("Giờ không hợp lệ");
  const [hour, minute] = time.split(":").map(Number);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error("Giờ không hợp lệ");
  }
  return { hour, minute };
}

function solarLongitudeAtMs(ms) {
  const jd = ms / 86400000 + 2440587.5;
  return sunLongitudeRadians(jd) * 180 / Math.PI;
}

export function solarLongitudeDegrees(isoDate, time = "12:00") {
  validateIsoDate(isoDate);
  const safeTime = /^\d{2}:\d{2}$/.test(time) ? time : "12:00";
  const ms = Date.parse(`${isoDate}T${safeTime}:00+07:00`);
  if (!Number.isFinite(ms)) throw new Error("Ngày hoặc giờ không hợp lệ");
  return solarLongitudeAtMs(ms);
}

function vnParts(ms) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone:"Asia/Ho_Chi_Minh",
    year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit", second:"2-digit",
    hour12:false
  }).formatToParts(new Date(ms));
  const pick = type => parts.find(x => x.type === type)?.value;
  return {
    date:`${pick("year")}-${pick("month")}-${pick("day")}`,
    time:`${pick("hour")}:${pick("minute")}:${pick("second")}`
  };
}

function arcContainsTarget(fromDeg, toDeg, targetDeg) {
  const forward = mod(toDeg - fromDeg, 360);
  const targetDistance = mod(targetDeg - fromDeg, 360);
  return forward <= 2 && targetDistance <= forward + 1e-9;
}

function signedAngle(angle, target) {
  return mod(angle - target + 180, 360) - 180;
}

export function solarTermMoment(year, targetDegree) {
  const y = Number(year);
  const target = Number(targetDegree);
  if (!Number.isInteger(y) || y < 1800 || y > 2199) {
    throw new Error("Năm tiết khí ngoài phạm vi 1800–2199");
  }
  if (!Number.isInteger(target) || target < 0 || target >= 360 || target % 15 !== 0) {
    throw new Error("Kinh độ tiết khí phải là bội số 15° từ 0 đến 345");
  }

  const cacheKey = `${y}:${target}`;
  if (TERM_CACHE.has(cacheKey)) return structuredClone(TERM_CACHE.get(cacheKey));

  const start = Date.parse(`${y}-01-01T00:00:00+07:00`);
  const end = Date.parse(`${y + 1}-01-01T00:00:00+07:00`);
  const step = 6 * 60 * 60 * 1000;
  let loMs = start;
  let loDeg = solarLongitudeAtMs(loMs);

  for (let hiMs = start + step; hiMs <= end; hiMs += step) {
    const hiDeg = solarLongitudeAtMs(hiMs);
    if (arcContainsTarget(loDeg, hiDeg, target)) {
      let lo = loMs;
      let hi = hiMs;
      for (let i = 0; i < 48; i += 1) {
        const mid = (lo + hi) / 2;
        if (signedAngle(solarLongitudeAtMs(mid), target) < 0) lo = mid;
        else hi = mid;
      }
      const epochMs = Math.round((lo + hi) / 2);
      const parts = vnParts(epochMs);
      const result = {
        year:y,
        degree:target,
        term:SOLAR_TERMS[target] || "",
        epochMs,
        date:parts.date,
        time:parts.time,
        iso:`${parts.date}T${parts.time}+07:00`,
        timezone:"Asia/Ho_Chi_Minh",
        longitude:Number(solarLongitudeAtMs(epochMs).toFixed(6)),
        evidenceRefs:["HKO-24-SOLAR-TERMS"],
        method:"solar-longitude-bisection"
      };
      TERM_CACHE.set(cacheKey, result);
      return structuredClone(result);
    }
    loMs = hiMs;
    loDeg = hiDeg;
  }

  throw new Error(`Không tìm thấy tiết khí ${target}° trong năm ${y}`);
}

export function solarTermsForYear(year) {
  const order = [
    285,300,315,330,345,0,15,30,45,60,75,90,
    105,120,135,150,165,180,195,210,225,240,255,270
  ];
  return order.map(degree => solarTermMoment(year, degree));
}

export function jieMonthTransitionForDate(isoDate) {
  const { year } = validateIsoDate(isoDate);
  for (const degree of JIE_DEGREES) {
    const moment = solarTermMoment(year, degree);
    if (moment.date !== isoDate) continue;

    const shifted = mod(degree - JIE_START, 360);
    const solarMonth = Math.floor(shifted / JIE_STEP) + 1;
    const newMonthBranchIndex = mod(2 + solarMonth - 1, 12);
    const previousMonthBranchIndex = mod(newMonthBranchIndex - 1, 12);

    return {
      date:isoDate,
      degree,
      term:moment.term,
      moment,
      previousMonthBranch:BRANCHES[previousMonthBranchIndex],
      newMonthBranch:BRANCHES[newMonthBranchIndex],
      method:"exact-jie-moment",
      evidenceRefs:["HKO-24-SOLAR-TERMS"]
    };
  }
  return null;
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
  const { year, month, day } = validateIsoDate(isoDate);
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

export function birthPillarUncertainty(isoDate, options = {}) {
  validateIsoDate(isoDate);
  const start = getBaZi(isoDate, "00:00", options);
  const end = getBaZi(isoDate, "23:59", options);
  const fields = ["year", "month", "day"];
  const candidates = Object.fromEntries(fields.map(field => [
    field,
    [...new Set([start.raw[field], end.raw[field]])]
  ]));
  const ambiguousFields = fields.filter(field => candidates[field].length > 1);

  return {
    ambiguous:ambiguousFields.length > 0,
    requiresBirthTime:ambiguousFields.length > 0,
    ambiguousFields,
    candidates,
    window:{
      start:"00:00",
      end:"23:59",
      timezone:"Asia/Ho_Chi_Minh"
    },
    reason:ambiguousFields.length
      ? "Ngày sinh đi qua ranh giới trụ trong ngày; cần giờ sinh để chốt trụ chính xác."
      : null
  };
}

export function birthProfile(birthDate, birthTime = "", options = {}) {
  if (!birthDate) return null;
  const hasTime = /^\d{2}:\d{2}$/.test(birthTime);
  const bazi = getBaZi(birthDate, hasTime ? birthTime : "12:00", options);
  const uncertainty = hasTime ? null : birthPillarUncertainty(birthDate, options);
  const display = field => uncertainty?.candidates?.[field]?.length > 1
    ? uncertainty.candidates[field].map(pillarVi).join(" / ")
    : bazi.vi[field];

  return {
    birthDate,
    birthTime:hasTime ? birthTime : null,
    pillars:hasTime
      ? [bazi.vi.year, bazi.vi.month, bazi.vi.day, bazi.vi.hour]
      : [display("year"), display("month"), display("day")],
    rawPillars:hasTime
      ? [bazi.raw.year, bazi.raw.month, bazi.raw.day, bazi.raw.hour]
      : [bazi.raw.year, bazi.raw.month, bazi.raw.day],
    pillarUncertainty:uncertainty,
    yearBranch:uncertainty?.ambiguousFields.includes("year")
      ? null
      : bazi.branches.year,
    yearBranchVi:uncertainty?.ambiguousFields.includes("year")
      ? null
      : BRANCH[bazi.branches.year],
    boundary:bazi.boundary,
    calculation:bazi.calculation,
    note:hasTime
      ? "Đủ 4 trụ theo giờ sinh đã nhập."
      : uncertainty?.ambiguous
        ? "Chưa có giờ sinh và ngày sinh đi qua ranh giới tiết khí; app giữ các trụ có thể xảy ra, không tự chốt theo 12:00."
        : "Chưa có giờ sinh nên chỉ hiển thị 3 trụ; app không tự đoán giờ."
  };
}
