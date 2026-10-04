# Verified Engine V3

## Mục tiêu

Không tối ưu cho việc có thật nhiều thuật ngữ phong thủy. Tối ưu cho khả năng trả lời ba câu hỏi:

1. Kết quả này được tính như thế nào?
2. Quy tắc nào tạo ra kết luận?
3. Nguồn nào hỗ trợ quy tắc đó và mức xác minh đến đâu?

## Pipeline

```
Input date/profile
  -> Vietnam UTC+7 calendar core
  -> Can Chi / BaZi deterministic core
  -> rule engine
  -> evidence resolver
  -> implementation cross-checks
  -> confidence resolver
  -> planner / brief
  -> Gemini explanation
```

Gemini nằm cuối pipeline và không có quyền thay đổi facts.

## Quy tắc bằng chứng

### Có thể dùng cho kết luận mạnh

- ASTRONOMY_OFFICIAL
- PRIMARY_EXACT
- OFFICIAL_SECONDARY khi đúng phạm vi

### Chỉ dùng với ngôn ngữ thận trọng

- PRIMARY_FAMILY
- IMPLEMENTATION_CROSSCHECK

### Không được biến thành quy tắc cổ điển

- EXPERIMENTAL

## Independence

Cross-check phải có `family`.

Ví dụ:

- Tyme4TS -> family: 6tail
- lunar-javascript -> family: 6tail

Hai implementation này hữu ích để phát hiện regression, nhưng **không tạo hai phiếu độc lập**.

## Dispute handling

Không có majority vote tự động.

Nếu engine và cross-check khác nhau:

1. giữ kết quả engine,
2. ghi `status=disputed` hoặc `timezone-sensitive`,
3. hạ confidence,
4. AI phải nói ngắn gọn rằng có bất đồng,
5. thêm case vào backlog kiểm chứng nguồn.

Sai khác âm lịch với implementation Trung Quốc có thể do UTC+7/UTC+8 và không tự động được coi là lỗi.

## Canonical promotion

Một rule chỉ được nâng thành `PRIMARY_EXACT` khi có:

1. bản nguồn ổn định,
2. locator chính xác,
3. đoạn nguyên văn đủ ngữ cảnh,
4. normalization tiếng Việt được review,
5. positive test,
6. negative test,
7. regression test,
8. không có dispute chưa giải quyết liên quan trực tiếp.

## Audit

Quét 1 năm:

```
node scripts/verify-engine.js --from=2026-01-01 --days=366
```

Xuất file:

```
node scripts/verify-engine.js --from=2026-01-01 --days=366 --out=artifacts/engine-audit.json
```

Audit không tự quyết định engine nào đúng. Nó tạo danh sách ca cần điều tra.

## AI contract

AI:

- không tự tính lịch,
- không tạo nguồn,
- không bịa locator,
- không nâng confidence,
- không biến heuristic thành cổ điển,
- phải nêu bất đồng nếu context có dispute.

## Mục tiêu dữ liệu tiếp theo

Ưu tiên theo thứ tự:

1. 12 Trực: locator nguyên điển chính xác + positive/negative examples.
2. Lục xung/lục hợp: locator chính xác.
3. Hoàng/Hắc đạo và 12 thần.
4. Nghi/kỵ theo loại việc.
5. Quy tắc cá nhân hóa Bát Tự được phân tách theo trường phái.
6. Boundary cases quanh tiết khí và đổi ngày.
