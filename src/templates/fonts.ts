// Font gói kèm trong app (không phụ thuộc Google Fonts) để MP4 xuất ra luôn đúng font tiếng Việt
import "@fontsource/anton/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/be-vietnam-pro/800.css";
import "@fontsource/playfair-display/600-italic.css";

export const DISPLAY = '"Anton", Impact, sans-serif';
export const UI = '"Be Vietnam Pro", system-ui, sans-serif';
export const SERIF = '"Playfair Display", Georgia, serif';

const SAMPLE = "Ạ ắ ổ ữ Đ đ AZaz09";
/** Chờ tải xong mọi font (kể cả bộ chữ tiếng Việt) trước khi xem trước / xuất video */
export function fontsReady() {
  return Promise.all([
    document.fonts.load(`400 100px "Anton"`, SAMPLE),
    ...["500", "600", "700", "800"].map((w) => document.fonts.load(`${w} 100px "Be Vietnam Pro"`, SAMPLE)),
    document.fonts.load(`italic 600 100px "Playfair Display"`, SAMPLE),
  ]).then(() => document.fonts.ready);
}
