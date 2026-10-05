import { $, escapeHtml, toast } from "./core.js";

const SCHEMA = "lichviet-device-backup-v1";
const KEYS = [
  "lichviet.family.v1",
  "lichviet.family.selection.v1",
  "lichviet.family.active.v1",
  "lichviet.profile.v2",
  "lichviet.plans.v2",
  "lichviet.reminder.v2"
];

function exportBackup() {
  const data = {};
  for (const key of KEYS) {
    const raw = localStorage.getItem(key);
    if (raw !== null) data[key] = JSON.parse(raw);
  }
  const payload = JSON.stringify({
    schema:SCHEMA,
    version:1,
    exportedAt:new Date().toISOString(),
    data
  }, null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type:"application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "lichviet-backup-" + new Date().toISOString().slice(0,10) + ".json";
  a.click();
  URL.revokeObjectURL(url);
  toast("Đã tạo file backup.");
}

async function importBackup(file) {
  const parsed = JSON.parse(await file.text());
  if (parsed?.schema !== SCHEMA || !parsed.data || typeof parsed.data !== "object") {
    throw new Error("File backup không đúng định dạng.");
  }
  for (const key of KEYS) localStorage.removeItem(key);
  for (const [key,value] of Object.entries(parsed.data)) {
    if (KEYS.includes(key)) localStorage.setItem(key, JSON.stringify(value));
  }
  sessionStorage.setItem("lichviet.restore.notice","1");
  location.reload();
}

export async function loadOpsStatus() {
  const el = $("#opsStatus");
  if (!el) return;
  try {
    const r = await fetch("/api/ops/status");
    const d = await r.json();
    el.innerHTML =
      '<b>' + (d.ok ? "Sẵn sàng" : "Cần kiểm tra") + '</b>' +
      '<small>' + escapeHtml(d.engine) + ' · Node ' + escapeHtml(d.node) + '</small>' +
      '<small>' + (d.warnings?.length ? d.warnings.slice(0,3).map(escapeHtml).join(" · ") : "Không có cảnh báo runtime.") + '</small>';
  } catch (e) {
    el.textContent = e.message;
  }
}

export function setupDataTools() {
  $("#exportBackup").onclick = exportBackup;
  $("#importBackup").onclick = () => $("#importBackupFile").click();
  $("#importBackupFile").onchange = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { await importBackup(file); }
    catch (error) { toast(error.message); e.target.value = ""; }
  };
  if (sessionStorage.getItem("lichviet.restore.notice") === "1") {
    sessionStorage.removeItem("lichviet.restore.notice");
    toast("Đã khôi phục dữ liệu thiết bị.");
  }
  loadOpsStatus();
}
