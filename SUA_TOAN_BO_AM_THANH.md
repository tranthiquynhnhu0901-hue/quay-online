# NEON PARTY LIVE v2.6.2 — SỬA TOÀN BỘ ÂM THANH

Bản này sửa cả **nhạc DJ, MC đọc tên, hô 1–2–3 Zô, khui bia, rót ly, tiếng cụng ly, quà tặng, phục vụ bàn, pháo hoa, đám đông và tiếng UI**. Giữ nguyên sân khấu 9:16, nàng tiên cá DJ, 24 camera, nhân vật và tính năng DEMO / backend từ v2.6.1.

## Quan trọng: phải tải đủ file

Giải nén ZIP. Trong repository `quay-online` phải có `index.html`, `app.js`, `styles.css`, `.github/workflows/pages.yml`, và **toàn bộ thư mục `assets/`** ở thư mục gốc, không tải chính tệp ZIP.

Mở **Settings → Pages → Build and deployment → GitHub Actions**, xem tab Actions có dấu xanh. Làm mới Chrome bằng Ctrl+Shift+R.

Trên website, chọn **Vào quán & Bật âm thanh** → ⚙ → **Tất cả âm thanh · Kiểm tra từng tiếng**. Mỗi nút giúp nghe riêng từng hiệu ứng. Dùng **Kiểm tra đủ 10 nguồn âm thanh** để xem báo `HTTP 200` hay `404`. Nếu báo 404, bạn tải thiếu tệp trong `assets/` hoặc GitHub Pages chưa xuất bản đúng.

## OBS / LIVE máy tính

Browser Source: 1080 × 1920; bật **Control audio via OBS** và vào OBS → Audio Mixer kiểm tra thanh mức âm lượng. Nếu OBS chặn autoplay, nhấp phải nguồn → Interact → nhấn Vào quán & Bật âm thanh. Không bật âm thanh đồng thời ở cả Chrome và OBS để tránh vọng.

**MC:** phụ thuộc giọng `vi-VN` của Chrome hoặc Windows. Một số bản OBS không có giọng tiếng Việt nên cần cài thêm. Chưa thể bảo đảm tiếng MC chạy trên mọi máy.

Các âm thanh có sẵn không cần nhạc DJ tải thành công mới phát, nhưng trình duyệt vẫn cần cấp quyền sau thao tác của người dùng. TikTok LIVE thật vẫn cần backend/connector và phiên LIVE thực để kiểm thử. Chỉ phát bản DJ Mix công khai nếu có quyền.
