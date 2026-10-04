import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SolarDay } from "tyme4ts";

const root = fileURLToPath(new URL("./public/", import.meta.url));
const port = Number(process.env.PORT || 3000);

const VI = {
  "嫁娶":"cưới hỏi","移徙":"chuyển nhà","交易":"giao dịch","开市":"khai trương",
  "安床":"an giường","修造":"sửa chữa","作灶":"làm bếp","求嗣":"cầu con",
  "求财":"cầu tài","出行":"xuất hành","赴任":"nhận chức","祈福":"cầu phúc",
  "祭祀":"lễ cúng","安葬":"an táng","动土":"động thổ","破土":"phá thổ",
  "入宅":"nhập trạch","纳财":"nạp tài","订盟":"đính ước","开光":"khai quang",
  "立券":"ký kết giấy tờ","安机械":"lắp đặt máy móc","出火":"di chuyển bếp / lửa",
  "造桥":"làm cầu","纳采":"lễ nạp thái","订婚":"đính hôn","问名":"lễ vấn danh",
  "安门":"lắp cửa","上梁":"cất nóc / thượng lương","竖柱":"dựng cột",
  "拆卸":"tháo dỡ","伐木":"đốn gỗ","扫舍":"dọn dẹp nhà cửa","放水":"xả nước",
  "开仓":"mở kho","置产":"mua sắm tài sản","买车":"mua xe","雇佣":"thuê nhân công",
  "栽种":"trồng cây","牧养":"chăn nuôi","入学":"nhập học","理发":"cắt tóc",
  "探病":"thăm bệnh","乘船":"đi thuyền","渡水":"qua sông / đường thủy",
  "求医":"khám chữa bệnh","治病":"chữa bệnh","会亲友":"gặp người thân, bạn bè",
  "纳畜":"nuôi thêm gia súc","捕捉":"đánh bắt","畋猎":"săn bắt","造船":"đóng thuyền",
  "开渠":"đào kênh","掘井":"đào giếng","筑堤":"đắp đê","开池":"đào ao",
  "造仓":"làm kho","造屋":"làm nhà","修门":"sửa cửa","挂匾":"treo biển",
  "裁衣":"may cắt quần áo","解除":"giải trừ / tháo bỏ","词讼":"kiện tụng",
  "诸事不宜":"không nên làm việc lớn","馀事勿取":"chỉ nên làm việc thường ngày"
};
const DUTY = {"建":"Kiến","除":"Trừ","满":"Mãn","平":"Bình","定":"Định","执":"Chấp","破":"Phá","危":"Nguy","成":"Thành","收":"Thu","开":"Khai","闭":"Bế"};
const STAR = {"青龙":"Thanh Long","明堂":"Minh Đường","天刑":"Thiên Hình","朱雀":"Chu Tước","金匮":"Kim Quỹ","天德":"Thiên Đức","白虎":"Bạch Hổ","玉堂":"Ngọc Đường","天牢":"Thiên Lao","玄武":"Huyền Vũ","司命":"Tư Mệnh","勾陈":"Câu Trần"};
const STEM = {"甲":"Giáp","乙":"Ất","丙":"Bính","丁":"Đinh","戊":"Mậu","己":"Kỷ","庚":"Canh","辛":"Tân","壬":"Nhâm","癸":"Quý"};
const BRANCH = {"子":"Tý","丑":"Sửu","寅":"Dần","卯":"Mão","辰":"Thìn","巳":"Tỵ","午":"Ngọ","未":"Mùi","申":"Thân","酉":"Dậu","戌":"Tuất","亥":"Hợi"};

function cycleName(stem, branch){ return `${STEM[stem] || stem} ${BRANCH[branch] || branch}`; }
function formatCanChi(raw){
  const m = raw.match(/^(.)(.)年(.)(.)月(.)(.)日$/u);
  if(!m) return raw;
  return `Năm ${cycleName(m[1],m[2])} · tháng ${cycleName(m[3],m[4])} · ngày ${cycleName(m[5],m[6])}`;
}

function mapTaboos(items){ return items.map(x => VI[x.getName()]).filter(Boolean).slice(0,6); }

function dayData(iso){
  const [y,m,d] = iso.split("-").map(Number);
  if(!y || !m || !d) throw new Error("Ngày không hợp lệ");
  const solar = SolarDay.fromYmd(y,m,d);
  const lunar = solar.getLunarDay();
  const duty = lunar.getDuty().getName();
  const star = lunar.getTwelveStar();
  const luck = star.getEcliptic().getLuck().getName();
  const sc = solar.getSixtyCycleDay().toString();
  const rec = mapTaboos(lunar.getRecommends());
  const avoid = mapTaboos(lunar.getAvoids());
  const score = Math.max(20, Math.min(90, 50 + (luck === "吉" ? 18 : -12) + (["成","开","定","满"].includes(duty) ? 12 : 0) - (["破","闭","危"].includes(duty) ? 12 : 0)));
  return {
    date: iso,
    lunar: { year:lunar.getYear(), month:lunar.getMonth(), day:lunar.getDay() },
    canChi: formatCanChi(sc),
    duty: DUTY[duty] || duty,
    twelveStar: STAR[star.getName()] || star.getName(),
    ecliptic: star.getEcliptic().getName() === "黄道" ? "Hoàng đạo" : "Hắc đạo",
    score,
    label: score >= 72 ? "Khá thuận" : score >= 52 ? "Trung tính" : "Nên thận trọng",
    recommended: rec.length ? rec : ["việc thường ngày"],
    avoid: avoid.length ? avoid : ["không có kiêng kỵ nổi bật trong bộ quy tắc hiện tại"],
    evidence: [
      {key:"tyme4ts", label:"Tyme4TS 1.5.3", note:"Tính lịch âm, Can Chi, 12 Trực, Hoàng/Hắc đạo và nghi/kỵ."},
      {key:"xieji", label:"Hiệp Kỷ / hệ chọn ngày truyền thống", note:"MVP dùng dữ liệu quy tắc do thư viện mã hóa; đang tiếp tục đối chiếu nguyên điển."}
    ],
    disclaimer:"Thông tin cát/hung là diễn giải theo hệ lịch truyền thống, không phải kết luận khoa học hay bảo đảm kết quả."
  };
}

const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml"};
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url, "http://localhost");
    if(url.pathname==="/api/health"){res.writeHead(200,{"content-type":"application/json"});return res.end(JSON.stringify({ok:true,version:"0.1.0"}));}
    if(url.pathname==="/api/day"){
      const date=url.searchParams.get("date")||new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh"}).format(new Date());
      res.writeHead(200,{"content-type":"application/json; charset=utf-8","cache-control":"public, max-age=300"});
      return res.end(JSON.stringify(dayData(date)));
    }
    const path=url.pathname==="/"?"index.html":url.pathname.replace(/^\//,"");
    const file=join(root,path);
    const body=await readFile(file);
    res.writeHead(200,{"content-type":mime[extname(file)]||"application/octet-stream"});
    res.end(body);
  }catch(e){
    res.writeHead(404,{"content-type":"application/json; charset=utf-8"});
    res.end(JSON.stringify({error:e.message}));
  }
});
server.listen(port,()=>console.log("LichViet AI listening on",port));
