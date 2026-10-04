# Kiến trúc V2

```
Dương lịch + UTC+7
  ├─ Vietnamese lunar core
  ├─ BaZi core
  │   └─ advanced profile: Nhật chủ / Ngũ hành / Thập thần
  ├─ Rule catalog (ID + provenance)
  ├─ Traditional cross-check (Tyme4TS)
  ├─ Personal day signals
  ├─ Planner
  ├─ Saved intentions
  ├─ Deterministic daily brief
  └─ API
      ├─ Web/PWA
      ├─ AI rewriter
      └─ Web Push scheduler
```

## Ranh giới

- Tyme4TS không quyết định âm lịch Việt Nam.
- Rule scoring do `src/rule-engine.js` kiểm soát.
- Tyme4TS vẫn được dùng cho nghi/kỵ chi tiết và thần trực nhật; provenance UI phải nói rõ.
- AI không được tính lịch.
- Ngũ hành strength V2 là heuristic, không phải Dụng thần canonical.
- Không có giờ sinh → không tạo trụ giờ.
- Hồ sơ/plans mặc định chỉ nằm local. Chỉ khi bật true push mới gửi dữ liệu cần thiết lên push store.
- Push store mặc định là file adapter cho single-instance server. Production nhiều instance nên thay bằng database/KV adapter.

## Modules

- `src/vietnamese-lunar.js` — âm lịch UTC+7.
- `src/bazi.js` — 4 trụ cơ sở.
- `src/bazi-profile.js` — Nhật chủ, element balance, Thập thần.
- `src/rule-engine.js` — rule/provenance.
- `src/traditional.js` — daily engine.
- `src/personal-v2.js` — tín hiệu cá nhân.
- `src/planner.js` — xếp hạng theo loại việc.
- `src/brief.js` — proactive brief.
- `src/push.js` — Web Push.
