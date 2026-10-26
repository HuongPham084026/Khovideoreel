import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { UI } from "./fonts";

/** 1 đơn vị = 1% chiều ngang khung 1080px (giống cqw trong bản HTML cũ) */
export const c = (n: number) => n * 10.8;

export type Kind = "up" | "left" | "scale";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Hiệu ứng xuất hiện, mờ dần ở 10 khung cuối để video lặp mượt */
export function useIn(delay = 0, kind: Kind = "up"): CSSProperties {
  const f = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const s = spring({ frame: f - delay, fps, config: { damping: 18, mass: 0.8 } });
  const out = interpolate(f, [durationInFrames - 10, durationInFrames - 1], [1, 0], clamp);
  const opacity = Math.min(1, s * 1.4) * out;
  const transform =
    kind === "left"
      ? `translateX(${(1 - s) * -c(14)}px)`
      : kind === "scale"
        ? `scale(${0.6 + 0.4 * s})`
        : `translateY(${(1 - s) * c(8)}px)`;
  return { opacity, transform };
}

/** Giá trị dao động 0..1 lặp theo chu kỳ (giây) */
export function useLoop(periodSec: number, offsetSec = 0) {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (Math.sin(((f / fps + offsetSec) / periodSec) * Math.PI * 2) + 1) / 2;
}

export function Frame({ bg, color = "#fff", children }: { bg: string; color?: string; children: ReactNode }) {
  return (
    <AbsoluteFill style={{ background: bg, color, fontFamily: UI, overflow: "hidden" }}>{children}</AbsoluteFill>
  );
}

/** Lưới hoặc chấm nền vẽ bằng SVG để xuất video giữ nguyên */
export function GridBg({ step, color }: { step: number; color: string }) {
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <pattern id={`g${step}${color.replace(/\W/g, "")}`} width={step} height={step} patternUnits="userSpaceOnUse">
          <path d={`M ${step} 0 L 0 0 0 ${step}`} fill="none" stroke={color} strokeWidth={2} />
        </pattern>
      </defs>
      <rect width="1080" height="1920" fill={`url(#g${step}${color.replace(/\W/g, "")})`} />
    </svg>
  );
}

export function DotBg({ step, r, color }: { step: number; r: number; color: string }) {
  const id = `d${step}${color.replace(/\W/g, "")}`;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <pattern id={id} width={step} height={step} patternUnits="userSpaceOnUse">
          <circle cx={step / 2} cy={step / 2} r={r} fill={color} />
        </pattern>
      </defs>
      <rect width="1080" height="1920" fill={`url(#${id})`} />
    </svg>
  );
}

export const abs = (s: CSSProperties): CSSProperties => ({ position: "absolute", ...s });
