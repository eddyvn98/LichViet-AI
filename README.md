# Lịch Việt AI — Verified Engine V6

Trợ lý lịch Việt cá nhân: lịch Việt UTC+7, chọn ngày, Bát Tự, kế hoạch chủ động, Gemini CLI và Telegram.

## Trọng tâm V6

V6 ưu tiên **độ tin cậy và khả năng audit** hơn số lượng tính năng:

- Lịch, Can Chi, tiết khí và rule cốt lõi được tính deterministic.
- Fact từ nguồn và `PRODUCT_POLICY` của app được tách riêng.
- 12 Trực có corpus phân loại cát/hung từ `御定星歷考原 卷五`.
- Recommendation dùng `support / caution / veto`, không dùng score làm kết luận.
- Numeric score chỉ còn vai trò `tie-break-only`.
- Ngày giao tiết luôn composition bảo thủ giữa các trạng thái hợp lệ.
- Confidence tách theo calendar / BaZi / traditional.
- Lịch trước phạm vi hiện đại được gắn `historical-proleptic-utc7`.
- AI không được nâng heuristic hoặc product policy thành nguyên điển.
- Kết quả có SHA-256 reproducibility fingerprint.
- CI chạy validator, unit tests, strict audit, multi-year property audit và Playwright.

## Evidence levels

- `ASTRONOMY_OFFICIAL` — nguồn thiên văn/tiêu chuẩn chính thức.
- `PRIMARY_EXACT` — nguyên điển với locator chính xác.
- `PRIMARY_FAMILY` — đúng họ/nguyên điển nhưng locator chưa đủ mạnh.
- `OFFICIAL_SECONDARY` — tài liệu cơ quan/lưu trữ chính thức.
- `IMPLEMENTATION_CROSSCHECK` — implementation dùng để đối chiếu.
- `COMMUNITY_REFERENCE` — tham khảo cộng đồng.
- `EXPERIMENTAL` — heuristic thử nghiệm.
- `PRODUCT_POLICY` — normalization/chính sách của app; không bao giờ tạo strong claim.

Xem `data/source-policy.json`.

## Recommendation V6

Luồng chọn ngày:

1. Tính lịch Việt UTC+7, Can Chi, tiết khí.
2. Xác định Trực và Hoàng/Hắc đạo bằng verified engine.
3. Đọc fact phân loại Trực từ corpus nguồn.
4. Đọc activity mapping từ `data/activity-policies.json` với nhãn `PRODUCT_POLICY`.
5. Compose nhiều tín hiệu thành `preferred / neutral / caution / blocked`.
6. Chỉ khi cùng decision band mới dùng numeric score để tie-break.
7. Tyme4TS nghi/kỵ chỉ hiển thị advisory, không đổi decision/ranking.

Nguyên tắc này bám theo chính cảnh báo trong `御定星歷考原`: không chấp một yếu tố đơn lẻ để luận cát/hung.

## Nguồn cốt lõi

- Âm lịch Việt UTC+7: thuật toán Hồ Ngọc Đức + regression/property tests.
- Việt Nam lịch sử: tài liệu Trung tâm Lưu trữ Quốc gia về Lịch Hiệp Kỷ và Khâm Thiên Giám.
- 12 Trực và nguyên tắc composition: `御定星歷考原 卷五・月建十二神`.
- Quan hệ Can Chi / Hoàng-Hắc đạo: các evidence record có locator trong `data/evidence-records.json`.
- Thiên văn: Hong Kong Observatory.
- Implementation cross-check: Tyme4TS + lunar-javascript, cùng family 6tail.

## API kiểm chứng

- `GET /api/verification`
- `GET /api/verification/cases`
- `GET /api/rules`
- `GET /api/evidence`
- `GET /api/sources`
- `GET /api/duty-classification`
- `GET /api/activity-policies`
- `GET /api/day`
- `GET /api/plan`

`/api/day` và kết quả planner có provenance, confidence và reproducibility trace.

## Kiểm thử

```bash
npm install
npm run validate:knowledge
npm test
npm run verify:engine -- --from=2026-01-01 --days=366 --strict=true
npm run verify:properties -- --from=2024-01-01 --to=2028-12-31
npx playwright install chromium
npm run test:e2e
```

## Runtime cá nhân

- Windows 11 Pro.
- Node.js trực tiếp, không Docker.
- AI duy nhất: Gemini CLI, Google OAuth.
- Model mặc định: `gemini-3.8-flash`.
- Telegram dùng Bot API.
- Security/auth của module có thể đặt sau lớp bảo mật chung của web chính.

Xem `docs/WINDOWS_HOSTING.md` và `docs/ENGINE_V6.md`.

## Nguyên tắc

1. Lịch trước, AI sau.
2. Việt Nam trước.
3. Evidence trước lời giải thích.
4. Fact nguồn và product policy không được trộn.
5. Không biến implementation phổ biến thành bằng chứng đúng.
6. Không giả khoa học.
7. Không đoán dữ liệu thiếu.
8. Bất đồng phải nhìn thấy được.
9. Score không được quyết định verdict.
10. Chỉ nâng strong claim khi evidence đúng applicability và authority.
