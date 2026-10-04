export const STEM = {
  "甲":"Giáp","乙":"Ất","丙":"Bính","丁":"Đinh","戊":"Mậu",
  "己":"Kỷ","庚":"Canh","辛":"Tân","壬":"Nhâm","癸":"Quý"
};

export const BRANCH = {
  "子":"Tý","丑":"Sửu","寅":"Dần","卯":"Mão","辰":"Thìn","巳":"Tỵ",
  "午":"Ngọ","未":"Mùi","申":"Thân","酉":"Dậu","戌":"Tuất","亥":"Hợi"
};

export const DUTY = {
  "建":"Kiến","除":"Trừ","满":"Mãn","平":"Bình","定":"Định","执":"Chấp",
  "破":"Phá","危":"Nguy","成":"Thành","收":"Thu","开":"Khai","闭":"Bế"
};

export const STAR = {
  "青龙":"Thanh Long","明堂":"Minh Đường","天刑":"Thiên Hình","朱雀":"Chu Tước",
  "金匮":"Kim Quỹ","天德":"Thiên Đức","白虎":"Bạch Hổ","玉堂":"Ngọc Đường",
  "天牢":"Thiên Lao","玄武":"Huyền Vũ","司命":"Tư Mệnh","勾陈":"Câu Trần"
};

export const TABOO = {
  "嫁娶":"cưới hỏi","订婚":"đính hôn","纳采":"lễ nạp thái","问名":"lễ vấn danh",
  "订盟":"đính ước","移徙":"chuyển nhà","入宅":"nhập trạch","安床":"an giường",
  "交易":"giao dịch","立券":"ký kết giấy tờ","开市":"khai trương","挂匾":"treo biển",
  "纳财":"nạp tài","求财":"cầu tài","置产":"mua sắm tài sản","买车":"mua xe",
  "出行":"xuất hành","赴任":"nhận chức","会亲友":"gặp người thân, bạn bè",
  "会友":"gặp gỡ bạn bè","见贵":"gặp người quan trọng","祈福":"cầu phúc",
  "祭祀":"lễ cúng","开光":"khai quang","斋醮":"lễ chay / cầu an",
  "求医":"khám chữa bệnh","治病":"chữa bệnh","探病":"thăm bệnh",
  "修造":"sửa chữa","动土":"động thổ","起基":"khởi nền","上梁":"cất nóc / thượng lương",
  "竖柱":"dựng cột","安门":"lắp cửa","拆卸":"tháo dỡ","造屋":"làm nhà",
  "盖屋":"làm mái / dựng nhà","造仓":"làm kho","修门":"sửa cửa","破土":"phá thổ",
  "安葬":"an táng","修坟":"sửa mộ","立碑":"dựng bia","入殓":"nhập liệm",
  "作灶":"làm bếp","出火":"di chuyển bếp / lửa","安机械":"lắp đặt máy móc",
  "栽种":"trồng cây","伐木":"đốn gỗ","牧养":"chăn nuôi","纳畜":"nuôi thêm gia súc",
  "开渠":"đào kênh","掘井":"đào giếng","开池":"đào ao","筑堤":"đắp đê",
  "造桥":"làm cầu","造船":"đóng thuyền","乘船":"đi thuyền","渡水":"qua đường thủy",
  "扫舍":"dọn dẹp nhà cửa","裁衣":"may cắt quần áo","理发":"cắt tóc",
  "入学":"nhập học","雇佣":"thuê nhân công","解除":"giải trừ / tháo bỏ",
  "捕捉":"đánh bắt","畋猎":"săn bắt","词讼":"kiện tụng",
  "诸事不宜":"không nên làm việc lớn","馀事勿取":"chỉ nên làm việc thường ngày"
};

export const SOLAR_TERMS = {
  0:"Xuân phân",15:"Thanh minh",30:"Cốc vũ",45:"Lập hạ",
  60:"Tiểu mãn",75:"Mang chủng",90:"Hạ chí",105:"Tiểu thử",
  120:"Đại thử",135:"Lập thu",150:"Xử thử",165:"Bạch lộ",
  180:"Thu phân",195:"Hàn lộ",210:"Sương giáng",225:"Lập đông",
  240:"Tiểu tuyết",255:"Đại tuyết",270:"Đông chí",285:"Tiểu hàn",
  300:"Đại hàn",315:"Lập xuân",330:"Vũ thủy",345:"Kinh trập"
};

export function pillarVi(raw) {
  if (!raw || raw.length < 2) return raw || "";
  return `${STEM[raw[0]] || raw[0]} ${BRANCH[raw[1]] || raw[1]}`;
}

export function pillarsVi(rawPillars) {
  return rawPillars.map(pillarVi);
}

export function translateTaboos(raw, limit = 6) {
  return raw.map(x => TABOO[x]).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, limit);
}

export function translateDuty(raw) { return DUTY[raw] || raw; }
export function translateStar(raw) { return STAR[raw] || raw; }
export function branchVi(raw) { return BRANCH[raw] || raw; }
