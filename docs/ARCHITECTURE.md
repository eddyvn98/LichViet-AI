# Kiến trúc V0.1

1. **Deterministic calendar engine**: Tyme4TS, không gọi LLM.
2. **Rule normalization**: dịch thuật ngữ sang tiếng Việt và giữ tên gốc khi chưa chắc.
3. **UX score**: điểm tóm tắt do sản phẩm định nghĩa, không giả làm chỉ số cổ truyền.
4. **Evidence**: mỗi kết quả phải truy được engine/rule/source.
5. **AI layer (sau MVP)**: chỉ giải thích, hỏi đáp và tạo Daily Brief từ JSON engine.
6. **Proactive layer (sau MVP)**: web push/email dựa trên lịch đã tính trước.

## Mục tiêu kiểm thử tiếp theo
- Golden cases đối chiếu lịch âm và Can Chi.
- Boundary cases ở Lập Xuân/tiết khí và 23:00/00:00.
- Đối chiếu từng rule nghi/kỵ với nguyên điển trước khi gắn nhãn verified.
