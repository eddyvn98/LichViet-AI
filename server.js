import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { birthProfile } from "./src/bazi.js";
import { ACTIVITIES, rangeDays, rankDays } from "./src/planner.js";
import { buildDayInfo, publicDay } from "./src/traditional.js";

const publicRoot = fileURLToPath(new URL("./public/", import.meta.url));
const sources = JSON.parse(await readFile(new URL("./data/sources.json", import.meta.url), "utf8"));
const glossary = JSON.parse(await readFile(new URL("./data/glossary.json", import.meta.url), "utf8"));
const port = Number(process.env.PORT || 3000);

function todayVN() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

function json(res, status, value, cache = "no-store") {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": cache,
    "x-content-type-options": "nosniff"
  });
  res.end(JSON.stringify(value));
}

function profileFrom(url) {
  const birth = url.searchParams.get("birth");
  if (!birth) return null;
  return birthProfile(birth, url.searchParams.get("birthTime") || "");
}

function queryDate(url, key = "date") {
  return url.searchParams.get(key) || todayVN();
}

async function api(url, res) {
  if (url.pathname === "/api/health") {
    return json(res, 200, { ok: true, version: "1.0.0", calendar: "Vietnam UTC+7" });
  }

  if (url.pathname === "/api/day") {
    const info = buildDayInfo(queryDate(url), profileFrom(url));
    return json(res, 200, publicDay(info), "public, max-age=300");
  }

  if (url.pathname === "/api/range") {
    const data = rangeDays({
      from: queryDate(url, "from"),
      days: url.searchParams.get("days") || 7,
      profile: profileFrom(url)
    });
    return json(res, 200, { days: data });
  }

  if (url.pathname === "/api/plan") {
    const activity = url.searchParams.get("activity") || "contract";
    const data = rankDays({
      from: queryDate(url, "from"),
      days: url.searchParams.get("days") || 14,
      activity,
      profile: profileFrom(url)
    });
    return json(res, 200, {
      activity: { id: activity, label: ACTIVITIES[activity]?.label || activity },
      results: data
    });
  }

  if (url.pathname === "/api/profile") {
    const p = profileFrom(url);
    if (!p) return json(res, 400, { error: "Cần ngày sinh" });
    return json(res, 200, p);
  }

  if (url.pathname === "/api/meta") {
    return json(res, 200, {
      activities: Object.entries(ACTIVITIES).map(([id, x]) => ({ id, label: x.label })),
      glossary,
      sources
    }, "public, max-age=3600");
  }

  return false;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

async function staticFile(pathname, res) {
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const file = resolve(publicRoot, relative);
  const safeRoot = resolve(publicRoot) + sep;
  if (file !== resolve(publicRoot, "index.html") && !file.startsWith(safeRoot)) {
    throw new Error("Đường dẫn không hợp lệ");
  }
  const body = await readFile(file);
  res.writeHead(200, {
    "content-type": MIME[extname(file)] || "application/octet-stream",
    "cache-control": extname(file) === ".html" ? "no-cache" : "public, max-age=3600",
    "x-content-type-options": "nosniff"
  });
  res.end(body);
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      const handled = await api(url, res);
      if (handled !== false) return;
      return json(res, 404, { error: "Không tìm thấy API" });
    }
    await staticFile(url.pathname, res);
  } catch (error) {
    const status = error.code === "ENOENT" ? 404 : 400;
    json(res, status, { error: error.message || "Có lỗi xảy ra" });
  }
}).listen(port, () => console.log(`LichViet AI v1 listening on ${port}`));
