# Kho Reel Mẫu

Thư viện mẫu video TikTok / Reels của Huongptc AI: xem mẫu, sửa chữ, xuất MP4 1080×1920 ngay trong trình duyệt.

- **Dữ liệu nằm trên máy bạn**: lần đầu mở app, chọn một thư mục (VD `D:\Kho Reel Mau`). App lưu `library.json`, thư mục `videos/` (video tải lên) và `xuat-video/` (MP4 đã xuất) vào đó. Cần Chrome hoặc Edge trên máy tính.
- **Mẫu video** nằm ở `src/templates/index.tsx` (React + Remotion). Thêm mẫu mới: viết một component và thêm vào mảng `TEMPLATES`.
- **Xuất MP4**: `@remotion/web-renderer`, dựng ngay trên máy, không tốn phí server. Dùng giấy phép miễn phí của Remotion (cá nhân / công ty tối đa 3 người, xem https://remotion.dev/license).

## Chạy thử trên máy

```bash
npm install
npm run dev
```

## Triển khai

Push nhánh `main` lên GitHub → Vercel tự build (`npm run build`, thư mục `dist`).
