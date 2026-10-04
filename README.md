# Lịch Việt AI V2

Trợ lý lịch Việt chủ động: xem hôm nay, chọn ngày, lưu kế hoạch để app tự nhắc và cá nhân hóa bằng Bát Tự có provenance.

## V2 có gì

- Âm lịch Việt UTC+7 độc lập với lịch UTC+8.
- Can Chi / tiết khí / Bát Tự deterministic.
- Rule catalog riêng có ID + source + locator + verification.
- Nhật chủ, cân bằng Ngũ hành tương đối, Thập thần.
- Cá nhân hóa theo cả chi năm và chi ngày sinh.
- Chọn ngày theo 8 loại việc.
- Lưu tối đa 20 kế hoạch và sinh daily brief chủ động.
- PWA + fallback Periodic Background Sync.
- True Web Push backend bằng VAPID + cron endpoint khi deploy.
- GitHub Actions + Playwright desktop/mobile.
- AI contract: AI chỉ diễn giải output engine.

## Chạy

```bash
npm install
npm test
npm start
```

UI test:

```bash
npx playwright install chromium
npm run test:e2e
```

## Web Push khi deploy

Cấu hình:

```text
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
CRON_SECRET=...
PUSH_STORE_PATH=/data/push-subscriptions.json
```

Scheduler gọi `POST /api/tasks/daily-push` với header `x-cron-secret`.

## Tài liệu

- `docs/V2.md`
- `docs/ARCHITECTURE.md`
- `docs/VERIFICATION.md`
- `docs/AI_CONTRACT.md`

## Nguyên tắc

1. Lịch trước, AI sau.
2. Việt Nam trước.
3. Rule có provenance.
4. Không giả khoa học.
5. Không đoán dữ liệu thiếu.
6. Cái gì còn phụ thuộc trường phái phải ghi rõ.
