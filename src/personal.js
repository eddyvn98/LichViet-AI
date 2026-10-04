import { branchVi } from "./i18n.js";

const CLASH = {
  "子":"午","午":"子","丑":"未","未":"丑","寅":"申","申":"寅",
  "卯":"酉","酉":"卯","辰":"戌","戌":"辰","巳":"亥","亥":"巳"
};

const HARMONY = {
  "子":"丑","丑":"子","寅":"亥","亥":"寅","卯":"戌","戌":"卯",
  "辰":"酉","酉":"辰","巳":"申","申":"巳","午":"未","未":"午"
};

export function branchRelationship(birthYearBranch, dayBranch) {
  if (!birthYearBranch || !dayBranch) return null;
  if (CLASH[birthYearBranch] === dayBranch) {
    return {
      type: "clash",
      delta: -12,
      label: "Xung tuổi",
      detail: `Chi ngày ${branchVi(dayBranch)} xung với chi năm sinh ${branchVi(birthYearBranch)}.`
    };
  }
  if (HARMONY[birthYearBranch] === dayBranch) {
    return {
      type: "harmony",
      delta: 6,
      label: "Hợp tuổi",
      detail: `Chi ngày ${branchVi(dayBranch)} lục hợp với chi năm sinh ${branchVi(birthYearBranch)}.`
    };
  }
  return {
    type: "neutral",
    delta: 0,
    label: "Không xung trực tiếp",
    detail: "Không rơi vào cặp lục xung hoặc lục hợp cơ bản đang dùng trong MVP."
  };
}
