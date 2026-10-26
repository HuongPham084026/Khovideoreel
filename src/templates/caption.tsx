import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { abs, c } from "./anim";
import { useEnv } from "./env";
import { DISPLAY, SERIF, UI } from "./fonts";

export type Fields = Record<string, string>;
export type CueWord = { w: string; s: number; e: number };
/** Một cụm phụ đề: s/e = giây tính từ đầu lớp phụ đề, t = chữ hiển thị, w = mốc từng từ (nếu có) để tô sáng đúng từ đang đọc */
export type Cue = { s: number; e: number; t: string; w?: CueWord[] };

export const parseCues = (raw: string | undefined): Cue[] => {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v : [];
  } catch { return []; }
};
const num = (v: string | undefined, d: number) => {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) ? n : d;
};

/** Phụ đề: hiện từng cụm 2–5 từ đúng lúc nói, tô sáng từ đang đọc */
export function CaptionLayer({ f }: { f: Fields }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { transparent } = useEnv();
  const cues = useMemo(() => parseCues(f.cues), [f.cues]);
  const t = frame / fps;
  const cue = cues.find((x) => t >= x.s && t < x.e);
  const family = f.font === "display" ? DISPLAY : f.font === "serif" ? SERIF : UI;
  const up = f.upper === "1";
  const sh = f.fx === "shadow" ? `0 ${c(0.6)}px ${c(1.6)}px rgba(0,0,0,0.6)` : f.fx === "outline" ? `0 0 ${c(0.4)}px #000, 0 0 ${c(0.8)}px #000, 0 0 ${c(1.2)}px #000` : "none";
  let body = null;
  if (cue) {
    const words = cue.t.split(/\s+/).filter(Boolean);
    const timed = cue.w && cue.w.length === words.length ? cue.w : null;
    const share = (cue.e - cue.s) / Math.max(1, words.length);
    body = words.map((w, i) => {
      const s = timed ? timed[i].s : cue.s + i * share;
      const e = timed ? timed[i].e : cue.s + (i + 1) * share;
      const on = t >= s && t < Math.max(e, s + 0.05);
      return <span key={i} style={{ color: on ? f.hi || "#FFEA88" : f.color || "#FFFFFF", transition: "none" }}>{(up ? w.toLocaleUpperCase("vi") : w) + (i < words.length - 1 ? " " : "")}</span>;
    });
  }
  return (
    <AbsoluteFill style={{ background: transparent ? "transparent" : "#263238" }}>
      {body && (
        <div style={abs({ left: c(6), right: c(6), top: `${num(f.y, 70)}%`, transform: "translateY(-50%)", display: "flex", justifyContent: "center" })}>
          <div style={{
            fontFamily: family, fontSize: c(num(f.size, 6.4)), fontWeight: num(f.weight, 800), lineHeight: 1.18, textAlign: "center", textShadow: sh,
            background: f.box || "transparent", padding: f.box ? `${c(1.2)}px ${c(2.4)}px` : 0, borderRadius: c(2),
          }}>{body}</div>
        </div>
      )}
    </AbsoluteFill>
  );
}
