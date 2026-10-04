# Verification V2

## Lịch Việt

Golden cases đang khóa:
- 2026-03-01 → 13/1/2026
- 2026-03-19 → 1/2/2026
- 2026-07-14 → 1/6/2026
- 2026-10-04 → 24/8/2026

Âm lịch hiện đại dùng công thức thiên văn UTC+7. HKO chỉ dùng để cross-check vì dùng UTC+8.

## Bát Tự

Ca khóa:
- 2026-10-04 12:00 UTC+7
- Năm Bính Ngọ
- Tháng Đinh Dậu
- Ngày Tân Hợi
- Nhật chủ Tân Kim
- Tiết đang hiệu lực: Thu phân

V2 còn test:
- không có giờ sinh → không tạo trụ giờ,
- Nhật chủ/Ngũ hành/Thập thần có cấu trúc ổn định,
- tổng tỷ lệ Ngũ hành xấp xỉ 100%.

## Rule engine

`test/v2.test.js` kiểm tra:
- catalog có provenance,
- Trực Thành có rule ID riêng,
- lục xung/lục hợp truy được rule,
- planner trả provenance thay vì chỉ score ẩn.

## Proactive brief

Daily brief là deterministic:
- đọc ngày hôm nay,
- đọc các kế hoạch đã lưu,
- dùng planner chọn candidate tốt nhất,
- chỉ cảnh báo khi candidate nằm trong 7 ngày tới.

AI không được thay kết quả.

## Playwright

Mỗi push/PR chạy:
- desktop Chromium,
- mobile Pixel 7,
- hôm nay,
- planner,
- trợ lý + saved plan,
- hồ sơ Bát Tự sâu,
- trang nguồn/rule catalog,
- API rules/brief/push status,
- screenshot artifact.

## Chưa gọi là canonical verified

Một rule chỉ được nâng lên mức page-level verified khi có:
1. bản nguồn ổn định,
2. locator chính xác đến đoạn/trang,
3. bản dịch/normalization review,
4. positive case,
5. negative case,
6. kiểm thử regression.
