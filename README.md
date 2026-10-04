# Lịch Việt AI

Trợ lý lịch Việt tối giản: mở app là biết hôm nay nên làm gì, có thể chọn ngày cho một việc cụ thể và cá nhân hóa bằng ngày/giờ sinh.

## Trạng thái

**V1 hoàn chỉnh ở mức ứng dụng web/PWA không cần tài khoản.**

- Âm lịch Việt Nam tính riêng theo UTC+7.
- Can Chi và Bát Tự tính theo tiết khí; năm đổi tại Lập Xuân.
- 12 Trực, Hoàng/Hắc đạo, nghi/kỵ lấy từ lớp engine truyền thống và luôn ghi mức tin cậy.
- Hồ sơ lưu localStorage, server không lưu ngày sinh.
- Chọn ngày trả tối đa 5 kết quả.
- PWA + Notification API + Periodic Background Sync khi trình duyệt hỗ trợ.
- GitHub Actions chạy unit tests và Playwright trên desktop/mobile.
- AI không tham gia tính toán; API JSON được thiết kế để AI chỉ diễn giải.

## Chạy local

```bash
npm install
npm test
npm start
# http://localhost:3000
```

Kiểm tra UI:

```bash
npx playwright install chromium
npm run test:e2e
```

## API

- `GET /api/day?date=2026-10-04`
- `GET /api/range?from=2026-10-04&days=7`
- `GET /api/plan?from=2026-10-04&days=30&activity=contract`
- `GET /api/profile?birth=1995-04-14&birthTime=08:00`
- `GET /api/meta`
- `GET /api/health`

Thêm `birth` và `birthTime` vào day/range/plan để bật cá nhân hóa.

## Nguyên tắc

1. **Lịch trước, AI sau.** LLM không được tự tính ngày tốt/xấu.
2. **Việt Nam trước.** Không dùng âm lịch UTC+8 làm lịch Việt.
3. **Nguồn có tầng.** Nguồn nhà nước/lịch sử, thuật toán thiên văn, cổ điển và implementation được phân loại riêng.
4. **Không giả khoa học.** Cát/hung là hệ truyền thống.
5. **Không đoán dữ liệu.** Không biết giờ sinh thì app chỉ hiển thị 3 trụ.

Xem `docs/ARCHITECTURE.md`, `docs/VERIFICATION.md`, `docs/AI_CONTRACT.md`.
