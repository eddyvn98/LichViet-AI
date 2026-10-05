# Lịch Việt AI — Verified Engine V7

Trợ lý lịch Việt cho cá nhân và gia đình: lịch Việt UTC+7, chọn ngày, Bát Tự, kế hoạch chủ động, Gemini CLI và Telegram.

## Trọng tâm V7

V7 giữ nguyên nền evidence của V6 và thêm **Family Selection Intelligence**:

- Registry tối đa 8 thành viên, lưu local trên trình duyệt.
- Tự migrate hồ sơ đơn V6 thành thành viên đầu tiên.
- Planner có thể xét nhiều người cùng lúc.
- Caution của một thành viên không bị good của người khác xóa; family layer không tự tạo canonical veto.
- Constraint thực tế: ngày thường/cuối tuần, ngày âm gia đình muốn tránh, loại ngày cụ thể, tránh ngày giao tiết.
- Compare trực tiếp 2–5 ngày và nói rõ thắng bằng decision band hay chỉ tie-break.
- Saved plan nhớ participant IDs + constraints để daily brief/Telegram/PWA tính cùng một bài toán.
- Feedback `Hợp lý / Cần rà` lưu engine/policy/SHA-256 fingerprint, không lưu ngày sinh.
- UI cho xem feedback gần đây để rà lại rule/evidence.
- Multi-year property audit kiểm cả family planner và compare.

## Nền engine V6 vẫn giữ nguyên

V7 **không tạo evidence corpus mới**. Manifest vẫn dùng `evidence-corpus-v6`.

- Lịch, Can Chi, tiết khí deterministic.
- Fact nguồn tách khỏi `PRODUCT_POLICY`.
- 12 Trực có corpus từ `御定星歷考原 卷五`.
- Recommendation dùng `support / caution / veto`.
- Numeric score chỉ `tie-break-only`.
- Confidence tách calendar / BaZi / traditional.
- Ngày lịch sử dùng nhãn `historical-proleptic-utc7`.
- Implementation advisory không đổi decision/ranking.

## Policy V7

- `activity-composition-v2` — composition theo loại việc.
- `general-day-composition-v1` — verdict tổng quát.
- `ranking-tiebreak-v2` — score chỉ tie-break.
- `family-personalization-v1` — gộp nhiều thành viên theo hướng bảo thủ.
- `selection-constraints-v1` — sở thích/ràng buộc của gia đình.
- `deterministic-date-comparison-v1` — so sánh ngày deterministic.

Family/constraint đều là `PRODUCT_POLICY`, không được mô tả như cổ thư.

## Evidence levels

- `ASTRONOMY_OFFICIAL`
- `PRIMARY_EXACT`
- `PRIMARY_FAMILY`
- `OFFICIAL_SECONDARY`
- `IMPLEMENTATION_CROSSCHECK`
- `COMMUNITY_REFERENCE`
- `EXPERIMENTAL`
- `PRODUCT_POLICY`

Xem `data/source-policy.json`.

## API chính

- `GET /api/day`
- `GET /api/plan` — compatibility single-profile.
- `POST /api/plan` — family profiles + constraints.
- `POST /api/compare` — so sánh 2–5 ngày.
- `POST /api/feedback`
- `GET /api/feedback`
- `GET /api/verification`
- `GET /api/rules`
- `GET /api/evidence`
- `GET /api/sources`
- `GET /api/duty-classification`
- `GET /api/activity-policies`

## Dữ liệu gia đình

- Registry mặc định ở `localStorage`.
- Telegram/PWA chỉ nhận family profile khi người dùng bật đồng bộ/thông báo.
- Feedback server local chỉ lưu ngày cần rà, activity, decision, engine/policy IDs và trace hash.
- `data/runtime/` bị gitignore.

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

CI gate: validator → unit/regression → strict audit → multi-year property audit → Playwright desktop/mobile.

## Runtime cá nhân

- Windows 11 Pro.
- Node.js trực tiếp, không Docker.
- Gemini CLI + Google OAuth.
- Telegram Bot API.
- Cloudflare Tunnel / lớp bảo mật chung có thể đặt phía ngoài module.

Xem `docs/WINDOWS_HOSTING.md`, `docs/ENGINE_V6.md` và `docs/ENGINE_V7.md`.

## Nguyên tắc

1. Lịch trước, AI sau.
2. Evidence trước lời giải thích.
3. Fact nguồn và product policy không trộn.
4. Gia đình có thể đặt constraint nhưng app phải gọi đúng đó là preference.
5. Good của một người không được che caution của người khác.
6. Không tự thay người đã bị xóa trong plan bằng hồ sơ active.
7. Score không quyết định verdict.
8. Feedback phải tái hiện được bằng fingerprint/version.
