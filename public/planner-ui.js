import { $, api, escapeHtml, profileQuery, shortDay } from "./core.js";

export async function findDays() {
  $("#planLoading").hidden = false;
  $("#planResults").innerHTML = "";

  const p = new URLSearchParams({
    activity: $("#activity").value,
    from: $("#planFrom").value,
    days: $("#planDays").value
  });

  try {
    const data = await api("/api/plan?" + p.toString() + profileQuery());
    $("#planResults").innerHTML = data.results.map((d, i) =>
      '<article class="plan-card">' +
        '<div class="plan-date"><b>#' + (i + 1) + '</b><small>' +
          escapeHtml(shortDay(d.date)) + '</small></div>' +
        '<div><h3>' + escapeHtml(d.verdict.label) + ' · ngày ' +
          escapeHtml(d.canChi.day) + '</h3>' +
          '<p>' + escapeHtml(d.reasons[0]) + '</p>' +
          '<p>Trực ' + escapeHtml(d.duty) + ' · ' + escapeHtml(d.ecliptic) +
          (d.personal ? ' · ' + escapeHtml(d.personal.summary) : '') + '</p>' +
          '<small class="rule-line">' +
          d.rankingProvenance.map(r => escapeHtml(r.id)).join(" · ") +
          '</small></div>' +
        '<span class="badge">' + escapeHtml(d.match) + '</span>' +
      '</article>'
    ).join("");
  } catch (e) {
    $("#planResults").innerHTML = '<p class="note">' + escapeHtml(e.message) + '</p>';
  } finally {
    $("#planLoading").hidden = true;
  }
}
