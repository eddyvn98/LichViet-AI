import {
  $, $$, api, escapeHtml, selectedFamilyPayload, shortDay, state, toast
} from "./core.js";

function splitList(value) {
  return String(value || "")
    .split(/[,
]+/)
    .map(x => x.trim())
    .filter(Boolean);
}

function readConstraints() {
  return {
    dayType:$("#planDayType").value || "any",
    avoidLunarDays:splitList($("#avoidLunarDays").value)
      .map(Number)
      .filter(x => Number.isInteger(x)),
    excludeDates:splitList($("#excludeDates").value),
    avoidJieTransition:$("#avoidJieTransition").checked
  };
}

function updateFamilyNote() {
  const count = state.selectedFamilyIds.length;
  $("#plannerFamilyNote").textContent = count
    ? `Đang xét ${count} thành viên đã tick trong tab Gia đình & Bát Tự.`
    : "Không chọn thành viên; planner chỉ dùng rule chung.";
}

function feedbackButtons(d) {
  const trace = d.recommendationDecision?.trace?.hash || "";
  const decision = d.recommendationDecision?.code || "";
  if (!trace) return "";
  return '<div class="feedback-actions">' +
    '<button class="ghost compact" data-feedback="agree" data-date="' +
      escapeHtml(d.date) + '" data-trace="' + escapeHtml(trace) +
      '" data-decision="' + escapeHtml(decision) + '">✓ Hợp lý</button>' +
    '<button class="ghost compact" data-feedback="review" data-date="' +
      escapeHtml(d.date) + '" data-trace="' + escapeHtml(trace) +
      '" data-decision="' + escapeHtml(decision) + '">⚑ Cần rà</button>' +
  '</div>';
}

function candidateCard(d, i, compare = false) {
  const decision = d.recommendationDecision || {};
  const supportCount = decision.supports?.length || 0;
  const cautionCount = decision.cautions?.length || 0;
  const vetoCount = decision.vetoes?.length || 0;
  const familyText = d.family
    ? ' · gia đình ' + d.family.availableCount + '/' + d.family.memberCount
    : '';
  const eligibility = d.eligible === false
    ? '<p class="note">' +
      escapeHtml(d.constraintEvaluation?.failures?.map(x => x.detail).join(" · ") || "Bị loại bởi ràng buộc") +
      '</p>'
    : '';

  return '<article class="plan-card">' +
    '<div class="plan-date"><b>' + (compare ? "•" : "#" + (i + 1)) +
      '</b><small>' + escapeHtml(shortDay(d.date)) + '</small></div>' +
    '<div><h3>' + escapeHtml(d.verdict.label) + ' · ngày ' +
      escapeHtml(d.canChi.day) + '</h3>' +
      eligibility +
      '<p>' + escapeHtml(d.reasons?.[0] || "") + '</p>' +
      '<p>Trực ' + escapeHtml(d.duty) + ' · ' + escapeHtml(d.ecliptic) +
      familyText + '</p>' +
      '<small class="decision-line">Decision: ' +
      escapeHtml(decision.code || "—") + ' · support ' + supportCount +
      ' · caution ' + cautionCount + ' · veto ' + vetoCount + '</small><br>' +
      '<small class="policy-line">Policy: ' +
      escapeHtml(decision.policy?.id || "—") +
      ' · score: tie-break-only</small><br>' +
      '<small class="rule-line">Rule: ' +
      (d.rankingProvenance || []).map(r => escapeHtml(r.id)).join(" · ") +
      '</small>' +
      feedbackButtons(d) +
    '</div>' +
    '<span class="badge">' + escapeHtml(d.match) + '</span>' +
  '</article>';
}

function bindFeedback() {
  $$("[data-feedback]").forEach(button => {
    button.onclick = async () => {
      try {
        await api("/api/feedback", {
          method:"POST",
          body:{
            feedback:button.dataset.feedback,
            date:button.dataset.date,
            activity:$("#activity").value,
            decision:button.dataset.decision,
            traceHash:button.dataset.trace
          }
        });
        toast(button.dataset.feedback === "agree"
          ? "Đã ghi nhận: kết quả hợp lý."
          : "Đã lưu để rà lại rule/evidence.");
      } catch (e) {
        toast(e.message);
      }
    };
  });
}

export async function findDays() {
  updateFamilyNote();
  $("#planLoading").hidden = false;
  $("#planResults").innerHTML = "";

  try {
    const data = await api("/api/plan", {
      method:"POST",
      body:{
        activity:$("#activity").value,
        from:$("#planFrom").value,
        days:Number($("#planDays").value || 14),
        profiles:selectedFamilyPayload(),
        constraints:readConstraints()
      }
    });

    $("#planResults").innerHTML = data.results.length
      ? data.results.map((d,i) => candidateCard(d,i)).join("")
      : '<p class="note">Không còn ngày nào sau khi áp dụng các ràng buộc đã chọn.</p>';
    bindFeedback();
  } catch (e) {
    $("#planResults").innerHTML = '<p class="note">' + escapeHtml(e.message) + '</p>';
  } finally {
    $("#planLoading").hidden = true;
  }
}

export async function compareSelectedDays() {
  updateFamilyNote();
  const dates = splitList($("#compareDates").value);
  if (dates.length < 2) return toast("Nhập ít nhất 2 ngày để so sánh.");

  $("#planLoading").hidden = false;
  $("#planResults").innerHTML = "";

  try {
    const data = await api("/api/compare", {
      method:"POST",
      body:{
        activity:$("#activity").value,
        dates,
        profiles:selectedFamilyPayload(),
        constraints:readConstraints()
      }
    });

    const winner = data.winner
      ? '<div class="mini-card"><b>Ưu tiên trong nhóm so sánh:</b> ' +
        escapeHtml(data.winner.date) + ' · ' + escapeHtml(data.winner.match) +
        '<p class="meta">' + escapeHtml(data.explanation || "") + '</p></div>'
      : '<div class="mini-card">' + escapeHtml(data.explanation || "Không có ngày nào vượt qua ràng buộc.") + '</div>';

    $("#planResults").innerHTML = winner +
      data.candidates.map((d,i) => candidateCard(d,i,true)).join("");
    bindFeedback();
  } catch (e) {
    $("#planResults").innerHTML = '<p class="note">' + escapeHtml(e.message) + '</p>';
  } finally {
    $("#planLoading").hidden = true;
  }
}

export function refreshPlannerFamilyNote() {
  updateFamilyNote();
}
