import {
  $, $$, api, escapeHtml, profileQuery, renderItems, shortDay, state, vnDate
} from "./core.js";

function verdictColor(code) {
  return code === "good" ? "#55745e" : code === "careful" ? "#9d625c" : "#aa884e";
}

function renderGlossary() {
  const wanted = ["12 Trực", "Hoàng đạo / Hắc đạo", "Xung tuổi", "Tiết khí"];
  $("#glossaryInline").innerHTML = state.meta.glossary
    .filter(x => wanted.includes(x.term))
    .map(x =>
      '<div class="glossary-pill"><b>' + escapeHtml(x.term) +
      '</b><small>' + escapeHtml(x.definition) + '</small></div>'
    ).join("");
}

function renderPersonal(d) {
  if (!d.personal) {
    $("#personalLine").innerHTML =
      "<b>Cá nhân:</b> chưa có hồ sơ; kết quả hiện là mức chung.";
    return;
  }

  const signals = d.personal.signals.slice(0, 2).map(x =>
    '<span class="signal ' + x.level + '">' + escapeHtml(x.label) + '</span>'
  ).join(" ");

  $("#personalLine").innerHTML =
    "<b>Cá nhân:</b> " + escapeHtml(d.personal.summary) + " · " + signals;
}

async function loadWeek(from, onSelect) {
  const data = await api("/api/range?from=" + from + "&days=7" + profileQuery());
  $("#week").innerHTML = data.days.map(d =>
    '<button class="week-day ' + d.verdict.code + '" data-date="' + d.date + '">' +
      '<b>' + escapeHtml(shortDay(d.date).split(",")[0]) + '</b>' +
      '<small>' + d.date.slice(8, 10) + "/" + d.date.slice(5, 7) + '</small>' +
      '<small>' + escapeHtml(d.verdict.label) + '</small>' +
    '</button>'
  ).join("");

  $$(".week-day").forEach(b => {
    b.onclick = () => onSelect(b.dataset.date);
  });
}

export async function loadDay() {
  const date = $("#date").value;
  $("#dayLoading").hidden = false;
  $("#dayContent").hidden = true;

  try {
    const d = await api("/api/day?date=" + date + profileQuery());
    $("#weekday").textContent = vnDate(d.date);
    $("#verdict").textContent = d.verdict.label;
    $("#statusDot").style.background = verdictColor(d.verdict.code);
    $("#summaryMeta").textContent =
      "Âm " + d.lunar.day + "/" + d.lunar.month + (d.lunar.leap ? " nhuận" : "") +
      " · ngày " + d.canChi.day + " · " + d.solarTerm + " · Trực " + d.duty;

    renderItems($("#recommended"), d.recommended);
    renderItems($("#avoid"), d.avoid);

    $("#goodHours").innerHTML = d.goodHours.map(h =>
      '<div class="hour-chip"><b>' + h.range + '</b><small>' +
      h.branch + " · " + h.star + '</small></div>'
    ).join("");

    $("#traditionalLine").innerHTML =
      "<b>Hệ truyền thống:</b> Trực " + escapeHtml(d.duty) + " · " +
      escapeHtml(d.twelveStar) + " · " + escapeHtml(d.ecliptic) + ".";
    renderPersonal(d);

    $("#confidenceLine").innerHTML =
      "<b>Độ tin cậy:</b> lịch " + d.confidence.calendar +
      "; quy tắc: " + escapeHtml(d.confidence.traditionalRules) +
      ". Rule: " + (d.provenance.ruleIds.map(escapeHtml).join(", ") || "—");

    $("#disclaimer").textContent = d.disclaimer;
    renderGlossary();

    $("#dayLoading").hidden = true;
    $("#dayContent").hidden = false;

    await loadWeek(date, selected => {
      $("#date").value = selected;
      loadDay();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  } catch (e) {
    $("#dayLoading").textContent = e.message;
  }
}
