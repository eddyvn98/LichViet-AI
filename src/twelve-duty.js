const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
export const TWELVE_DUTIES = ["建","除","满","平","定","执","破","危","成","收","开","闭"];

function indexOfBranch(branch) {
  const index = BRANCHES.indexOf(branch);
  if (index < 0) throw new Error("Địa Chi không hợp lệ");
  return index;
}

export function calculateTwelveDuty(monthBranch, dayBranch) {
  const monthIndex = indexOfBranch(monthBranch);
  const dayIndex = indexOfBranch(dayBranch);
  const offset = (dayIndex - monthIndex + 12) % 12;
  return {
    raw:TWELVE_DUTIES[offset],
    offset,
    monthBranch,
    dayBranch,
    method:"month-command-branch-offset",
    evidenceRefs:["SHUIHUDI-12-DUTIES"],
    note:"Ngày cùng chi với 月建/chi tháng tiết khí là Trực Kiến; các Trực tiếp tục theo thứ tự 12 chi."
  };
}
