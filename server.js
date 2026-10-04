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
  "祭祀":"祭祀 / lễ cúng","安葬":"an táng","动土":"động thổ","破土":"phá thổ",
  "入宅":"nhập trạch","纳财":"nạp tài","订盟":"đính ước","开光":"khai quang"
};
const DUTY = {"建":"Kiến","除":"Trừ","满":"Mãn","平":"Bình","定":"Định","执":"Chấp","破":"Phá","危":"Nguy","成":"Thành","收":"Thu","开":"Khai","闭":"Bế"};
const STAR = {"青龙":"Thanh Long","明堂":"Minh Đường","天刑":"Thiên Hình","朱雀":"Chu Tước","金匮":"Kim Quỹ","天德":"Thiên Đức","白虎":"Bạch Hổ","玉堂":"Ngọc Đường","天牢":"Thiên Lao","玄武":"Huyền Vũ","司命":"Tư Mệnh","勾陈":"Câu Trần"};

function mapTaboos(items){ return items.map(x => VI[x.getName()] || x.getName()).slice(0,6); }

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
    canChi: sc,
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
