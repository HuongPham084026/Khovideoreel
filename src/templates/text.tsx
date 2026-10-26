import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { abs, c, useIn } from "./anim";
import { useEnv } from "./env";
import { DISPLAY, SERIF, UI } from "./fonts";

export type Fields = Record<string, string>;
const num = (v: string | undefined, d: number) => {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : d;
};

/** Lớp chữ tự do: bạn tự gõ chữ, chọn font, cỡ, màu, vị trí và hiệu ứng */
export function TextLayer({ f }: { f: Fields }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { transparent } = useEnv();
  const anim = f.anim || "up";
  const inStyle = useIn(0, anim === "left" ? "left" : anim === "scale" ? "scale" : "up");
  const family = f.font === "display" ? DISPLAY : f.font === "serif" ? SERIF : UI;
  const text = f.text ?? "";
  const shown = anim === "typewriter" ? text.slice(0, Math.floor((frame / fps) * 18)) : text;
  const anchor = { left: "flex-start", center: "center", right: "flex-end" }[f.align || "center"] ?? "center";
  const sh = f.fx === "shadow" ? `0 ${c(0.6)}px ${c(1.6)}px rgba(0,0,0,0.55)` : f.fx === "outline" ? `0 0 ${c(0.4)}px #000, 0 0 ${c(0.8)}px #000, 0 0 ${c(1.2)}px #000` : "none";
  const motion = anim === "none" || anim === "typewriter" ? {} : anim === "fade" ? { opacity: inStyle.opacity } : inStyle;
  return (
    <AbsoluteFill style={{ background: transparent ? "transparent" : "#263238" }}>
    <div style={abs({ left: c(5), right: c(5), top: `${num(f.y, 50)}%`, transform: "translateY(-50%)", display: "flex", justifyContent: anchor })}>
      <div style={{
        ...motion, fontFamily: family, fontSize: c(num(f.size, 9)), fontWeight: num(f.weight, 800), lineHeight: 1.12,
        color: f.color || "#FFFFFF", textAlign: (f.align as "left" | "center" | "right") || "center", whiteSpace: "pre-wrap", textShadow: sh,
        background: f.box || "transparent", padding: f.box ? `${c(1.4)}px ${c(2.6)}px` : 0, borderRadius: c(2),
      }}>{shown}</div>
    </div>
    </AbsoluteFill>
  );
}
