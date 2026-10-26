# Kho Reel Mẫu

Thư viện mẫu video TikTok / Reels của Huongptc AI: xem mẫu, sửa chữ, xuất MP4 1080×1920.

App gồm hai phần chạy trên máy bạn:
- **Giao diện web** (React + Remotion) trong `src/`.
- **Máy chủ cục bộ** (Python + FFmpeg) trong `server/`, lưu dữ liệu thẳng vào thư mục trên máy và sẽ xử lý cắt ghép, nhạc, giọng đọc, phụ đề.

## Dùng app
1. Lần đầu: bấm `Cai_dat.bat` (tự cài Python, FFmpeg, thư viện).
2. Mỗi lần dùng: bấm `Chay_app.bat` → trình duyệt mở `http://127.0.0.1:8765`.

## Nơi lưu dữ liệu
Đặt trong `config.json` (không đẩy lên git):

```json
{ "data_dir": "D:\\Kho Reel Mau" }
```

Không có `config.json` thì lưu ở `du-lieu/` cạnh app. Thư mục dữ liệu gồm: `library.json`, `Kho video`, `Video mẫu`, `Nền`, `Nhạc`, `Giọng đọc`, `Thương hiệu`, `Dự án`, `Xuất video`.

## Phát triển
```bash
pip install -r requirements.txt
python -m server.app        # máy chủ, cổng 8765
npm install
npm run dev                 # giao diện, tự chuyển /api sang máy chủ
npm run build               # build vào dist/ để máy chủ phục vụ
```

Mẫu video nằm ở `src/templates/index.tsx` (mảng `TEMPLATES`). Giấy phép Remotion miễn phí: cá nhân / công ty tối đa 3 người (https://remotion.dev/license).
