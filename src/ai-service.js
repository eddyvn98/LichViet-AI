import { runGemini, geminiConfig } from "./gemini-cli.js";

function compact(value, limit = 16000) {
  const text = JSON.stringify(value);
  return text.length <= limit ? text : text.slice(0, limit) + "...";
}

function basePolicy() {
  return [
    "Bạn là lớp diễn giải của ứng dụng Lịch Việt AI Verified Engine.",
    "Chỉ dùng dữ liệu deterministic và evidence trong CONTEXT.",
    "Không tự tính lại âm lịch, Can Chi, Bát Tự, ngày tốt/xấu hoặc giờ tốt.",
    "Không tạo rule, nguồn, locator hoặc bằng chứng mới.",
    "Nếu CONTEXT không đủ để trả lời, nói rõ: Chưa đủ dữ liệu đã xác minh trong engine.",
    "Nếu user hỏi nguồn hoặc lý do, chỉ nêu source/rule/evidence/locator thật sự có trong CONTEXT; không suy đoán phần còn thiếu.",
    "Không thay đổi verdict, rule ID, confidence, provenance hoặc crossChecks.",
    "Đọc confidence.facts.code cho độ tin cậy facts; nếu disputed/low thì phải nói rõ đây là mức tham khảo/chưa đủ căn cứ.",
    "Nếu một cross-check có status disputed, phải nêu ngắn gọn rằng có bất đồng kỹ thuật.",
    "Nếu dutyTransition/eclipticTransition tồn tại, phải nói đây là ngày giao tiết và phân biệt trước/sau giờ chuyển.",
    "recommended/avoid có recommendationOrigin=tyme4ts-advisory chỉ là lớp tham khảo implementation, không được mô tả như fact canonical.",
    "Nguồn implementation không được mô tả như nguyên điển hay nguồn chính thức.",
    "Heuristic/EXPERIMENTAL không được diễn đạt như quy tắc cổ điển đã xác minh.",
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
  return {
    ...geminiConfig(),
    evidencePolicy:"verified-engine-v4"
  };
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
    "- Nếu user hỏi vì sao, ưu tiên rule ID + tên nguồn + mức tin cậy.",
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
    "Nếu evidence yếu hoặc disputed, dùng ngôn ngữ thận trọng.",
    "Không mở đầu bằng lời chào.",
    "Chỉ trả phần bản tin."
  ].join("\n");

  return runGemini(prompt);
}
