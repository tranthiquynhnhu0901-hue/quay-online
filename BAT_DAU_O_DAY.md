# BẮT ĐẦU TỪ ĐÂY — NEON PARTY LIVE v2.6 (GitHub gọn nhẹ)

**Đây là dự án đầy đủ, không phải ZIP để tải nguyên vào GitHub.** Giải nén ZIP rồi tải **tệp và thư mục bên trong**.

## Tải GitHub bằng trình duyệt (nút Upload files)

1. Giải nén ZIP trong Windows. Mở thư mục sau khi giải nén.
2. Truy cập https://github.com/tranthiquynhnhu0901-hue/quay-online/upload/main
3. Kéo **các tệp và thư mục bên trong** vào trang GitHub, **không kéo file ZIP**, và **không thêm bản HTML độc lập 45 MB hoặc nhạc MP3 cũ 35 MB**.
4. Kiểm tra có `index.html`, `app.js`, `styles.css`, `assets/neon_live_mix.m4a`, `.github/workflows/pages.yml`.
5. Nhập `Update NEON PARTY v2.6` rồi chọn Commit changes.
6. Mở Settings → Pages → Build and deployment → Source: GitHub Actions. Xem Actions để xác nhận workflow xanh.
7. Website dự kiến: https://tranthiquynhnhu0901-hue.github.io/quay-online/ . Đợi xuất bản thành công mới dùng được.

**Mỗi tệp ở đây dưới 25 MB**. Nếu trước đó lỗi `Yowza, that's a big file`, hãy bỏ file HTML độc lập, ZIP nguyên, hoặc MP3 cũ ra khỏi danh sách tải rồi chỉ dùng tệp trong gói này.

## Phát trên máy tính

- Dùng OBS / TikTok LIVE Studio: Browser Source 1080×1920, URL website cộng thêm `?overlay=1&camera=auto`.
- Có thể chạy tại PC bằng cách cài Node.js 20+, nháy đúp `KHOI_DONG_LIVE_PC.cmd`, rồi mở `http://127.0.0.1:4173/?overlay=1&camera=auto`.
- Nhạc bắt đầu khi người dùng nhấn Vào quán; môi trường OBS có thể phải chọn Interact một lần để mở khóa âm thanh.
- LIVE TikTok thật **không chạy chỉ bằng GitHub Pages**. Phải chạy backend, `npm install` cho connector không chính thức, kết nối tài khoản đang LIVE và kiểm chứng bằng phiên thật.

## Thay đổi v2.6

- Giữ nguyên `app.js` và `styles.css` từ bản v2.5: sân khấu 9:16, tiên cá DJ, LUNA/KAI, quay camera, MC, NPC, bàn tiệc, âm thanh cụng ly, quà tặng.
- Chỉ thay nhạc 48:33 từ MP3 nén cũ sang M4A/AAC nhỏ hơn ~19,6 MB; **độ dài giữ nguyên, bitrate giảm nên chất lượng âm thanh có thể giảm đôi chút**.
- Bỏ các bản sao HTML 45 MB, nhạc ghép 35 MB, báo cáo và công cụ tạo âm thanh không cần thiết.
- Xuất bản trực tiếp M4A, không còn phải ghép nhạc qua GitHub Actions.

Nhạc trên trang công khai cần có quyền sử dụng phù hợp.
