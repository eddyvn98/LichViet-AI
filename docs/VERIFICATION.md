# Verification

## Golden cases âm lịch Việt

Các ca sau được khóa bằng unit test và đối chiếu với lịch công khai dựa trên thuật toán Hồ Ngọc Đức:

| Dương lịch | Âm lịch |
|---|---|
| 2026-03-01 | 13/1/2026 |
| 2026-03-19 | 1/2/2026 |
| 2026-07-14 | 1/6/2026 |
| 2026-10-04 | 24/8/2026 |

Nguồn tham chiếu được ghi trong `data/sources.json`.

## Bát Tự

Ca khóa:
- 2026-10-04 12:00 UTC+7
- Năm: Bính Ngọ
- Tháng: Đinh Dậu
- Ngày: Tân Hợi
- Tiết đang hiệu lực: Thu phân

## Quy tắc chọn ngày

Phần nghi/kỵ hiện dùng Tyme4TS như implementation tham khảo, trong bối cảnh lịch Hiệp Kỷ triều Nguyễn có chứng cứ sử dụng Hiệp Kỷ Biện Phương Thư.

Không gắn nhãn “verified canonical” cho từng nghi/kỵ cho tới khi từng rule có:
1. rule id,
2. điều kiện machine-readable,
3. quyển/trang hoặc đoạn nguồn,
4. golden cases,
5. test phản ví dụ.

## CI

GitHub Actions phải pass:
- unit calendar/BaZi/personal/planner,
- API smoke,
- Playwright desktop Chromium,
- Playwright mobile Pixel 7,
- screenshot artifact.
