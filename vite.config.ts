import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Khi chạy `npm run dev`, các lệnh /api được chuyển sang máy chủ Python (python -m server.app)
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://127.0.0.1:8765" } },
});
