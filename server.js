import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeBirthProfile } from "./src/bazi-profile.js";
import { solarTermsForYear } from "./src/bazi.js";
import { aiStatus, explainWithGemini, rewriteBriefWithGemini } from "./src/ai-service.js";
import { buildBrief } from "./src/brief.js";
import { ACTIVITIES, compareDays, rangeDays, rankDays } from "./src/planner.js";
import { allActivityPolicies, allDutyClassifications, allRules } from "./src/rule-engine.js";
import { verificationCases, verificationSummary } from "./src/verification.js";
import { allEvidenceRecords } from "./src/evidence.js";
import { pushStatus, sendDailyPush, subscribePush, unsubscribePush } from "./src/push.js";
import { buildDayInfo, publicDay } from "./src/traditional.js";
import { vietnameseLunarToSolar, vietnameseLunarYearStructure } from "./src/vietnamese-lunar.js";
import { telegramStatus } from "./src/telegram.js";
import { listSelectionFeedback, saveSelectionFeedback } from "./src/selection-feedback.js";
import { engineManifest } from "./src/version.js";
import {
  getNotificationSettings,
  saveNotificationSettings
} from "./src/notification-store.js";
import {
  sendDueTelegramNotification,
  startLocalNotificationScheduler
} from "./src/notification-service.js";

const publicRoot = fileURLToPath(new URL("./public/", import.meta.url));
const sources = JSON.parse(await readFile(new URL("./data/sources.json", import.meta.url),"utf8"));
const glossary = JSON.parse(await readFile(new URL("./data/glossary.json", import.meta.url),"utf8"));
const port = Number(process.env.PORT || 3000);
const manifest = engineManifest();

function todayVN() {
  return new Intl.DateTimeFormat("en-CA",{ timeZone:"Asia/Ho_Chi_Minh" }).format(new Date());
}

function json(res,status,value,cache="no-store") {
  res.writeHead(status,{
    "content-type":"application/json; charset=utf-8",
    "cache-control":cache,
    "x-content-type-options":"nosniff"
  });
  res.end(JSON.stringify(value));
}

async function bodyJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Payload quá lớn");
  }
  return body ? JSON.parse(body) : {};
}

function profileFromQuery(url) {
  const birth = url.searchParams.get("birth");
  return birth ? analyzeBirthProfile(birth,url.searchParams.get("birthTime") || "") : null;
}

function profileFromPayload(payload) {
  if (!payload?.birthDate) return null;
  return analyzeBirthProfile(payload.birthDate,payload.birthTime || "");
}

function profilesFromPayload(payload) {
  const input = Array.isArray(payload) ? payload.slice(0,8) : [];
  return input
    .filter(item => item?.birthDate)
    .map((item,index) => ({
      ...analyzeBirthProfile(item.birthDate,item.birthTime || ""),
      id:String(item.id || `member-${index + 1}`).slice(0,80),
      name:String(item.name || `Thành viên ${index + 1}`).slice(0,40)
    }));
}

function queryDate(url,key="date") {
  return url.searchParams.get(key) || todayVN();
}

async function api(req,url,res) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    return json(res,200,{ ok:true, version:manifest.version, engine:manifest.engine, calendar:manifest.calendar, decisionPolicy:manifest.decisionPolicy, rankingPolicy:manifest.rankingPolicy, push:pushStatus().enabled, ai:aiStatus(), telegram:telegramStatus() });
  }
  if (req.method === "GET" && url.pathname === "/api/day") {
    return json(res,200,publicDay(buildDayInfo(queryDate(url),profileFromQuery(url))),"public, max-age=300");
  }
  if (req.method === "GET" && url.pathname === "/api/solar-terms") {
    const year = Number(url.searchParams.get("year") || new Date().getFullYear());
    return json(res,200,{ year, terms:solarTermsForYear(year) },"public, max-age=86400");
  }
  if (req.method === "GET" && url.pathname === "/api/lunar-year") {
    const year = Number(url.searchParams.get("year") || new Date().getFullYear());
    return json(res,200,vietnameseLunarYearStructure(year),"public, max-age=86400");
  }
  if (req.method === "POST" && url.pathname === "/api/convert/lunar-to-solar") {
    const payload = await bodyJson(req);
    return json(res,200,vietnameseLunarToSolar({
      day:payload.day,
      month:payload.month,
      year:payload.year,
      leap:Boolean(payload.leap)
    }));
  }
  if (req.method === "GET" && url.pathname === "/api/range") {
    return json(res,200,{ days:rangeDays({
      from:queryDate(url,"from"),days:url.searchParams.get("days") || 7,profile:profileFromQuery(url)
    })});
  }
  if (req.method === "GET" && url.pathname === "/api/plan") {
    const activity = url.searchParams.get("activity") || "contract";
    return json(res,200,{
      activity:{ id:activity,label:ACTIVITIES[activity]?.label || activity },
      results:rankDays({
        from:queryDate(url,"from"),days:url.searchParams.get("days") || 14,
        activity,profile:profileFromQuery(url)
      })
    });
  }
  if (req.method === "POST" && url.pathname === "/api/plan") {
    const payload = await bodyJson(req);
    const activity = payload.activity || "contract";
    return json(res,200,{
      activity:{ id:activity,label:ACTIVITIES[activity]?.label || activity },
      results:rankDays({
        from:payload.from || todayVN(),
        days:payload.days || 14,
        activity,
        profile:profileFromPayload(payload.profile),
        profiles:profilesFromPayload(payload.profiles),
        constraints:payload.constraints || {}
      })
    });
  }
  if (req.method === "POST" && url.pathname === "/api/compare") {
    const payload = await bodyJson(req);
    return json(res,200,compareDays({
      dates:Array.isArray(payload.dates) ? payload.dates : [],
      activity:payload.activity || "contract",
      profile:profileFromPayload(payload.profile),
      profiles:profilesFromPayload(payload.profiles),
      constraints:payload.constraints || {}
    }));
  }
  if (req.method === "GET" && url.pathname === "/api/profile") {
    const profile = profileFromQuery(url);
    return profile ? json(res,200,profile) : json(res,400,{ error:"Cần ngày sinh" });
  }
  if (req.method === "GET" && url.pathname === "/api/meta") {
    return json(res,200,{
      activities:Object.entries(ACTIVITIES).map(([id,x]) => ({ id,label:x.label })),
      glossary,sources,ruleCount:allRules().length,
      decisionPolicy:manifest.decisionPolicy,
      rankingPolicy:manifest.rankingPolicy,
      verification:verificationSummary(),push:pushStatus()
    },"public, max-age=3600");
  }
  if (req.method === "GET" && url.pathname === "/api/rules") {
    return json(res,200,{ rules:allRules() },"public, max-age=3600");
  }
  if (req.method === "GET" && url.pathname === "/api/duty-classification") {
    return json(res,200,{ duties:allDutyClassifications() },"public, max-age=3600");
  }
  if (req.method === "GET" && url.pathname === "/api/activity-policies") {
    return json(res,200,{ policies:allActivityPolicies() },"public, max-age=3600");
  }
  if (req.method === "GET" && url.pathname === "/api/evidence") {
    const id = url.searchParams.get("id");
    const claimType = url.searchParams.get("claimType");
    let records = allEvidenceRecords();
    if (id) records = records.filter(x => x.id === id);
    if (claimType) records = records.filter(x => x.claimType === claimType);
    return json(res,200,{ records },"public, max-age=3600");
  }
  if (req.method === "GET" && url.pathname === "/api/sources") {
    return json(res,200,{ sources },"public, max-age=3600");
  }
  if (req.method === "GET" && url.pathname === "/api/verification") {
    return json(res,200,verificationSummary(),"public, max-age=3600");
  }
  if (req.method === "GET" && url.pathname === "/api/verification/cases") {
    return json(res,200,{ cases:verificationCases() },"public, max-age=3600");
  }
  if (req.method === "POST" && url.pathname === "/api/brief") {
    const payload = await bodyJson(req);
    return json(res,200,buildBrief({
      date:payload.date || todayVN(),
      profile:profileFromPayload(payload.profile),
      profiles:profilesFromPayload(payload.profiles),
      plans:Array.isArray(payload.plans) ? payload.plans : []
    }));
  }
  if (req.method === "GET" && url.pathname === "/api/ai/status") {
    return json(res,200,aiStatus(),"public, max-age=60");
  }
  if (req.method === "POST" && url.pathname === "/api/ai/explain") {
    const payload = await bodyJson(req);
    const date = payload.date || todayVN();
    const profile = profileFromPayload(payload.profile);
    const context = publicDay(buildDayInfo(date,profile));
    const question = String(payload.question || "").slice(0,1000);
    return json(res,200,await explainWithGemini({ context,question }));
  }
  if (req.method === "POST" && url.pathname === "/api/ai/brief") {
    const payload = await bodyJson(req);
    const brief = buildBrief({
      date:payload.date || todayVN(),
      profile:profileFromPayload(payload.profile),
      profiles:profilesFromPayload(payload.profiles),
      plans:Array.isArray(payload.plans) ? payload.plans : []
    });
    return json(res,200,await rewriteBriefWithGemini(brief));
  }
  if (req.method === "GET" && url.pathname === "/api/telegram/status") {
    return json(res,200,telegramStatus(),"public, max-age=60");
  }
  if (req.method === "POST" && url.pathname === "/api/feedback") {
    const payload = await bodyJson(req);
    return json(res,200,await saveSelectionFeedback(payload));
  }
  if (req.method === "GET" && url.pathname === "/api/feedback") {
    return json(res,200,{
      items:await listSelectionFeedback(url.searchParams.get("limit") || 50)
    });
  }
  if (req.method === "GET" && url.pathname === "/api/notifications/settings") {
    return json(res,200,await getNotificationSettings());
  }
  if (req.method === "POST" && url.pathname === "/api/notifications/settings") {
    const payload = await bodyJson(req);
    return json(res,200,await saveNotificationSettings(payload));
  }
  if (req.method === "POST" && url.pathname === "/api/notifications/run-now") {
    const secret = req.headers["x-cron-secret"] || "";
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return json(res,401,{ error:"Unauthorized" });
    }
    return json(res,200,await sendDueTelegramNotification(new Date()));
  }
  if (req.method === "GET" && url.pathname === "/api/push/config") {
    return json(res,200,pushStatus(),"public, max-age=300");
  }
  if (req.method === "POST" && url.pathname === "/api/push/subscribe") {
    const payload = await bodyJson(req);
    payload.profile = profileFromPayload(payload.profile);
    return json(res,200,await subscribePush(payload));
  }
  if (req.method === "POST" && url.pathname === "/api/push/unsubscribe") {
    const payload = await bodyJson(req);
    return json(res,200,await unsubscribePush(payload.endpoint));
  }
  if (req.method === "POST" && url.pathname === "/api/tasks/daily-push") {
    const secret = req.headers["x-cron-secret"] || "";
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return json(res,401,{ error:"Unauthorized" });
    }
    return json(res,200,await sendDailyPush(todayVN()));
  }
  return false;
}

const MIME={
  ".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",
  ".svg":"image/svg+xml",".webmanifest":"application/manifest+json; charset=utf-8"
};

async function staticFile(pathname,res) {
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\//,"");
  const file = resolve(publicRoot,relative);
  const safeRoot = resolve(publicRoot) + sep;
  if (file !== resolve(publicRoot,"index.html") && !file.startsWith(safeRoot)) {
    throw new Error("Đường dẫn không hợp lệ");
  }
  const body = await readFile(file);
  res.writeHead(200,{
    "content-type":MIME[extname(file)] || "application/octet-stream",
    "cache-control":extname(file) === ".html" ? "no-cache" : "public, max-age=3600",
    "x-content-type-options":"nosniff"
  });
  res.end(body);
}

http.createServer(async(req,res) => {
  try {
    const url = new URL(req.url,"http://localhost");
    if (url.pathname.startsWith("/api/")) {
      const handled = await api(req,url,res);
      if (handled !== false) return;
      return json(res,404,{ error:"Không tìm thấy API" });
    }
    await staticFile(url.pathname,res);
  } catch(error) {
    json(res,error.code === "ENOENT" ? 404 : 400,{ error:error.message || "Có lỗi xảy ra" });
  }
}).listen(port,() => {
  console.log(`LichViet AI ${manifest.version} ${manifest.engine} listening on ${port}`);
  startLocalNotificationScheduler();
});
