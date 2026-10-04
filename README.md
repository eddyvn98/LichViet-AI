# Lịch Việt AI — Verified Engine V3

Trợ lý lịch Việt cá nhân: lịch Việt UTC+7, chọn ngày, Bát Tự, kế hoạch chủ động, Gemini CLI và Telegram.

## Trọng tâm V3

V3 không ưu tiên thêm nhiều tính năng bề mặt. Trọng tâm là **độ tin cậy của engine**:

- Kết quả lịch/Can Chi được tính deterministic, AI không tự tính.
- Rule có ID, source, locator và evidence level.
- Nguồn gốc/chính thức có quyền cao hơn implementation.
- Tyme4TS và lunar-javascript chỉ là cross-check.
- Hai thư viện cùng family 6tail không được tính là hai nguồn độc lập.
- Bất đồng cross-check được giữ trong provenance thay vì âm thầm chọn một kết quả.
- Heuristic phải gắn nhãn EXPERIMENTAL.
- Gemini phải hạ giọng khẳng định khi confidence thấp/disputed.

## Evidence levels

- `ASTRONOMY_OFFICIAL` — nguồn thiên văn/tiêu chuẩn chính thức.
- `PRIMARY_EXACT` — nguyên điển với locator chính xác.
- `PRIMARY_FAMILY` — đã xác định đúng nguyên điển/quyển/mục nhưng chưa đủ locator để tuyên bố canonical.
- `OFFICIAL_SECONDARY` — tài liệu cơ quan/lưu trữ chính thức.
- `IMPLEMENTATION_CROSSCHECK` — thư viện kỹ thuật dùng để đối chiếu.
- `EXPERIMENTAL` — heuristic của app.

Xem `data/source-policy.json`.

## Nguồn cốt lõi

- Âm lịch Việt UTC+7: thuật toán Hồ Ngọc Đức, khóa bằng regression cases.
- Lịch sử Việt Nam: tài liệu Trung tâm Lưu trữ Quốc gia về Lịch Hiệp Kỷ và Khâm Thiên Giám.
- Chọn ngày truyền thống: `欽定協紀辨方書` (Hiệp Kỷ Biện Phương Thư), truy qua Chinese Text Project/bản scan.
- Đối chiếu thiên văn: Hong Kong Observatory (lưu ý UTC+8).
- Cross-check implementation: Tyme4TS + lunar-javascript.

## API kiểm chứng

- `GET /api/verification` — policy, số rule/source/case, phân bố evidence.
- `GET /api/verification/cases` — regression/golden cases.
- `GET /api/rules` — rule cùng evidence metadata.
- `GET /api/day` — provenance, crossChecks và confidence ngay trong kết quả.

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

## Runtime cá nhân

- Windows 11 Pro.
- Node.js trực tiếp, không Docker.
- AI duy nhất: Gemini CLI.
- Model mặc định: `gemini-3.8-flash`.
- Auth AI: Sign in with Google (OAuth).
- Telegram dùng Bot API.
- Security/auth của module có thể đặt sau lớp bảo mật chung của web chính.

Xem `docs/WINDOWS_HOSTING.md`.

## Nguyên tắc

1. Lịch trước, AI sau.
2. Việt Nam trước.
3. Evidence trước lời giải thích.
4. Không biến độ phổ biến của thư viện thành bằng chứng đúng.
5. Không giả khoa học.
6. Không đoán dữ liệu thiếu.
7. Bất đồng phải nhìn thấy được.
8. Chỉ nâng rule lên canonical khi có locator và regression test đủ mạnh.
