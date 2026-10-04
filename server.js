import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeBirthProfile } from "./src/bazi-profile.js";
import { aiStatus, explainWithGemini, rewriteBriefWithGemini } from "./src/ai-service.js";
import { buildBrief } from "./src/brief.js";
import { ACTIVITIES, rangeDays, rankDays } from "./src/planner.js";
import { allRules } from "./src/rule-engine.js";
import { pushStatus, sendDailyPush, subscribePush, unsubscribePush } from "./src/push.js";
import { buildDayInfo, publicDay } from "./src/traditional.js";

const publicRoot = fileURLToPath(new URL("./public/", import.meta.url));
const sources = JSON.parse(await readFile(new URL("./data/sources.json", import.meta.url),"utf8"));
const glossary = JSON.parse(await readFile(new URL("./data/glossary.json", import.meta.url),"utf8"));
const port = Number(process.env.PORT || 3000);

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

function queryDate(url,key="date") {
  return url.searchParams.get(key) || todayVN();
}

async function api(req,url,res) {
  if (req.method === "GET" && url.pathname === "/api/health") {
    return json(res,200,{ ok:true, version:"2.1.0", calendar:"Vietnam UTC+7", push:pushStatus().enabled, ai:aiStatus() });
  }
  if (req.method === "GET" && url.pathname === "/api/day") {
    return json(res,200,publicDay(buildDayInfo(queryDate(url),profileFromQuery(url))),"public, max-age=300");
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
  if (req.method === "GET" && url.pathname === "/api/profile") {
    const profile = profileFromQuery(url);
    return profile ? json(res,200,profile) : json(res,400,{ error:"Cần ngày sinh" });
  }
  if (req.method === "GET" && url.pathname === "/api/meta") {
    return json(res,200,{
      activities:Object.entries(ACTIVITIES).map(([id,x]) => ({ id,label:x.label })),
      glossary,sources,ruleCount:allRules().length,push:pushStatus()
    },"public, max-age=3600");
  }
  if (req.method === "GET" && url.pathname === "/api/rules") {
    return json(res,200,{ rules:allRules() },"public, max-age=3600");
  }
  if (req.method === "POST" && url.pathname === "/api/brief") {
    const payload = await bodyJson(req);
    return json(res,200,buildBrief({
      date:payload.date || todayVN(),
      profile:profileFromPayload(payload.profile),
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
      plans:Array.isArray(payload.plans) ? payload.plans : []
    });
    return json(res,200,await rewriteBriefWithGemini(brief));
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
}).listen(port,() => console.log(`LichViet AI v2.1 listening on ${port}`));
