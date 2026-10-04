const PI = Math.PI;
const TZ_VIETNAM = 7;
const MIN_SUPPORTED_YEAR = 1800;
const MAX_SUPPORTED_YEAR = 2199;

export function jdFromDate(day, month, year) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  let jd = day + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) {
    jd = day + Math.floor((153 * m + 2) / 5) + 365 * y +
      Math.floor(y / 4) - 32083;
  }
  return jd;
}

export function jdToDate(jd) {
  let a, b, c, d, e, m;
  if (jd > 2299160) {
    a = jd + 32044;
    b = Math.floor((4 * a + 3) / 146097);
    c = a - Math.floor(b * 146097 / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  d = Math.floor((4 * c + 3) / 1461);
  e = c - Math.floor(1461 * d / 4);
  m = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * m + 2) / 5) + 1;
  const month = m + 3 - 12 * Math.floor(m / 10);
  const year = b * 100 + d - 4800 + Math.floor(m / 10);
  return { year, month, day };
}

function isoDate({ year, month, day }) {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0")
  ].join("-");
}

function parseSolarIso(value, { allowBoundaryYear = false } = {}) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) throw new Error("Ngày dương không hợp lệ");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const maxYear = allowBoundaryYear ? MAX_SUPPORTED_YEAR + 1 : MAX_SUPPORTED_YEAR;

  if (year < MIN_SUPPORTED_YEAR || year > maxYear ||
      month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Ngày ngoài phạm vi ${MIN_SUPPORTED_YEAR}–${MAX_SUPPORTED_YEAR}`);
  }

  const normalized = jdToDate(jdFromDate(day, month, year));
  if (normalized.year !== year || normalized.month !== month || normalized.day !== day) {
    throw new Error("Ngày dương không tồn tại");
  }
  return { year, month, day };
}

function calculationMeta(iso) {
  return {
    mode:"astronomical-UTC+7",
    timezone:"Asia/Ho_Chi_Minh",
    historicalReconstruction:false,
    scope:iso >= "2002-10-14"
      ? "official-current-utc7-reference"
      : "historical-proleptic-utc7",
    scopeNote:iso >= "2002-10-14"
      ? "UTC+7 được gắn với Quyết định 134/2002/QĐ-TTg; engine dùng quy tắc thiên văn hiện đại."
      : "Engine tính lùi theo quy tắc thiên văn UTC+7 hiện đại; không khẳng định đây là lịch đã được ban hành tại mọi vùng trong lịch sử.",
    evidenceRefs:["VN-UTC7-OFFICIAL","VN-LUNAR-HND-ALGORITHM"]
  };
}

function newMoon(k) {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = PI / 180;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 -
    0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);

  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;

  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr);
  C1 += 0.0021 * Math.sin(2 * M * dr);
  C1 -= 0.4068 * Math.sin(Mpr * dr);
  C1 += 0.0161 * Math.sin(2 * Mpr * dr);
  C1 -= 0.0004 * Math.sin(3 * Mpr * dr);
  C1 += 0.0104 * Math.sin(2 * F * dr);
  C1 -= 0.0051 * Math.sin((M + Mpr) * dr);
  C1 -= 0.0074 * Math.sin((M - Mpr) * dr);
  C1 += 0.0004 * Math.sin((2 * F + M) * dr);
  C1 -= 0.0004 * Math.sin((2 * F - M) * dr);
  C1 -= 0.0006 * Math.sin((2 * F + Mpr) * dr);
  C1 += 0.0010 * Math.sin((2 * F - Mpr) * dr);
  C1 += 0.0005 * Math.sin((2 * Mpr + M) * dr);

  const deltaT = T < -11
    ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 -
      0.000000081 * T * T3
    : -0.000278 + 0.000265 * T + 0.000262 * T2;

  return jd1 + C1 - deltaT;
}

export function sunLongitudeRadians(jdn) {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = PI / 180;
  const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 -
    0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL += (0.019993 - 0.000101 * T) * Math.sin(2 * dr * M);
  DL += 0.000290 * Math.sin(3 * dr * M);
  let L = (L0 + DL) * dr;
  L -= PI * 2 * Math.floor(L / (PI * 2));
  return L;
}

function newMoonDay(k, timezone) {
  return Math.floor(newMoon(k) + 0.5 + timezone / 24);
}

function sunLongitudeSector(dayNumber, timezone) {
  return Math.floor(
    sunLongitudeRadians(dayNumber - 0.5 - timezone / 24) / PI * 6
  );
}

function lunarMonth11(year, timezone) {
  const off = jdFromDate(31, 12, year) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = newMoonDay(k, timezone);
  if (sunLongitudeSector(nm, timezone) >= 9) nm = newMoonDay(k - 1, timezone);
  return nm;
}

function leapMonthOffset(a11, timezone) {
  const k = Math.floor(
    0.5 + (a11 - 2415021.076998695) / 29.530588853
  );
  let last = 0;
  let i = 1;
  let arc = sunLongitudeSector(newMoonDay(k + i, timezone), timezone);
  do {
    last = arc;
    i += 1;
    arc = sunLongitudeSector(newMoonDay(k + i, timezone), timezone);
  } while (arc !== last && i < 14);
  return i - 1;
}

export function solarToVietnameseLunar(value, timezone = TZ_VIETNAM) {
  const { year, month, day } = parseSolarIso(value, { allowBoundaryYear:true });
  const dayNumber = jdFromDate(day, month, year);
  const k = Math.floor(
    (dayNumber - 2415021.076998695) / 29.530588853
  );
  let monthStart = newMoonDay(k + 1, timezone);
  if (monthStart > dayNumber) monthStart = newMoonDay(k, timezone);

  let a11 = lunarMonth11(year, timezone);
  let b11 = a11;
  let lunarYear;

  if (a11 >= monthStart) {
    lunarYear = year;
    a11 = lunarMonth11(year - 1, timezone);
  } else {
    lunarYear = year + 1;
    b11 = lunarMonth11(year + 1, timezone);
  }

  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let lunarMonth = diff + 11;
  let isLeap = false;

  if (b11 - a11 > 365) {
    const leapDiff = leapMonthOffset(a11, timezone);
    if (diff >= leapDiff) {
      lunarMonth = diff + 10;
      if (diff === leapDiff) isLeap = true;
    }
  }

  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;

  return {
    year:lunarYear,
    month:lunarMonth,
    day:lunarDay,
    leap:isLeap,
    timezone,
    calculation:calculationMeta(value)
  };
}

export function vietnameseLunarToSolar(input, timezone = TZ_VIETNAM) {
  const lunarDay = Number(input?.day);
  const lunarMonth = Number(input?.month);
  const lunarYear = Number(input?.year);
  const lunarLeap = Boolean(input?.leap);

  if (!Number.isInteger(lunarDay) || lunarDay < 1 || lunarDay > 30 ||
      !Number.isInteger(lunarMonth) || lunarMonth < 1 || lunarMonth > 12 ||
      !Number.isInteger(lunarYear) ||
      lunarYear < MIN_SUPPORTED_YEAR || lunarYear > MAX_SUPPORTED_YEAR) {
    throw new Error("Ngày âm không hợp lệ");
  }

  let a11;
  let b11;
  if (lunarMonth < 11) {
    a11 = lunarMonth11(lunarYear - 1, timezone);
    b11 = lunarMonth11(lunarYear, timezone);
  } else {
    a11 = lunarMonth11(lunarYear, timezone);
    b11 = lunarMonth11(lunarYear + 1, timezone);
  }

  const k = Math.floor(
    0.5 + (a11 - 2415021.076998695) / 29.530588853
  );
  let off = lunarMonth - 11;
  if (off < 0) off += 12;

  if (b11 - a11 > 365) {
    const leapOff = leapMonthOffset(a11, timezone);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) leapMonth += 12;

    if (lunarLeap && lunarMonth !== leapMonth) {
      throw new Error("Tháng nhuận không khớp năm âm lịch");
    }
    if (lunarLeap || off >= leapOff) off += 1;
  } else if (lunarLeap) {
    throw new Error("Năm âm lịch này không có tháng nhuận đã chọn");
  }

  const monthStart = newMoonDay(k + off, timezone);
  const date = jdToDate(monthStart + lunarDay - 1);
  const iso = isoDate(date);
  const roundTrip = solarToVietnameseLunar(iso, timezone);

  if (roundTrip.day !== lunarDay ||
      roundTrip.month !== lunarMonth ||
      roundTrip.year !== lunarYear ||
      roundTrip.leap !== lunarLeap) {
    throw new Error("Ngày âm không tồn tại trong tháng đã chọn");
  }

  return {
    ...date,
    iso,
    timezone,
    lunar:{
      year:lunarYear,
      month:lunarMonth,
      day:lunarDay,
      leap:lunarLeap
    },
    calculation:calculationMeta(iso)
  };
}

export function vietnameseLunarYearStructure(
  lunarYear,
  timezone = TZ_VIETNAM
) {
  const year = Number(lunarYear);
  if (!Number.isInteger(year) ||
      year < MIN_SUPPORTED_YEAR || year >= MAX_SUPPORTED_YEAR) {
    throw new Error(
      `Năm âm phải trong phạm vi ${MIN_SUPPORTED_YEAR}–${MAX_SUPPORTED_YEAR - 1}`
    );
  }

  const startJd = jdFromDate(1, 1, year);
  const endJd = jdFromDate(31, 3, year + 1);
  const starts = [];

  for (let jd = startJd; jd <= endJd; jd += 1) {
    const solar = jdToDate(jd);
    const iso = isoDate(solar);
    const lunar = solarToVietnameseLunar(iso, timezone);
    if (lunar.day === 1 &&
        (lunar.year === year || lunar.year === year + 1)) {
      starts.push({ jd, iso, lunar });
    }
  }

  const target = starts.filter(x => x.lunar.year === year);
  const months = target.map(item => {
    const next = starts.find(x => x.jd > item.jd);
    if (!next) throw new Error("Không xác định được độ dài tháng âm");
    return {
      month:item.lunar.month,
      leap:item.lunar.leap,
      startDate:item.iso,
      days:next.jd - item.jd
    };
  });

  if (![12,13].includes(months.length) ||
      months.some(x => ![29,30].includes(x.days))) {
    throw new Error("Cấu trúc năm âm không hợp lệ");
  }

  const leapMonths = months.filter(x => x.leap);
  if (leapMonths.length > 1) {
    throw new Error("Một năm âm không thể có hơn một tháng nhuận");
  }

  return {
    year,
    timezone,
    monthCount:months.length,
    leapMonth:leapMonths[0]?.month || null,
    months,
    calculation:calculationMeta(`${year}-07-01`)
  };
}

export function vietnameseLunarLabel(lunar) {
  return `${lunar.day}/${lunar.month}/${lunar.year}${lunar.leap ? " (nhuận)" : ""}`;
}

export const VIETNAM_TIMEZONE = TZ_VIETNAM;
export const VIETNAM_LUNAR_RANGE = {
  minYear:MIN_SUPPORTED_YEAR,
  maxYear:MAX_SUPPORTED_YEAR
};
