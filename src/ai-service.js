import { runGemini, geminiConfig } from "./gemini-cli.js";

function compact(value, limit = 12000) {
  const text = JSON.stringify(value);
  return text.length <= limit ? text : text.slice(0, limit) + "...";
}

function basePolicy() {
  return [
    "Bạn là lớp diễn giải của ứng dụng Lịch Việt AI.",
    "Chỉ dùng dữ liệu deterministic trong CONTEXT.",
    "Không tự tính lại âm lịch, Can Chi, Bát Tự, ngày tốt/xấu hoặc giờ tốt.",
    "Không thay đổi verdict, rule ID, confidence hoặc provenance.",
    "Không nói các hệ cát/hung là sự thật khoa học.",
    "Viết ngắn, rõ, dùng từ phổ thông.",
    "Không nói mơ hồ hoặc cao siêu.",
    "Không dùng các từ kiểu: năng lượng, vận khí, cát khí, thiên thời, vũ trụ, khai mở.",
    "Không giảng dài về thuật ngữ trừ khi user hỏi.",
    "Không gọi tool, không đọc file, không chạy lệnh hệ thống.",
    "Không đề xuất model hoặc dịch vụ AI khác."
  ].join("\n");
}

export function aiStatus() {
  return geminiConfig();
}

export async function explainWithGemini({ context, question = "" }) {
  if (!context) throw new Error("Thiếu context deterministic");

  const prompt = [
    basePolicy(),
    "",
    "CONTEXT:",
    compact(context),
    "",
    "YÊU CẦU USER:",
    question.trim() ||
      "Tóm tắt điều nên làm, nên tránh và lý do chính.",
    "",
    "YÊU CẦU CÁCH VIẾT:",
    "- Tối đa 80 từ.",
    "- Tối đa 3 ý.",
    "- Câu ngắn, đọc lướt được.",
    "- Nói kết luận trước, lý do sau.",
    "- Không mở đầu bằng lời chào.",
    "",
    "Chỉ trả phần trả lời cho người dùng."
  ].join("\n");

  return runGemini(prompt);
}

export async function rewriteBriefWithGemini(brief) {
  const prompt = [
    basePolicy(),
    "",
    "CONTEXT DAILY BRIEF:",
    compact(brief),
    "",
    "Viết lại thành bản tin rất ngắn.",
    "Tối đa 60 từ và tối đa 4 dòng.",
    "Ưu tiên cảnh báo kế hoạch nếu có.",
    "Không thêm ngày hoặc kết luận mới.",
    "Không mở đầu bằng lời chào.",
    "Chỉ trả phần bản tin."
  ].join("\n");

  return runGemini(prompt);
}
