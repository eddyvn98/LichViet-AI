# Engine V7 — Family Selection Intelligence

## Phạm vi

V7 không mở rộng cổ thư/evidence. Knowledge base vẫn là `evidence-corpus-v6`.

Mục tiêu là biến engine V6 thành công cụ chọn ngày dùng thực tế cho một gia đình nhỏ.

## 1. Family registry

Client lưu tối đa 8 thành viên.

Mỗi thành viên có:

- id local;
- tên hiển thị;
- ngày sinh;
- giờ sinh nếu biết.

Hồ sơ V6 được migrate tự động thành member `primary`.

Planner chỉ gửi những thành viên đang được tick.

## 2. Family personalization

`src/family-selection.js` dùng `family-personalization-v1`.

Nguyên tắc:

- chạy personalization từng người riêng;
- giữ tên người trên từng signal;
- một caution không bị good của người khác trung hòa;
- family layer không tạo veto;
- numeric delta của family = 0; decision chịu trách nhiệm giữ caution;
- member thiếu dữ liệu vẫn được đánh dấu unresolved, không đoán.

Đây là `PRODUCT_POLICY`.

## 3. Constraint engine

`selection-constraints-v1` hỗ trợ:

- any / weekday / weekend;
- exclude dates;
- avoid lunar days;
- avoid Jie transition.

Constraint là preference gia đình, không phải kiêng kỵ cổ điển.

Ngày fail constraint vẫn có thể xuất hiện trong compare để giải thích vì sao bị loại, nhưng bị loại khỏi shortlist planner.

## 4. Deterministic comparison

`POST /api/compare` nhận 2–5 ngày.

Thứ tự:

1. ngày phải qua constraint;
2. decision band;
3. tie-break score;
4. thứ tự ngày cuối cùng.

Response nói rõ winner thắng do band cao hơn hay chỉ do tie-break.

Policy: `deterministic-date-comparison-v1`.

## 5. Saved family plans

Plan lưu:

- activity;
- date range;
- participant IDs;
- constraint snapshot.

Khi daily brief chạy:

- participant ID được resolve lại từ family registry;
- người đã xóa không được thay bằng active profile;
- participant còn resolve được vẫn được dùng;
- constraints của plan được áp lại.

Telegram và PWA push dùng cùng logic.

## 6. Feedback workflow

Planner có hai action:

- Hợp lý;
- Cần rà.

Server lưu tại `data/runtime/selection-feedback.json`:

- date;
- activity;
- decision;
- trace hash;
- engine ID;
- decision/ranking/family/constraint/comparison policy IDs;
- optional note.

Không lưu birthDate/birthTime trong feedback record.

## 7. Reproducibility

Recommendation trace tiếp tục dùng SHA-256.

V7 bổ sung vào trace:

- normalized constraints;
- family member count;
- family caution/support count;
- unresolved count.

Không đưa raw ngày sinh vào trace payload.

## 8. AI guardrails

Gemini phải hiểu:

- family personalization là PRODUCT_POLICY/heuristic;
- family caution không phải canonical veto;
- constraints là preference người dùng;
- compare explanation deterministic không được tự đảo winner.

## 9. Verification

Unit tests kiểm:

- family caution không bị trung hòa;
- family không tạo veto;
- constraint normalization;
- weekend filtering;
- compare giữ rejected candidate;
- compare policy;
- stale participant không bị thay bằng active profile.

Property audit định kỳ trên nhiều năm kiểm:

- family planner trả đúng family count;
- weekend constraint thật sự là weekend;
- trace vẫn đúng engine;
- compare luôn có policy/explanation/candidates hợp lệ.

Playwright kiểm:

- migration single profile;
- tạo 2 thành viên;
- tick thành viên;
- constraint planner;
- compare UI;
- feedback history;
- saved-plan constraint;
- API family/compare/feedback.

## 10. Giới hạn chủ ý

V7 không làm:

- multi-tenant;
- phân quyền nhiều tài khoản;
- đồng bộ cloud family database;
- AI tự sửa rule;
- family score kiểu cộng/trừ tổng hợp;
- source ingestion tự động.

App chỉ dùng cá nhân/gia đình nên các phần này chưa tạo giá trị tương xứng độ phức tạp.
