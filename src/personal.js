import { branchVi } from "./i18n.js";

const CLASH = {
  "子":"午","午":"子","丑":"未","未":"丑","寅":"申","申":"寅",
  "卯":"酉","酉":"卯","辰":"戌","戌":"辰","巳":"亥","亥":"巳"
};

const HARMONY = {
  "子":"丑","丑":"子","寅":"亥","亥":"寅","卯":"戌","戌":"卯",
  "辰":"酉","酉":"辰","巳":"申","申":"巳","午":"未","未":"午"
};

const HARM = {
  "子":"未","未":"子","丑":"午","午":"丑","寅":"巳","巳":"寅",
  "卯":"辰","辰":"卯","申":"亥","亥":"申","酉":"戌","戌":"酉"
};

export function branchRelationship(referenceBranch, dayBranch) {
  if (!referenceBranch || !dayBranch) return null;
  if (CLASH[referenceBranch] === dayBranch) {
    return {
      type:"clash",
      suggestedDelta:-12,
      label:"Lục xung",
      detail:`Chi ngày ${branchVi(dayBranch)} lục xung với chi tham chiếu ${branchVi(referenceBranch)}.`
    };
  }
  if (HARMONY[referenceBranch] === dayBranch) {
    return {
      type:"harmony",
      suggestedDelta:6,
      label:"Lục hợp",
      detail:`Chi ngày ${branchVi(dayBranch)} lục hợp với chi tham chiếu ${branchVi(referenceBranch)}.`
    };
  }
  if (HARM[referenceBranch] === dayBranch) {
    return {
      type:"harm",
      suggestedDelta:0,
      label:"Lục hại",
      detail:`Chi ngày ${branchVi(dayBranch)} thuộc cặp lục hại với chi tham chiếu ${branchVi(referenceBranch)}; hiện chỉ hiển thị tham khảo, không cộng/trừ điểm.`
    };
  }
  return {
    type:"neutral",
    suggestedDelta:0,
    label:"Không có quan hệ trực tiếp",
    detail:"Không rơi vào Lục xung, Lục hợp hoặc Lục hại trong corpus đang bật."
  };
}
