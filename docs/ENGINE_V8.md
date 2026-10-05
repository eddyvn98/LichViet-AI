# Engine V8 — Daily Operations & Recovery

V8 giữ nguyên knowledge corpus `evidence-corpus-v6` và các policy chọn ngày của V7. Mục tiêu là dùng thật ổn định mỗi ngày.

## Thay đổi chính

- Runtime JSON dùng ghi atomic để giảm nguy cơ file bị cắt dở khi tiến trình dừng lúc đang ghi.
- `GET /api/ops/status` cho biết engine/version, uptime, runtime stores và trạng thái tích hợp mà không lộ secret.
- HTTP task endpoint fail-closed nếu chưa có `CRON_SECRET`.
- `family-daily-summary-v1` hiển thị nhanh tín hiệu của các thành viên đã chọn, không tạo verdict mới.
- Export/import backup dữ liệu gia đình ngay trên browser bằng `lichviet-device-backup-v1`.
- CI tiếp tục giữ validator, unit, strict audit, property audit và Playwright desktop/mobile.

## Nguyên tắc

1. Không thay evidence/rule đã xác minh chỉ để “có V8”.
2. Runtime phải phục hồi dễ hơn và trạng thái vận hành phải nhìn thấy được.
3. Backup chứa dữ liệu cá nhân nên chỉ tạo/đọc trong browser, không upload server.
4. Family daily summary là PRODUCT_POLICY, không phải cổ thư.
5. AI vẫn chỉ diễn giải, không được tự đảo decision deterministic.
