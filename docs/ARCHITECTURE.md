# Kiến trúc V1

## Luồng dữ liệu

```
Dương lịch + UTC+7
        |
        +--> Vietnamese lunar core (công thức thiên văn)
        |
        +--> BaZi core (tiết khí, Can Chi)
        |
        +--> Traditional engine (Tyme4TS)
                 |
                 +--> 12 Trực / Hoàng-Hắc đạo / nghi-kỵ
        |
        +--> Personal signal (lục xung/lục hợp cơ bản)
        |
        +--> Planner ranking
        |
        +--> JSON API
        |
        +--> UI / PWA / AI diễn giải
```

## Ranh giới quan trọng

- Tyme4TS **không** quyết định âm lịch Việt Nam.
- Nếu lịch Việt UTC+7 và lịch nội bộ Tyme khác ngày/tháng, mức tin cậy nghi/kỵ bị hạ.
- Điểm xếp hạng chỉ dùng nội bộ để sắp thứ tự, không hiển thị như “điểm phong thủy”.
- Hồ sơ cá nhân không được lưu server trong V1.
- Notification chạy tốt nhất khi PWA có cơ hội chạy; true server push cần hạ tầng deploy + subscription store.

## Module

- `src/vietnamese-lunar.js`: sóc, kinh độ Mặt Trời, chuyển dương → âm UTC+7.
- `src/bazi.js`: Bát Tự theo Lập Xuân + 12 tiết.
- `src/traditional.js`: lớp quy tắc truyền thống và provenance.
- `src/personal.js`: lục xung/lục hợp cơ bản.
- `src/planner.js`: xếp hạng ngày theo loại việc.
- `server.js`: API + static server, không chứa logic lịch.
