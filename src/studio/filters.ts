/** Bộ lọc màu: id khớp với server/filters.py (bản dựng thật bằng FFmpeg). css = gần đúng để xem trước trong trình duyệt. */
export type Filter = { id: string; name: string; colors: [string, string]; css: Partial<Record<"brightness" | "contrast" | "saturate" | "sepia" | "grayscale" | "hue", number>> };

export const FILTERS: Filter[] = [
  { id: "cinematic", name: "Điện ảnh", colors: ["#2f6f7d", "#c98a4b"], css: { contrast: 1.12, saturate: 1.05, hue: -6 } },
  { id: "film", name: "Phim", colors: ["#8a6a4f", "#d2b48c"], css: { contrast: 1.05, saturate: 0.9, sepia: 0.15 } },
  { id: "luxury", name: "Sang trọng", colors: ["#3a2f12", "#d4af37"], css: { contrast: 1.1, saturate: 0.85, brightness: 0.98, sepia: 0.2 } },
  { id: "bright", name: "Tươi sáng", colors: ["#ffe27a", "#fff5c2"], css: { brightness: 1.08, saturate: 1.25, contrast: 1.04 } },
  { id: "teal_orange", name: "Teal & Orange", colors: ["#1f7a8c", "#f08a3c"], css: { contrast: 1.06, saturate: 1.2, hue: -10 } },
  { id: "moody", name: "Moody tối", colors: ["#10121f", "#3a4060"], css: { brightness: 0.88, contrast: 1.2, saturate: 0.8 } },
  { id: "clean_ad", name: "Sạch quảng cáo", colors: ["#dfe9f3", "#ffffff"], css: { brightness: 1.05, contrast: 1.08, saturate: 1.1 } },
  { id: "warm_skin", name: "Chân dung ấm", colors: ["#f4a584", "#ffd2b8"], css: { brightness: 1.04, saturate: 1.05, sepia: 0.12 } },
  { id: "bw", name: "Đen trắng cổ điển", colors: ["#2b2b2b", "#d0d0d0"], css: { grayscale: 1, contrast: 1.2 } },
  { id: "pastel", name: "Pastel mộng mơ", colors: ["#f3c6ef", "#cde7ff"], css: { brightness: 1.08, saturate: 0.8, contrast: 0.92 } },
  { id: "kodak", name: "Kodak ấm", colors: ["#b5471b", "#f2a65a"], css: { saturate: 1.15, contrast: 1.08, sepia: 0.25 } },
  { id: "bleach", name: "Bleach Bypass", colors: ["#4a4a4a", "#9aa0a6"], css: { saturate: 0.45, contrast: 1.35 } },
  { id: "fuji", name: "Fuji mềm mại", colors: ["#6e9c88", "#cfe3d4"], css: { saturate: 0.95, contrast: 0.98, brightness: 1.02, hue: 8 } },
  { id: "golden", name: "Golden Hour", colors: ["#e07a1f", "#ffd27a"], css: { saturate: 1.2, brightness: 1.03, sepia: 0.3 } },
  { id: "vintage", name: "Vintage 16mm", colors: ["#8a6b3d", "#c9b27c"], css: { saturate: 0.8, contrast: 1.1, sepia: 0.3 } },
  { id: "neon", name: "Neon đêm đô thị", colors: ["#7b1fa2", "#00e5ff"], css: { contrast: 1.2, saturate: 1.5, hue: 15 } },
];

/** Chuỗi CSS filter của bộ lọc ở cường độ strength (0–100), nội suy từ "không lọc" */
export function cssFilter(id: string, strength: number): string {
  const f = FILTERS.find((x) => x.id === id);
  if (!f) return "none";
  const k = Math.max(0, Math.min(100, strength)) / 100;
  const lerp = (v: number, base = 1) => base + (v - base) * k;
  const c = f.css;
  const out: string[] = [];
  if (c.brightness !== undefined) out.push(`brightness(${lerp(c.brightness).toFixed(3)})`);
  if (c.contrast !== undefined) out.push(`contrast(${lerp(c.contrast).toFixed(3)})`);
  if (c.saturate !== undefined) out.push(`saturate(${lerp(c.saturate).toFixed(3)})`);
  if (c.sepia !== undefined) out.push(`sepia(${(c.sepia * k).toFixed(3)})`);
  if (c.grayscale !== undefined) out.push(`grayscale(${(c.grayscale * k).toFixed(3)})`);
  if (c.hue !== undefined) out.push(`hue-rotate(${(c.hue * k).toFixed(1)}deg)`);
  return out.join(" ") || "none";
}
