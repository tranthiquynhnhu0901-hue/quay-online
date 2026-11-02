# NEON PARTY LIVE v2.6.2 — Audio Mixer Repair

Giữ nguyên sân khấu, camera, nhân vật và gameplay bản v2.6.1. Đã bổ sung đầy đủ âm thanh và bảng kiểm tra riêng cho nhạc DJ, MC, hô tập thể, khui bia, rót ly, cụng ly, phục vụ bàn, quà tặng, pháo hoa, đám đông.

**Bắt đầu:** xem `SUA_TOAN_BO_AM_THANH.md`. Backend TikTok LIVE thật cần cấu hình riêng và chưa được xác minh với phiên LIVE công khai.

# NEON PARTY LIVE v2.6 — GitHub Ready Lite

**Giữ nguyên game UI/UX từ v2.5**, gồm sân khấu đứng 9:16, nàng tiên cá DJ, LUNA/KAI, camera đa góc, game nhân vật, quầy bar, bàn nhậu ảo, phục vụ tự động, các đợt 1–2–3 Zô và âm thanh, MC tên người xem, bình luận và hiệu ứng quà tặng 3 giây.

## Cấu trúc

- `index.html`, `styles.css`, `app.js`, `config.js`: frontend.
- `assets/neon_live_mix.m4a`: DJ Mix 48:33 nén AAC để mỗi tệp không quá 25 MB.
- `assets/party_123_zo.mp3`, `beer_open.mp3`, `beer_pour.mp3`: hiệu ứng âm thanh.
- `.github/workflows/pages.yml`: tự kiểm thử và xuất bản GitHub Pages.
- `server/`: Node.js backend đọc sự kiện/live connector tùy chọn (chưa kiểm chứng LIVE thực tế).
- `KHOI_DONG_LIVE_PC.cmd`: chạy local trên Windows.
- `tools/verify-upload.js`: kiểm tra giới hạn kích thước file.

**Xem `BAT_DAU_O_DAY.md` để có hướng dẫn chi tiết.**

Trên máy tính, kiểm tra nhanh: `node tools/verify-upload.js` và `npm run check` (Node.js 20+). Chạy game local: `node server/server.js`, mở `http://127.0.0.1:4173`.

Để thử TikTok LIVE thật: `npm install`, chạy PC backend, kết nối từ trang quản trị bằng mã bảo mật. Khả năng nhận tên người xem thụ động phụ thuộc nguồn TikTok; công cụ kết nối là thư viện không chính thức. GitHub Pages chỉ chạy DEMO trừ khi cấu hình `NEON_BACKEND_URL` cho backend HTTPS.

**Quyền nhạc**: chỉ công khai và livestream bản DJ Mix nếu có giấy phép/quyền thích hợp.
