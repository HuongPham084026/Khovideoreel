import { createContext, useContext } from "react";

/** Môi trường dựng mẫu: transparent = bỏ nền của mẫu (chỉ vẽ chữ, hình) để đặt lên video của bạn; colors = đổi màu theo mã màu gốc */
export type Env = { transparent: boolean; colors: Record<string, string> };
export const EnvCtx = createContext<Env>({ transparent: false, colors: {} });
export const useEnv = () => useContext(EnvCtx);

const HEX = /#[0-9a-fA-F]{6}\b/g;
/** Đổi mọi mã màu #RRGGBB trong chuỗi theo bảng màu người dùng chọn */
export const recolor = (s: string, colors: Record<string, string>) =>
  s.replace(HEX, (m) => colors[m.toUpperCase()] ?? m);
export const useK = () => {
  const { colors } = useEnv();
  return (s: string) => recolor(s, colors);
};
