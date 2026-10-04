# Engine V6 — Evidence & Recommendation Integrity

## Mục tiêu

V6 giải quyết ba rủi ro còn lại sau V5:

1. Rule activity trước đây mang source cổ điển dù mapping good/avoid là normalization của app.
2. Numeric score vẫn có thể bị hiểu nhầm là kết luận cát/hung.
3. Regression theo vài ngày mẫu chưa đủ để phát hiện drift dài hạn.

## 1. Hai lớp dữ liệu tách biệt

### Source fact

`data/duty-classification.json` chứa phân loại tổng quát 12 Trực, có evidence:
`XLKY-12-DUTY-CLASSIFICATION`.

Nguồn: `御定星歷考原 卷五・月建十二神`.

### Product policy

`data/activity-policies.json` chứa mapping cho 8 loại việc:
contract, wedding, move, opening, travel, build, medical, meeting.

Mọi mapping này có `evidenceLevel=PRODUCT_POLICY`.
Primary evidence chỉ là bối cảnh/supporting evidence, không nâng policy thành canonical.

## 2. Composition thay cho score-first

`src/recommendation-engine.js` tạo ba loại tín hiệu:

- support
- caution
- veto

Decision theo loại việc:

- `preferred`
- `neutral`
- `caution`
- `blocked`

Veto chỉ xuất hiện khi tín hiệu hung tổng quát và activity avoid policy cùng hướng.
Xung đột giữa source fact và product policy luôn hạ xuống caution.

Ngày giao tiết có nhiều trạng thái Trực: lấy state bảo thủ hơn.

## 3. General day verdict

`/api/day.verdict` dùng `general-day-composition-v1`.

Verdict không đọc numeric score.
Score ở `ranking` có `role=tie-break-only`.

## 4. Confidence và historical scope

Confidence tiếp tục tách:

- calendar
- bazi
- traditional

Ngày trước 2002-10-14 được gắn:

- `scope=historical-proleptic-utc7`
- `historicalReconstruction=true`

Điều này có nghĩa engine tính lùi bằng quy tắc thiên văn hiện đại; không tuyên bố đó là lịch chính thức đã ban hành tại thời điểm lịch sử.

## 5. AI policy

Gemini chỉ diễn giải deterministic context.

Bắt buộc:

- không gọi PRODUCT_POLICY là cổ thư/nguyên điển;
- không dùng ranking.score để thay verdict/decision;
- giữ confidence từng domain;
- giữ nhãn historical-proleptic;
- không tạo source/locator/rule mới.

## 6. Reproducibility

`src/trace.js` tạo SHA-256 từ:

- engine version;
- knowledge-base version;
- decision/ranking policy;
- input deterministic quan trọng;
- rule/evidence IDs;
- decision output.

Hash cho phép so sánh hai kết quả mà không cần log dữ liệu cá nhân thô.

## 7. CI gates

PR chỉ nên merge khi tất cả pass:

1. Knowledge validator.
2. Unit/regression tests.
3. Strict engine audit 366 ngày.
4. Multi-year property audit.
5. Playwright desktop/mobile.

Property audit kiểm tra:

- đúng 6 giờ Hoàng đạo/ngày;
- general verdict luôn dùng composition;
- ranking luôn tie-break-only;
- đủ confidence domains;
- evidence composition có trong provenance;
- planner của cả 8 activity luôn tạo decision hợp lệ.

## 8. API audit

- `/api/duty-classification`
- `/api/activity-policies`
- `/api/rules`
- `/api/evidence`
- `/api/verification`

Các endpoint này cho phép kiểm lại vì sao engine ra kết luận mà không cần hỏi AI.

## 9. Quy tắc thay đổi V6

Thay đổi activity mapping là thay đổi PRODUCT_POLICY và cần:

- sửa `data/activity-policies.json`;
- đồng bộ `rules.json`;
- validator pass;
- cập nhật regression;
- ghi CHANGELOG nếu làm thay đổi recommendation.

Thay đổi source fact cần evidence record mới hoặc locator/review update.
Không được sửa source fact chỉ để làm recommendation “đẹp hơn”.
