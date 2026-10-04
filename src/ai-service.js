import { runGemini, geminiConfig } from "./gemini-cli.js";

function compact(value, limit = 12000) {
  const text = JSON.stringify(value);
  return text.length <= limit ? text : text.slice(0, limit) + "...";
}

function basePolicy() {
  return [
    "Bạn là lớp diễn giải duy nhất của ứng dụng Lịch Việt AI.",
    "Chỉ được dùng dữ liệu deterministic được cung cấp trong CONTEXT.",
    "Không tự tính lại âm lịch, Can Chi, Bát Tự, ngày tốt/xấu hay giờ tốt.",
    "Không được thay đổi verdict, rule ID, confidence hoặc provenance.",
    "Không nói các hệ cát/hung là sự thật khoa học.",
    "Nếu dữ liệu ghi tham khảo hoặc heuristic thì phải giữ đúng mức độ đó.",
    "Không gọi tool, không đọc file, không thực hiện lệnh hệ thống.",
    "Trả lời bằng tiếng Việt đời thường, ngắn gọn và dễ hiểu.",
    "Khi user hỏi vì sao, có thể nhắc rule/provenance có trong CONTEXT.",
    "Không được đề xuất dùng model hay dịch vụ AI khác."
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
      "Giải thích kết quả trên trong 3-6 câu, ưu tiên điều nên làm, nên tránh và lý do.",
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
    "Viết lại thành bản tin cá nhân 2-5 câu.",
    "Không thêm ngày hoặc kết luận mới.",
    "Nếu có alert kế hoạch thì ưu tiên nó.",
    "Chỉ trả phần bản tin."
  ].join("\n");

  return runGemini(prompt);
}
