export const CONSTRAINT_POLICY = {
  id:"selection-constraints-v1",
  evidenceLevel:"PRODUCT_POLICY",
  note:"Ràng buộc là sở thích/thực tế của gia đình, không phải quy tắc cổ điển."
};

function isoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : null;
}

function weekdayOf(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone:"Asia/Ho_Chi_Minh",
    weekday:"short"
  }).format(new Date(date + "T12:00:00+07:00"));
  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(parts);
}

export function normalizeSelectionConstraints(input = {}) {
  const dayType = ["any","weekday","weekend"].includes(input.dayType)
    ? input.dayType
    : "any";
  const excludeDates = [...new Set(
    (Array.isArray(input.excludeDates) ? input.excludeDates : [])
      .map(isoDate).filter(Boolean)
  )].slice(0,120);
  const avoidLunarDays = [...new Set(
    (Array.isArray(input.avoidLunarDays) ? input.avoidLunarDays : [])
      .map(Number)
      .filter(x => Number.isInteger(x) && x >= 1 && x <= 30)
  )].sort((a,b) => a-b);

  return {
    dayType,
    excludeDates,
    avoidLunarDays,
    avoidJieTransition:Boolean(input.avoidJieTransition),
    policy:CONSTRAINT_POLICY
  };
}

export function evaluateSelectionConstraints(day, date, input = {}) {
  const constraints = normalizeSelectionConstraints(input);
  const failures = [];
  const weekday = weekdayOf(date);
  const weekend = weekday === 0 || weekday === 6;

  if (constraints.dayType === "weekend" && !weekend) {
    failures.push({
      code:"DAY_TYPE",
      detail:"Gia đình chỉ chọn cuối tuần."
    });
  }
  if (constraints.dayType === "weekday" && weekend) {
    failures.push({
      code:"DAY_TYPE",
      detail:"Gia đình chỉ chọn ngày trong tuần."
    });
  }
  if (constraints.excludeDates.includes(date)) {
    failures.push({
      code:"EXCLUDED_DATE",
      detail:"Ngày này nằm trong danh sách gia đình đã loại."
    });
  }
  if (constraints.avoidLunarDays.includes(Number(day?.lunar?.day))) {
    failures.push({
      code:"LUNAR_DAY",
      detail:`Gia đình đã chọn tránh ngày ${day.lunar.day} âm lịch.`
    });
  }
  if (constraints.avoidJieTransition && day?.dutyTransition) {
    failures.push({
      code:"JIE_TRANSITION",
      detail:"Gia đình đã chọn tránh ngày giao tiết."
    });
  }

  return {
    accepted:failures.length === 0,
    failures,
    constraints,
    weekday,
    weekend,
    policy:CONSTRAINT_POLICY
  };
}
