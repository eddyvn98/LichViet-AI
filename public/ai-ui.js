import { $, api, escapeHtml, profilePayload, toast } from "./core.js";

export async function askGemini() {
  const button = $("#askGemini");
  const answer = $("#aiAnswer");
  const question = $("#aiQuestion").value.trim();

  button.disabled = true;
  answer.hidden = false;
  answer.innerHTML = '<span class="note">Gemini 3.8 đang diễn giải dữ liệu engine…</span>';

  try {
    const result = await api("/api/ai/explain", {
      method: "POST",
      body: {
        date: $("#date").value,
        profile: profilePayload(),
        question
      }
    });

    answer.innerHTML =
      '<div class="ai-answer-text">' + escapeHtml(result.text) + '</div>' +
      '<small>' + escapeHtml(result.model) + ' · ' +
      escapeHtml(result.auth) + '</small>';
  } catch (error) {
    answer.innerHTML =
      '<span class="note">' + escapeHtml(error.message) + '</span>';
    toast("Gemini chưa sẵn sàng.");
  } finally {
    button.disabled = false;
  }
}
