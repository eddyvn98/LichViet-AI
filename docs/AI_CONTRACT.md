# AI Contract

AI là lớp diễn giải, không phải calculator.

## AI được phép

- Tóm tắt JSON từ `/api/day`, `/api/range`, `/api/plan`.
- Giải thích thuật ngữ từ `/api/meta`.
- Chuyển kết quả thành lời nhắc ngắn.
- Hỏi user loại việc và khoảng ngày.

## AI không được phép

- Tự tạo Can Chi, âm lịch, tiết khí, Bát Tự hoặc ngày tốt/xấu.
- Nâng mức “tham khảo” thành “chắc chắn”.
- Nói cát/hung là kết luận khoa học.
- Đoán giờ sinh.
- Giấu xung đột nguồn.

## Daily brief gợi ý

Chỉ dùng:
- `verdict.label`
- tối đa 2 `recommended`
- tối đa 1 `avoid`
- 1–2 `goodHours`
- `personal` nếu có

Không hiển thị bảng thần sát dài ở màn hình chính.
