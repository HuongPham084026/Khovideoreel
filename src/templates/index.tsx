import type { ComponentType, ReactNode } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { abs, c, DotBg, Frame, GridBg, useIn, useLoop } from "./anim";
import { useK } from "./env";
import { CaptionLayer } from "./caption";
import { TextLayer } from "./text";
import { DISPLAY, SERIF, UI } from "./fonts";

export type Fields = Record<string, string>;
export type FieldDef = {
  key: string; label: string; def: string; long?: boolean;
  type?: "color" | "select" | "number"; options?: [string, string][]; min?: number; max?: number; step?: number;
};
export type Template = {
  id: string;
  title: string;
  cat: string;
  seconds: number;
  hidden?: boolean; // mẫu dùng riêng trong trình chỉnh sửa (ví dụ phụ đề), không hiện trong kho
  palette: string[]; // các màu gốc của mẫu, đổi được trong trình chỉnh sửa
  fields: FieldDef[];
  scenes: [string, string][];
  how: string[];
  kw: string[];
  Comp: ComponentType<{ f: Fields }>;
};

export const FPS = 30;
export const W = 1080;
export const H = 1920;

const NEON = "#E4FF3A";

/* ---------- 1. Tin nóng AI ---------- */
function TinNong({ f }: { f: Fields }) {
  const K = useK();
  const frame = useCurrentFrame();
  const blink = Math.floor(frame / 15) % 2 === 0 ? 1 : 0.25;
  const tick = `${f.tick1}     •     ${f.tick2}     •     `;
  const x = -((frame * 6) % c(160));
  return (
    <Frame bg="linear-gradient(165deg,#0A1A52 0%,#1238C9 70%,#0A1A52 100%)">
      <GridBg step={c(8)} color="rgba(255,255,255,0.08)" />
      <div style={abs({ top: c(9), left: c(7), display: "flex", gap: c(2), alignItems: "center", fontWeight: 800, fontSize: c(3.6), letterSpacing: "0.08em" })}>
        <div style={{ width: c(3), height: c(3), borderRadius: "50%", background: K("#FF3B3B"), opacity: blink }} />
        <span style={{ background: K("#FF3B3B"), padding: `${c(0.8)}px ${c(2.4)}px`, borderRadius: c(1) }}>{f.live}</span>
      </div>
      <div style={abs({ left: c(7), right: c(7), top: "52%", fontFamily: DISPLAY, fontSize: c(19), lineHeight: 0.92, ...useIn(3, "left") })}>{f.title}</div>
      <div style={abs({ left: c(7), right: c(10), top: "73%", fontSize: c(4.6), lineHeight: 1.35, color: K("#C9D6FF"), fontWeight: 500, ...useIn(10) })}>{f.desc}</div>
      <div style={abs({ left: 0, right: 0, bottom: c(9), height: c(11), background: K("#FFFFFF"), display: "flex", alignItems: "center", overflow: "hidden" })}>
        <div style={{ flex: "none", height: "100%", display: "flex", alignItems: "center", background: K("#FF3B3B"), padding: `0 ${c(3)}px`, fontSize: c(3.6), fontWeight: 800, letterSpacing: "0.06em", zIndex: 1 }}>{f.bar}</div>
        <div style={{ flex: 1, height: "100%", overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, display: "flex", alignItems: "center", whiteSpace: "pre", color: K("#0A1A52"), fontWeight: 700, fontSize: c(3.8), transform: `translateX(${x}px)` }}>{tick + tick + tick}</div>
        </div>
      </div>
    </Frame>
  );
}

/* ---------- 2. Sắp ra mắt ---------- */
function SapRaMat({ f }: { f: Fields }) {
  const K = useK();
  const box = (n: string, l: string) => (
    <div style={{ background: K("#1A0A03"), color: K("#FFF4E6"), borderRadius: c(2), width: c(16), padding: `${c(2)}px 0`, textAlign: "center" }}>
      <div style={{ fontFamily: DISPLAY, fontSize: c(8), lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: c(2.6), fontWeight: 700, opacity: 0.75, marginTop: c(1) }}>{l}</div>
    </div>
  );
  return (
    <Frame bg="#FF5A1F" color="#1A0A03">
      <DotBg step={c(9)} r={c(1.1)} color="rgba(26,10,3,0.18)" />
      <div style={abs({ top: c(14), left: 0, right: 0, textAlign: "center", fontWeight: 800, fontSize: c(5), letterSpacing: "0.2em", ...useIn(0) })}>{f.date}</div>
      <div style={abs({ left: c(5), right: c(5), top: "30%", textAlign: "center", fontFamily: DISPLAY, fontSize: c(25), lineHeight: 1, color: K("#FFF4E6"), textShadow: K(`${c(1.4)}px ${c(1.4)}px 0 #1A0A03`), ...useIn(4, "scale") })}>{f.title}</div>
      <div style={abs({ left: 0, right: 0, top: "62%", textAlign: "center", fontWeight: 700, fontSize: c(4.8), ...useIn(12) })}>{f.sub}</div>
      <div style={abs({ bottom: c(16), left: 0, right: 0, display: "flex", justifyContent: "center", gap: c(2.4), ...useIn(16) })}>
        {box(f.d, "NGÀY")}{box(f.h, "GIỜ")}{box(f.m, "PHÚT")}
      </div>
    </Frame>
  );
}

/* ---------- 3. Review tool ---------- */
function Review({ f }: { f: Fields }) {
  const K = useK();
  return (
    <Frame bg="#CDB8FF" color="#1B1036">
      <div style={abs({ top: c(9), left: c(7), background: K("#1B1036"), color: K("#CDB8FF"), fontWeight: 800, fontSize: c(3.4), letterSpacing: "0.14em", padding: `${c(1.4)}px ${c(3)}px`, borderRadius: 999, ...useIn(0) })}>{f.tag}</div>
      <div style={abs({ top: c(19), left: c(7), right: c(7), fontWeight: 800, fontSize: c(10.5), lineHeight: 1.04, letterSpacing: "-0.02em", ...useIn(4) })}>{f.title}</div>
      <div style={abs({ left: c(19), bottom: -c(12), width: c(62), height: c(110), background: K("#1B1036"), borderRadius: c(9), padding: c(3), ...useIn(10) })}>
        <div style={{ width: "100%", height: "100%", borderRadius: c(6.5), background: K("linear-gradient(180deg,#FFFFFF 0%,#F1ECFF 100%)"), display: "flex", flexDirection: "column", alignItems: "center", paddingTop: c(12), gap: c(3) }}>
          <div style={{ width: c(18), height: c(18), borderRadius: c(5), background: K("linear-gradient(135deg,#7B5CFF,#E4FF3A)") }} />
          <div style={{ fontSize: c(6), letterSpacing: c(0.5), color: K("#F5B800") }}>★★★★★</div>
          <div style={{ fontFamily: DISPLAY, fontSize: c(15), lineHeight: 1 }}>
            {f.score}<span style={{ fontSize: c(6), opacity: 0.5 }}>/10</span>
          </div>
          {[100, 80, 60].map((w) => (
            <div key={w} style={{ width: `${w * 0.7}%`, height: c(2.4), borderRadius: c(2), background: K("#DCD3FF") }} />
          ))}
        </div>
      </div>
    </Frame>
  );
}

/* ---------- 4. So sánh ---------- */
function Versus({ f }: { f: Fields }) {
  const K = useK();
  const p = useLoop(1.4);
  const half = (top: boolean, label: string, name: string, a: string, b: string, st: object) => (
    <div style={abs({ left: 0, right: 0, height: "50%", [top ? "top" : "bottom"]: 0, background: top ? K("#111216") : K(NEON), color: top ? K("#FFFFFF") : K("#111216"), display: "flex", flexDirection: "column", justifyContent: "center", alignItems: top ? "flex-start" : "flex-end", textAlign: top ? "left" : "right", padding: `0 ${c(8)}px`, ...st })}>
      <div style={{ fontWeight: 700, fontSize: c(3.6), letterSpacing: "0.14em", opacity: 0.7 }}>{label}</div>
      <div style={{ fontFamily: DISPLAY, fontSize: c(19), lineHeight: 0.95 }}>{name}</div>
      <div style={{ fontSize: c(4.2), fontWeight: 600, lineHeight: 1.5, marginTop: c(2) }}>{a}<br />{b}</div>
    </div>
  );
  return (
    <Frame bg="#111216">
      {half(true, f.l1, f.a, f.a1, f.a2, useIn(0, "left"))}
      {half(false, f.l2, f.b, f.b1, f.b2, useIn(8))}
      <div style={abs({ top: "50%", left: "50%", width: c(22), height: c(22), marginLeft: -c(11), marginTop: -c(11), borderRadius: "50%", background: K("#FF3B6B"), color: K("#FFFFFF"), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontSize: c(9), border: K(`${c(1.6)}px solid #111216`), transform: `scale(${1 + p * 0.12})` })}>VS</div>
      <div style={abs({ bottom: c(6), left: 0, right: 0, textAlign: "center", fontWeight: 800, fontSize: c(4.6), color: K("#111216"), ...useIn(16) })}>{f.q}</div>
    </Frame>
  );
}

/* ---------- 5. Trích dẫn podcast ---------- */
function Quote({ f }: { f: Fields }) {
  const K = useK();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bars = Array.from({ length: 14 }, (_, i) => 0.35 + 0.65 * ((Math.sin((frame / fps) * 6 + i * 1.7) + 1) / 2));
  return (
    <Frame bg="#1D1813" color="#F3E9DC">
      <div style={abs({ top: c(2), left: c(6), fontFamily: SERIF, fontStyle: "italic", fontSize: c(40), lineHeight: 1, color: K(NEON) })}>“</div>
      <div style={abs({ left: c(8), right: c(8), top: c(36), fontFamily: SERIF, fontStyle: "italic", fontWeight: 600, fontSize: c(8.6), lineHeight: 1.22, ...useIn(3) })}>{f.quote}</div>
      <div style={abs({ left: c(8), bottom: c(34), fontSize: c(3.8), letterSpacing: "0.12em", fontWeight: 700, color: K("#C9B9A3"), ...useIn(12) })}>{f.who}</div>
      <div style={abs({ right: c(8), bottom: c(34), fontSize: c(3.8), color: K("#C9B9A3"), ...useIn(12) })}>{f.ep}</div>
      <div style={abs({ left: c(8), right: c(8), bottom: c(14), height: c(12), display: "flex", alignItems: "center", gap: c(1.4) })}>
        {bars.map((s, i) => (
          <div key={i} style={{ flex: 1, height: `${s * 100}%`, background: K(NEON), borderRadius: c(2) }} />
        ))}
      </div>
    </Frame>
  );
}

/* ---------- 6. Hook chữ lớn ---------- */
function Hook({ f }: { f: Fields }) {
  const K = useK();
  const bob = useLoop(1.2) * c(3);
  const line = { fontFamily: DISPLAY, fontSize: c(21), lineHeight: 1.08 };
  const up = (x: string) => x.toLocaleUpperCase("vi");
  return (
    <Frame bg={K(NEON)} color="#111216">
      <div style={abs({ top: c(10), left: c(6), fontWeight: 800, fontSize: c(4), letterSpacing: "0.14em", borderBottom: K(`${c(0.8)}px solid #111216`), paddingBottom: c(1), ...useIn(0) })}>{f.top}</div>
      <div style={abs({ left: c(6), right: c(6), top: "24%", display: "flex", flexDirection: "column", alignItems: "flex-start" })}>
        <div style={{ ...line, ...useIn(2, "left") }}>{up(f.l1)}</div>
        <div style={{ ...line, ...useIn(7, "left") }}>{up(f.l2)}</div>
        <div style={{ ...line, background: K("#111216"), color: K(NEON), padding: `0 ${c(2.4)}px`, marginLeft: -c(2.4), ...useIn(12, "left") }}>{up(f.l3)}</div>
        <div style={{ ...line, ...useIn(17, "left") }}>{up(f.l4)}</div>
      </div>
      <div style={abs({ bottom: c(12), right: c(8), fontWeight: 700, fontSize: c(4.4), transform: `translateY(${bob}px)` })}>{f.hint}</div>
    </Frame>
  );
}

/* ---------- 7. 3 bước ---------- */
function Steps({ f }: { f: Fields }) {
  const K = useK();
  const item = (n: string, t: string, d: string, delay: number) => (
    <div style={{ display: "flex", gap: c(4), alignItems: "flex-start", background: K("#FFFFFF"), border: K(`${c(0.5)}px solid #121318`), borderRadius: c(4), padding: c(4), boxShadow: K(`${c(1.4)}px ${c(1.4)}px 0 #121318`), ...useIn(delay, "left") }}>
      <div style={{ fontFamily: DISPLAY, fontSize: c(10), lineHeight: 0.9, color: K("#5A3DF0") }}>{n}</div>
      <div>
        <div style={{ fontSize: c(4.8), fontWeight: 700, lineHeight: 1.25 }}>{t}</div>
        <div style={{ fontSize: c(3.8), fontWeight: 500, color: K("#646877") }}>{d}</div>
      </div>
    </div>
  );
  return (
    <Frame bg="#FBFBF8" color="#121318">
      <GridBg step={c(6)} color="#E9EAF0" />
      <div style={abs({ top: c(12), left: c(7), right: c(7), fontWeight: 800, fontSize: c(10.5), lineHeight: 1.05, letterSpacing: "-0.02em", ...useIn(0) })}>
        {f.title} <span style={{ background: K(NEON), padding: `0 ${c(1.6)}px` }}>{f.hl}</span>
      </div>
      <div style={abs({ left: c(7), right: c(7), top: c(66), display: "flex", flexDirection: "column", gap: c(5) })}>
        {item(f.n1, f.s1, f.d1, 6)}{item(f.n2, f.s2, f.d2, 11)}{item(f.n3, f.s3, f.d3, 16)}
      </div>
    </Frame>
  );
}

/* ---------- 8. Bình luận nhận quà ---------- */
function Cta({ f }: { f: Fields }) {
  const K = useK();
  const bob = useLoop(1) * c(3);
  return (
    <Frame bg="linear-gradient(170deg,#C41E7A,#5B1AA8)">
      <div style={abs({ top: "28%", left: 0, right: 0, textAlign: "center", fontWeight: 700, fontSize: c(6.4), ...useIn(0) })}>{f.top}</div>
      <div style={abs({ top: "36%", left: 0, right: 0, display: "flex", justifyContent: "center", ...useIn(5, "scale") })}>
        <div style={{ background: K(NEON), color: K("#111216"), fontFamily: DISPLAY, fontSize: c(28), lineHeight: 1, padding: `${c(3)}px ${c(9)}px`, borderRadius: c(5), boxShadow: `0 0 0 ${c(1.6)}px rgba(228,255,58,0.25)` }}>{f.kw}</div>
      </div>
      <div style={abs({ top: "60%", left: c(8), right: c(8), textAlign: "center", fontWeight: 700, fontSize: c(5.6), lineHeight: 1.3, ...useIn(12) })}>{f.gift}</div>
      <svg viewBox="0 0 24 24" style={abs({ bottom: c(12), left: c(44), width: c(12), height: c(12), transform: `translateY(${bob}px)` })} fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round">
        <path d="M12 4v15M5 12l7 7 7-7" />
      </svg>
    </Frame>
  );
}

/* ---------- 9. Ra mắt sản phẩm số ---------- */
function Ebook({ f }: { f: Fields }) {
  const K = useK();
  const t = useLoop(3);
  return (
    <Frame bg="#0E6B60" color="#EFFFF9">
      <div style={abs({ width: c(120), height: c(120), borderRadius: "50%", border: `${c(0.6)}px solid rgba(239,255,249,0.18)`, left: -c(10), top: c(28) })} />
      <div style={abs({ top: c(10), left: c(7), fontWeight: 800, fontSize: c(3.6), letterSpacing: "0.16em", color: K(NEON), ...useIn(0) })}>{f.tag}</div>
      <div style={abs({ top: c(16), left: c(7), right: c(7), fontFamily: DISPLAY, fontSize: c(15), lineHeight: 0.98, ...useIn(4) })}>{f.name}</div>
      <div style={abs({ left: c(24), top: c(76), width: c(52), height: c(70), ...useIn(10) })}>
        <div style={{ width: "100%", height: "100%", background: K("#F7F3EA"), borderRadius: `${c(1.4)}px ${c(3)}px ${c(3)}px ${c(1.4)}px`, boxShadow: `${c(4)}px ${c(6)}px 0 rgba(0,0,0,0.25)`, color: K("#0E6B60"), padding: `${c(7)}px ${c(6)}px`, position: "relative", transform: `rotate(${-2 * t}deg) translateY(${-c(2) * t}px)`, borderLeft: K(`${c(2)}px solid #C9C1B0`) }}>
          <div style={{ fontFamily: DISPLAY, fontSize: c(9), lineHeight: 1 }}>{f.cover}</div>
          <div style={{ marginTop: c(2), fontSize: c(3.6), fontWeight: 600, color: K("#3C5A55") }}>{f.coverSub}</div>
          <div style={abs({ left: c(6), right: c(6), bottom: c(7), height: c(2), background: K(NEON), borderRadius: c(2) })} />
        </div>
      </div>
      <div style={abs({ right: c(7), bottom: c(12), ...useIn(16, "scale") })}>
        <div style={{ background: K(NEON), color: K("#0B2B27"), fontFamily: DISPLAY, fontSize: c(11), padding: `${c(1)}px ${c(4)}px`, borderRadius: c(3), transform: "rotate(-6deg)" }}>{f.price}</div>
      </div>
    </Frame>
  );
}

/* ---------- 10. Cảm ơn đã xem ---------- */
function Outro({ f }: { f: Fields }) {
  const K = useK();
  const btn = (t: string, solid: boolean, d: number) => (
    <div style={{ textAlign: "center", borderRadius: 999, padding: `${c(3)}px 0`, fontWeight: 700, fontSize: c(4.4), border: K(`${c(0.5)}px solid #FFFFFF`), background: solid ? K("#FFFFFF") : "transparent", color: solid ? K("#0C0D11") : K("#FFFFFF"), ...useIn(d) }}>{t}</div>
  );
  return (
    <Frame bg="#0C0D11">
      <div style={abs({ top: "30%", left: c(33), width: c(34), height: c(34), ...useIn(0, "scale") })}>
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: K(NEON), color: K("#0C0D11"), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontSize: c(16), boxShadow: K(`0 0 0 ${c(2)}px #0C0D11, 0 0 0 ${c(2.8)}px ${NEON}`) }}>{f.initial}</div>
      </div>
      <div style={abs({ top: "54%", left: 0, right: 0, textAlign: "center", fontFamily: DISPLAY, fontSize: c(12), ...useIn(6) })}>{f.thanks}</div>
      <div style={abs({ top: "62%", left: 0, right: 0, textAlign: "center", fontSize: c(4.2), color: K("#9A9EAD"), fontWeight: 600, ...useIn(9) })}>{f.handle}</div>
      <div style={abs({ bottom: c(16), left: c(10), right: c(10), display: "flex", flexDirection: "column", gap: c(3) })}>
        {btn(f.b1, true, 13)}{btn(f.b2, false, 16)}
      </div>
    </Frame>
  );
}

/* ---------- 11. Khoe kết quả ---------- */
function Proof({ f }: { f: Fields }) {
  const K = useK();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const heights = [18, 24, 31, 46, 63, 100];
  return (
    <Frame bg="#0F2A1D" color="#E9FFF2">
      <div style={abs({ top: c(10), left: c(7), fontWeight: 700, fontSize: c(3.6), letterSpacing: "0.14em", color: K("#8FD9B0"), ...useIn(0) })}>{f.label}</div>
      <div style={abs({ top: c(16), left: c(6), fontFamily: DISPLAY, fontSize: c(30), lineHeight: 1, color: K(NEON), ...useIn(3, "scale") })}>{f.num}</div>
      <div style={abs({ top: c(53), left: c(7), right: c(7), fontSize: c(5.2), fontWeight: 600, lineHeight: 1.3, ...useIn(9) })}>{f.desc}</div>
      <div style={abs({ left: c(7), right: c(7), bottom: c(16), height: c(68), display: "flex", alignItems: "flex-end", gap: c(3), borderBottom: `${c(0.5)}px solid rgba(233,255,242,0.35)` })}>
        {heights.map((h, i) => {
          const g = Math.min(1, Math.max(0, (frame - (6 + i * 3)) / (fps * 0.5)));
          return <div key={i} style={{ flex: 1, height: `${h * (1 - Math.pow(1 - g, 3))}%`, background: i === 5 ? K(NEON) : K("#2E7A52"), borderRadius: `${c(1.6)}px ${c(1.6)}px 0 0` }} />;
        })}
      </div>
      <div style={abs({ left: c(7), right: c(7), bottom: c(9), display: "flex", justifyContent: "space-between", fontSize: c(3.4), color: K("#8FD9B0") })}>
        {["T1", "T2", "T3", "T4", "T5", "T6"].map((t) => <span key={t}>{t}</span>)}
      </div>
    </Frame>
  );
}

/* ---------- 12. Một ngày ---------- */
function Vlog({ f }: { f: Fields }) {
  const K = useK();
  const row = (t: string, d: string, delay: number) => (
    <div style={{ position: "relative", ...useIn(delay, "left") }}>
      <div style={abs({ left: -c(9.4), top: c(1.2), width: c(3.6), height: c(3.6), borderRadius: "50%", background: K("#FF5A1F"), border: K(`${c(0.6)}px solid #2A140B`) })} />
      <div style={{ fontFamily: DISPLAY, fontSize: c(6.8), lineHeight: 1 }}>{t}</div>
      <div style={{ fontSize: c(4.4), fontWeight: 600 }}>{d}</div>
    </div>
  );
  return (
    <Frame bg="#FFE3D3" color="#2A140B">
      <div style={abs({ top: c(10), left: c(7), right: c(7), ...useIn(0) })}>
        <div style={{ fontFamily: DISPLAY, fontSize: c(14), lineHeight: 0.98 }}>{f.title}</div>
        <div style={{ fontWeight: 600, fontSize: c(4.4), marginTop: c(2) }}>{f.sub}</div>
      </div>
      <div style={abs({ left: c(7), right: c(7), top: c(56), paddingLeft: c(7), borderLeft: K(`${c(0.6)}px dashed #2A140B`), display: "flex", flexDirection: "column", gap: c(6) })}>
        {row(f.t1, f.v1, 6)}{row(f.t2, f.v2, 10)}{row(f.t3, f.v3, 14)}{row(f.t4, f.v4, 18)}
      </div>
    </Frame>
  );
}

/* ---------- 13. Bài học đắt giá (ảnh + chú thích) ---------- */
function BaiHoc({ f }: { f: Fields }) {
  const K = useK();
  const p = useLoop(3);
  return (
    <Frame bg="#1238C9" color="#FFFFFF">
      <div style={abs({ left: c(6), right: c(6), top: c(8), height: c(120), borderRadius: c(6), background: K("linear-gradient(160deg,#7FB6FF 0%,#FFD0A8 100%)"), overflow: "hidden", ...useIn(0, "scale") })}>
        <div style={abs({ left: c(-8), top: c(60) , width: c(70), height: c(70), borderRadius: "50%", background: "rgba(255,255,255,0.35)", transform: `translateY(${-p * c(4)}px)` })} />
        <div style={abs({ right: c(-10), top: c(14), width: c(56), height: c(56), borderRadius: "50%", background: "rgba(255,255,255,0.28)", transform: `translateY(${p * c(4)}px)` })} />
      </div>
      <div style={abs({ left: c(6), top: c(114), ...useIn(5, "left") })}>
        <span style={{ display: "inline-block", background: K("#FFC21A"), color: K("#1A1A1A"), fontFamily: SERIF, fontSize: c(8.4), padding: `${c(1)}px ${c(3)}px`, boxShadow: "0 8px 0 rgba(0,0,0,0.18)" }}>{f.title}</span>
      </div>
      <div style={abs({ left: c(12), top: c(129), ...useIn(10, "left") })}>
        <span style={{ display: "inline-block", background: K("#FFC21A"), color: K("#1A1A1A"), fontFamily: SERIF, fontSize: c(6.2), padding: `${c(0.8)}px ${c(3)}px`, boxShadow: "0 8px 0 rgba(0,0,0,0.18)" }}>{f.sub}</span>
      </div>
      <div style={abs({ left: 0, right: 0, bottom: c(8), textAlign: "center", fontSize: c(3.6), fontWeight: 600, color: K("#C9D6FF"), ...useIn(14) })}>{f.handle}</div>
    </Frame>
  );
}

/* ---------- 14. Đang tải rồi ra mắt ---------- */
function TaiRaMat({ f }: { f: Fields }) {
  const K = useK();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const split = fps * 2;
  const loading = frame < split;
  const reveal = Math.min(1, Math.max(0, (frame - split) / (fps * 0.6)));
  const spin = Math.floor(frame / 4) % 8;
  return (
    <Frame bg={loading ? "#E6E6E6" : "#D9C7B0"} color="#2A2420">
      {loading ? (
        <>
          <div style={abs({ left: c(30), top: c(78), width: c(40), height: c(40) })}>
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              const on = (i - spin + 8) % 8 === 0;
              return <div key={i} style={abs({ left: c(20) + Math.sin(a) * c(14) - c(3.5), top: c(20) - Math.cos(a) * c(14) - c(3.5), width: c(7), height: c(7), borderRadius: "50%", background: K("#FFFFFF"), opacity: on ? 0.35 : 1 })} />;
            })}
          </div>
          <div style={abs({ left: 0, right: 0, top: c(124), textAlign: "center", fontFamily: SERIF, fontStyle: "italic", fontSize: c(5), letterSpacing: "0.12em", color: K("#8A8A8A") })}>{f.loading}</div>
        </>
      ) : (
        <>
          <div style={abs({ left: 0, right: 0, top: c(36), textAlign: "center", fontFamily: SERIF, fontStyle: "italic", fontSize: c(6), letterSpacing: "0.1em", opacity: reveal })}>{f.tag}</div>
          <div style={abs({ left: c(6), right: c(6), top: c(58), textAlign: "center", fontFamily: SERIF, fontStyle: "italic", fontSize: c(17), lineHeight: 1.08, opacity: reveal, transform: `scale(${0.85 + 0.15 * reveal})` })}>{f.name}</div>
          <div style={abs({ left: 0, right: 0, bottom: c(22), textAlign: "center", fontWeight: 700, fontSize: c(4.2), letterSpacing: "0.12em", opacity: reveal })}>{f.cta}</div>
        </>
      )}
    </Frame>
  );
}

/* ---------- 15. Dịch vụ của tôi ---------- */
function DichVu({ f }: { f: Fields }) {
  const K = useK();
  const card = (tag: string, t: string, d: string, delay: number) => (
    <div style={{ background: K("#1B1D24"), border: K("2px solid #2C2F3A"), borderRadius: c(5), padding: c(4.4), ...useIn(delay, "left") }}>
      <div style={{ display: "inline-block", background: K(NEON), color: K("#111216"), fontWeight: 800, fontSize: c(3), letterSpacing: "0.1em", padding: `${c(0.8)}px ${c(2.6)}px`, borderRadius: 999 }}>{tag}</div>
      <div style={{ fontSize: c(5.6), fontWeight: 800, lineHeight: 1.22, marginTop: c(2) }}>{t}</div>
      <div style={{ fontSize: c(3.8), fontWeight: 500, color: K("#9A9EAD"), marginTop: c(1) }}>{d}</div>
    </div>
  );
  return (
    <Frame bg="#101114" color="#FFFFFF">
      <GridBg step={c(8)} color="rgba(255,255,255,0.05)" />
      <div style={abs({ top: c(11), left: c(7), right: c(7), fontWeight: 800, fontSize: c(11), lineHeight: 1.08, ...useIn(0) })}>
        {f.title} <span style={{ color: K(NEON) }}>{f.hl}</span>
      </div>
      <div style={abs({ left: c(7), right: c(7), top: c(52), display: "flex", flexDirection: "column", gap: c(3.6) })}>
        {card(f.g1, f.t1, f.d1, 6)}{card(f.g2, f.t2, f.d2, 11)}{card(f.g3, f.t3, f.d3, 16)}
      </div>
      <div style={abs({ left: 0, right: 0, bottom: c(9), textAlign: "center", fontWeight: 600, fontSize: c(3.8), color: K("#9A9EAD"), ...useIn(19) })}>{f.foot}</div>
    </Frame>
  );
}

/* ---------- 16. Vì sao app này hợp bạn ---------- */
function VaiTinhNang({ f }: { f: Fields }) {
  const K = useK();
  const t = useLoop(2.4);
  const bubble = (txt: string, x: number, y: number, delay: number, ph: number) => (
    <div style={abs({ left: c(x), top: c(y), background: K("#FFFFFF"), color: K("#0B1F6B"), fontWeight: 800, fontSize: c(3.8), padding: `${c(1.8)}px ${c(3.4)}px`, borderRadius: c(3), boxShadow: "0 10px 0 rgba(0,0,0,0.18)", ...useIn(delay, "scale"), marginTop: Math.sin(t * Math.PI * 2 + ph) * c(1.2) })}>{txt}</div>
  );
  return (
    <Frame bg="linear-gradient(180deg,#0A2BC0 0%,#1B49E8 100%)" color="#FFFFFF">
      <div style={abs({ top: c(8), left: 0, right: 0, textAlign: "center", fontWeight: 600, fontSize: c(3.8), opacity: 0.8, ...useIn(0) })}>{f.brand}</div>
      <div style={abs({ top: c(14), left: c(6), right: c(6), textAlign: "center", fontWeight: 800, fontSize: c(10), lineHeight: 1.1, ...useIn(2) })}>{f.title}</div>
      <div style={abs({ left: c(27), top: c(58), width: c(46), height: c(92), background: K("#0B1033"), borderRadius: c(8), padding: c(2), ...useIn(6) })}>
        <div style={{ width: "100%", height: "100%", borderRadius: c(6.4), background: K("linear-gradient(180deg,#FFFFFF,#E4EBFF)"), padding: c(3), display: "flex", flexDirection: "column", gap: c(2.4) }}>
          {[80, 100, 64, 90].map((w, i) => <div key={i} style={{ width: `${w}%`, height: i === 1 ? c(16) : c(3.4), borderRadius: c(1.6), background: K(i === 1 ? "#B8C8FF" : "#D5DEFF") }} />)}
        </div>
      </div>
      {bubble(f.b1, 6, 70, 10, 0)}{bubble(f.b2, 62, 94, 14, 2)}{bubble(f.b3, 8, 118, 18, 4)}
      <div style={abs({ left: 0, right: 0, bottom: c(8), textAlign: "center", fontWeight: 700, fontSize: c(4), ...useIn(20) })}>{f.foot}</div>
    </Frame>
  );
}

/* ---------- 17. Cẩm nang cho người mới ---------- */
function CamNang({ f }: { f: Fields }) {
  const K = useK();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hs = [28, 40, 34, 56, 48, 72, 64, 90];
  return (
    <Frame bg="#2F7BEF" color="#10224F">
      <div style={abs({ left: c(8), right: c(8), top: c(14), bottom: c(36), background: K("#FFFFFF"), borderRadius: c(7), padding: c(5), boxShadow: "0 14px 0 rgba(0,0,0,0.16)", ...useIn(0, "scale") })}>
        <div style={{ height: c(62), borderRadius: c(4), background: K("#EEF3FF"), display: "flex", alignItems: "flex-end", gap: c(1.6), padding: `0 ${c(3)}px`, borderBottom: K("4px solid #2F7BEF") }}>
          {hs.map((h, i) => {
            const g = Math.min(1, Math.max(0, (frame - (6 + i * 2)) / (fps * 0.5)));
            return <div key={i} style={{ flex: 1, height: `${h * (1 - Math.pow(1 - g, 3))}%`, background: K(i === 7 ? "#10224F" : "#2F7BEF"), borderRadius: `${c(1)}px ${c(1)}px 0 0` }} />;
          })}
        </div>
        <div style={{ fontWeight: 800, fontSize: c(9.4), lineHeight: 1.1, marginTop: c(5), ...useIn(8) }}>{f.title}</div>
        <div style={{ fontWeight: 500, fontSize: c(4.2), lineHeight: 1.35, marginTop: c(2), color: K("#4A5A86"), ...useIn(12) }}>{f.sub}</div>
      </div>
      <div style={abs({ left: 0, right: 0, bottom: c(8), textAlign: "center", fontWeight: 700, fontSize: c(4), color: K("#FFFFFF"), ...useIn(15) })}>{f.handle}</div>
    </Frame>
  );
}

/* ---------- 18. Hẹn gặp lại và liên hệ ---------- */
function LienHe({ f }: { f: Fields }) {
  const K = useK();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const second = frame >= fps * 2;
  const i0 = useIn(0, "scale"), i1 = useIn(fps * 2), i2 = useIn(fps * 2 + 6), i3 = useIn(fps * 2 + 10);
  const pill = (t: string, st: object) => <div style={{ background: K("#0A84FF"), borderRadius: 999, padding: `${c(2)}px ${c(6)}px`, fontWeight: 800, fontSize: c(5), ...st }}>{t}</div>;
  return (
    <Frame bg="#0C0D11" color="#FFFFFF">
      {!second ? (
        <div style={abs({ top: c(66), left: c(12), width: c(76), height: c(76), borderRadius: "50%", background: K("#0A84FF"), display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontWeight: 800, fontSize: c(11), lineHeight: 1.1, ...i0 })}>{f.bye}</div>
      ) : (
        <div style={abs({ top: c(52), left: c(8), right: c(8), display: "flex", flexDirection: "column", gap: c(4) })}>
          <div style={{ fontWeight: 800, fontSize: c(11), ...i1 }}>{f.contact}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: c(3), alignItems: "flex-start" }}>{pill(f.p1, i2)}{pill(f.p2, i3)}</div>
        </div>
      )}
    </Frame>
  );
}

/* ---------- Mẫu khuyến mãi ---------- */
/** Độ mờ của một đoạn thời gian [a, b] giây, có mờ vào/ra 0.25 giây */
function useSeg(a: number, b: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  return Math.max(0, Math.min(1, Math.min((t - a) / 0.25, (b - t) / 0.25)));
}

/* ---------- 19. Giảm giá độc quyền ---------- */
function GiamGiaDQ({ f }: { f: Fields }) {
  const K = useK();
  const p = useLoop(2.6);
  return (
    <Frame bg="#07080C" color="#FFFFFF">
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs><linearGradient id="gdq" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={K("#19C6FF")} /><stop offset="1" stopColor={K("#A7FF3A")} /></linearGradient></defs>
        <path d="M -40 330 L 360 -40" stroke="url(#gdq)" strokeWidth={6} fill="none" />
        <path d="M 1120 1180 L 780 1960" stroke="url(#gdq)" strokeWidth={6} fill="none" />
        <path d="M 1120 170 L 760 -40" stroke="url(#gdq)" strokeWidth={3} fill="none" opacity={0.6} />
      </svg>
      <div style={abs({ top: c(9), left: 0, right: 0, textAlign: "center", ...useIn(0) })}>
        <div style={{ fontWeight: 800, fontSize: c(5), letterSpacing: "0.1em" }}>{f.brand}</div>
        <div style={{ fontWeight: 500, fontSize: c(3), letterSpacing: "0.12em", opacity: 0.8 }}>{f.cat}</div>
      </div>
      <div style={abs({ top: c(36), left: c(8), right: c(8), textAlign: "center", fontWeight: 800, fontSize: c(10.4), lineHeight: 1.22, ...useIn(3) })}>{f.title}</div>
      <div style={abs({ top: c(82), left: 0, right: 0, textAlign: "center", fontWeight: 700, fontSize: c(5), color: K("#A7FF3A"), ...useIn(9) })}>{f.off}</div>
      <div style={abs({ top: c(92), left: 0, right: 0, textAlign: "center", fontWeight: 600, fontSize: c(3.2), letterSpacing: "0.04em", ...useIn(11) })}>{f.url}</div>
      <div style={abs({ top: c(104), left: c(20), right: c(20), textAlign: "center", background: K("linear-gradient(90deg,#19C6FF,#A7FF3A)"), color: K("#07080C"), fontWeight: 800, fontSize: c(3.6), padding: `${c(1.4)}px 0`, transform: `scale(${1 + p * 0.03})`, ...useIn(13) })}>{f.tag}</div>
      <div style={abs({ left: 0, right: 0, bottom: 0, height: c(60), background: K("linear-gradient(180deg,#1C2A25 0%,#3F5A4A 100%)"), ...useIn(6) })}>
        <div style={abs({ left: c(34), top: c(8), width: c(32), height: c(32), borderRadius: "50%", background: K("#C9A88F") })} />
        <div style={abs({ left: c(20), top: c(40), width: c(60), height: c(40), borderRadius: `${c(30)}px ${c(30)}px 0 0`, background: K("#2D3B36") })} />
      </div>
    </Frame>
  );
}

/* ---------- 20. Ưu đãi Black Friday neon ---------- */
function BlackFriday({ f }: { f: Fields }) {
  const K = useK();
  const p = useLoop(2.4);
  const glow = `0 0 ${c(2)}px ${K("#7CFF6B")}, 0 0 ${c(5)}px ${K("#3DDC4A")}`;
  return (
    <Frame bg="#050507" color="#FFFFFF">
      <GridBg step={c(10)} color="rgba(255,120,40,0.12)" />
      <div style={abs({ top: c(9), left: c(8), fontWeight: 800, fontSize: c(3.6), lineHeight: 1.25, letterSpacing: "0.04em", whiteSpace: "pre-line", ...useIn(0) })}>{f.top}</div>
      <div style={abs({ left: c(8), top: c(34), width: c(84), height: c(84), borderRadius: "50%", background: K("linear-gradient(160deg,#FF8A1F 0%,#E8307A 55%,#4B4BFF 100%)"), transform: `rotate(${-18 + p * 6}deg) scaleY(0.82)`, filter: "blur(2px)", ...useIn(1, "scale") })} />
      <div style={abs({ left: c(6), right: c(6), top: c(46), textAlign: "center", fontWeight: 800, fontSize: c(9.4), lineHeight: 1.2, color: K("#D6FFC0"), textShadow: glow, ...useIn(4) })}>{f.title}</div>
      <div style={abs({ left: c(8), right: c(8), top: c(130), textAlign: "center", fontWeight: 700, fontSize: c(3.8), lineHeight: 1.6, ...useIn(10) })}>{f.l1}<br />{f.l2}</div>
      <div style={abs({ left: c(8), right: c(8), top: c(150), textAlign: "center", fontWeight: 700, fontSize: c(3.2), color: K("#FFB36B"), ...useIn(13) })}>{f.l3}</div>
    </Frame>
  );
}

/* ---------- 21. Đặt ngay giảm giá + nhập mã ---------- */
function DatNgay({ f }: { f: Fields }) {
  const K = useK();
  const a = useSeg(-1, 3.1), b = useSeg(3.1, 99);
  const win = (
    <div style={{ background: K("#0E0F13"), border: K(`${c(0.5)}px solid #FFFFFF`), borderRadius: c(2) }}>
      <div style={{ display: "flex", gap: c(1.2), padding: c(2) }}>{[0, 1, 2].map((i) => <div key={i} style={{ width: c(2), height: c(2), borderRadius: "50%", background: K("#FFFFFF"), opacity: 0.8 }} />)}</div>
      <div style={{ height: c(78), background: K("linear-gradient(135deg,#3A0508,#0A0A0C)"), position: "relative", overflow: "hidden" }}>
        <div style={abs({ left: c(30), top: c(6), width: c(32), height: c(66), borderRadius: c(5), background: K("linear-gradient(160deg,#E02B2B,#4A0C10)"), transform: "rotate(14deg)" })} />
      </div>
    </div>
  );
  return (
    <Frame bg="#0A0A0C" color="#FFFFFF">
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}><path d="M 0 880 L 380 740 L 520 940 L 0 1280 Z" fill={K("#C71D24")} opacity={0.9} /></svg>
      <div style={abs({ top: c(9), left: c(8), fontWeight: 800, fontSize: c(3.8), ...useIn(0) })}>{f.brand}</div>
      <div style={abs({ left: c(8), right: c(8), top: c(22), opacity: a })}>
        <div style={{ fontWeight: 600, fontSize: c(8.2), lineHeight: 1.25 }}>{f.head}</div>
        <div style={{ fontSize: c(3.8), opacity: 0.8, marginTop: c(5) }}>{f.sub}</div>
        <div style={{ fontSize: c(9), marginTop: c(3) }}>→</div>
      </div>
      <div style={abs({ left: c(8), right: c(8), top: c(22), opacity: b })}>
        <div style={{ fontWeight: 600, fontSize: c(8.2), lineHeight: 1.25 }}>{f.codeLabel}</div>
        <div style={{ display: "inline-block", marginTop: c(2), background: K(NEON), color: K("#111216"), fontFamily: DISPLAY, fontSize: c(11), padding: `${c(0.6)}px ${c(3)}px` }}>{f.code}</div>
        <div style={{ fontSize: c(3.8), opacity: 0.8, marginTop: c(3) }}>{f.note}</div>
      </div>
      <div style={abs({ left: c(8), right: c(8), top: c(76), ...useIn(6, "scale") })}>{win}</div>
    </Frame>
  );
}

/* ---------- 22. Chưa bao giờ dễ dàng đến thế → Mua ngay ---------- */
function MuaNgay({ f }: { f: Fields }) {
  const K = useK();
  const a = useSeg(-1, 3), b = useSeg(3, 99);
  return (
    <Frame bg="#FFD92E" color="#111216">
      <div style={abs({ left: c(5), right: c(5), top: c(6), height: c(100), borderRadius: c(2), background: K("linear-gradient(160deg,#B8B8B8,#6F6F6F)"), ...useIn(0, "scale") })}>
        <div style={abs({ left: c(24), top: c(26), width: c(34), height: c(48), borderRadius: c(5), background: K("#F2A81D") })} />
        <div style={abs({ left: c(40), top: c(10), width: c(24), height: c(24), borderRadius: "50%", background: K("#E8C7A6") })} />
      </div>
      <div style={abs({ left: 0, right: c(14), top: c(86), background: K("#111216"), color: K("#FFD92E"), padding: `${c(3)}px ${c(5)}px`, opacity: a })}>
        <div style={{ color: K("#FFFFFF"), fontSize: c(3), letterSpacing: "0.16em", fontWeight: 600, textAlign: "center" }}>{f.small}</div>
        <div style={{ fontFamily: DISPLAY, fontSize: c(8.4), lineHeight: 1.2, textAlign: "center", marginTop: c(1) }}>{f.l1}<br />{f.l2}</div>
      </div>
      <div style={abs({ left: 0, right: 0, top: c(112), textAlign: "center", opacity: b })}>
        <div style={{ fontFamily: DISPLAY, fontSize: c(17), lineHeight: 1.1 }}>{f.buy}</div>
        <div style={{ display: "inline-block", marginTop: c(4), background: K("#111216"), color: K("#FFFFFF"), fontWeight: 700, fontSize: c(4), padding: `${c(2)}px ${c(6)}px` }}>{f.url}</div>
      </div>
    </Frame>
  );
}

/* ---------- 23. Giảm giá + ghé cửa hàng ---------- */
function GiamGiaCuaHang({ f }: { f: Fields }) {
  const K = useK();
  const a = useSeg(-1, 3), b = useSeg(3, 99);
  return (
    <Frame bg="linear-gradient(160deg,#F26B21 0%,#F7B21A 100%)" color="#FFFFFF">
      <div style={abs({ left: 0, right: 0, top: 0, height: c(112), background: K("linear-gradient(160deg,#9A9A9A,#5D5D5D)"), opacity: a })}>
        <div style={abs({ left: c(14), top: c(46), width: c(72), height: c(44), borderRadius: c(3), background: K("#D9DCE0"), transform: "perspective(900px) rotateX(18deg)" })} />
      </div>
      <div style={abs({ left: c(5), top: c(6), background: K("#FFFFFF"), color: K("#111216"), fontWeight: 700, fontSize: c(3), padding: `${c(0.8)}px ${c(2)}px`, opacity: a })}>{f.shop}</div>
      <div style={abs({ left: c(5), top: c(122), right: c(5), fontWeight: 600, fontSize: c(8.4), lineHeight: 1.45, opacity: a })}>
        <span style={{ background: K("#C2187B"), padding: `0 ${c(1.6)}px`, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>{f.offer}</span>
      </div>
      <div style={abs({ left: 0, right: 0, top: 0, bottom: 0, background: K("#FFFFFF"), opacity: b })} />
      <div style={abs({ left: c(8), right: c(8), top: c(48), opacity: b, color: K("#C2187B"), fontWeight: 600, fontSize: c(3.6) })}>{f.note}</div>
      <div style={abs({ left: c(8), right: c(8), top: c(62), opacity: b })}>
        <span style={{ background: K("#C2187B"), color: K("#FFFFFF"), fontWeight: 600, fontSize: c(8.4), lineHeight: 1.45, padding: `0 ${c(1.8)}px`, boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }}>{f.cta}</span>
        <div style={{ color: K("#C2187B"), fontWeight: 600, fontSize: c(3.6), marginTop: c(4) }}>{f.url}</div>
      </div>
    </Frame>
  );
}

/* ---------- 24. Làm việc từ xa (khung chữ viền mảnh) ---------- */
function TuXa({ f }: { f: Fields }) {
  const K = useK();
  const a = useSeg(-1, 2.3), b = useSeg(2.3, 4.6), d = useSeg(4.6, 99);
  const box = (op: number, children: ReactNode) => (
    <div style={abs({ left: c(12), right: c(12), top: c(76), border: "2px solid rgba(255,255,255,0.85)", padding: `${c(5)}px ${c(5)}px`, textAlign: "center", opacity: op, background: "rgba(0,0,0,0.12)" })}>{children}</div>
  );
  return (
    <Frame bg="linear-gradient(180deg,#26332F 0%,#0F1614 100%)" color="#FFFFFF">
      <div style={abs({ left: c(14), top: c(104), width: c(72), height: c(46), borderRadius: c(3), background: K("#1B2220"), transform: "perspective(900px) rotateX(22deg)" })} />
      {box(a, <div style={{ fontFamily: SERIF, fontSize: c(8) }}>{f.t1}</div>)}
      {box(b, <><div style={{ fontSize: c(3.2), letterSpacing: "0.16em", fontWeight: 600 }}>{f.t2a}</div><div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: c(8), marginTop: c(1.5) }}>{f.t2b}</div></>)}
      {box(d, <div style={{ fontFamily: SERIF, fontSize: c(7) }}>{f.t3}</div>)}
    </Frame>
  );
}

const F = (key: string, label: string, def: string, long = false): FieldDef => ({ key, label, def, long });
const COL = (key: string, label: string, def: string): FieldDef => ({ key, label, def, type: "color" });
const SEL = (key: string, label: string, def: string, options: [string, string][]): FieldDef => ({ key, label, def, type: "select", options });
const NUM = (key: string, label: string, def: string, min: number, max: number, step = 1): FieldDef => ({ key, label, def, type: "number", min, max, step });

export const TEMPLATES: Template[] = [
  { id: "k-giam-gia-dq", title: "Giảm giá độc quyền", cat: "Khuyến mãi", seconds: 6, Comp: GiamGiaDQ,
    palette: ["#07080C", "#FFFFFF", "#19C6FF", "#A7FF3A", "#1C2A25", "#3F5A4A", "#C9A88F", "#2D3B36"],
    fields: [F("brand", "Tên thương hiệu", "TÊN THƯƠNG HIỆU"), F("cat", "Ngành hàng", "ĐỒ THỂ THAO"), F("title", "Tiêu đề", "GIẢM GIÁ ĐỘC QUYỀN TRỰC TUYẾN", true), F("off", "Mức giảm", "GIẢM ĐẾN 30%"), F("url", "Link mua", "MUA NGAY TẠI: WWW.TRANGWEB.VN"), F("tag", "Nhãn nổi bật", "ƯU ĐÃI GIỚI HẠN THỜI GIAN")],
    scenes: [["0–2s", "Tên thương hiệu + đường chéo neon"], ["2–6s", "Tiêu đề và mức giảm"], ["6–10s", "Nhãn giới hạn thời gian + cảnh người dùng sản phẩm"]],
    how: ["Thay phần ảnh dưới bằng video người dùng sản phẩm", "Chỉ ghi mức giảm và thời hạn đúng thật"], kw: ["sale", "discount", "promo"] },
  { id: "k-black-friday", title: "Ưu đãi Black Friday", cat: "Khuyến mãi", seconds: 6, Comp: BlackFriday,
    palette: ["#050507", "#FFFFFF", "#FF8A1F", "#E8307A", "#4B4BFF", "#D6FFC0", "#7CFF6B", "#3DDC4A", "#FFB36B"],
    fields: [F("top", "Ngành hàng (nhiều dòng)", "THỜI TRANG\nTHỂ THAO\nAN NAM", true), F("title", "Tiêu đề", "ƯU ĐÃI ĐẶC BIỆT MỪNG BLACK FRIDAY", true), F("l1", "Dòng 1", "GIẢM ĐẾN 40% MỘT SỐ SẢN PHẨM"), F("l2", "Dòng 2", "MIỄN PHÍ VẬN CHUYỂN CHO ĐƠN TRÊN 1 TRIỆU"), F("l3", "Dòng 3", "MUA NGAY TẠI: WWW.TRANGWEB.VN")],
    scenes: [["0–1s", "Quả cầu màu + tiêu đề phát sáng"], ["1–5s", "Chi tiết ưu đãi"], ["5–6s", "Link mua"]],
    how: ["Dùng cho dịp sale lớn: Black Friday, 11.11, 12.12", "Đổi mức giảm theo chương trình thật"], kw: ["black friday", "neon", "sale event"] },
  { id: "k-dat-ngay", title: "Đặt ngay giảm 30% + nhập mã", cat: "Khuyến mãi", seconds: 6, Comp: DatNgay,
    palette: ["#0A0A0C", "#C71D24", "#FFFFFF", "#111216", "#E4FF3A", "#0E0F13", "#3A0508", "#E02B2B", "#4A0C10"],
    fields: [F("brand", "Tên công ty", "CÔNG TY ABC"), F("head", "Tiêu đề", "Đặt ngay để được giảm giá 30%!", true), F("sub", "Mô tả", "Tất cả sản phẩm mẫu mới"), F("codeLabel", "Dòng nhập mã", "Nhập mã khi thanh toán"), F("code", "Mã giảm giá", "GIAM30"), F("note", "Ghi chú", "Số lượng có hạn")],
    scenes: [["0–3s", "Tiêu đề giảm giá + mũi tên"], ["3–6s", "Chuyển sang nhập mã + khung sản phẩm"]],
    how: ["Đổi khung sản phẩm bằng ảnh chụp thật", "Mã giảm giá phải là mã thật và còn hạn"], kw: ["promo code", "discount", "phone deal"] },
  { id: "k-mua-ngay", title: "Chưa bao giờ dễ dàng đến thế", cat: "Khuyến mãi", seconds: 6, Comp: MuaNgay,
    palette: ["#FFD92E", "#111216", "#FFFFFF", "#B8B8B8", "#6F6F6F", "#F2A81D", "#E8C7A6"],
    fields: [F("small", "Dòng nhỏ", "SOẠN HÀNH LÝ"), F("l1", "Dòng 1", "CHƯA BAO GIỜ"), F("l2", "Dòng 2", "DỄ DÀNG ĐẾN THẾ"), F("buy", "Lời kêu gọi", "MUA NGAY!"), F("url", "Link", "www.trangwebhay.vn")],
    scenes: [["0–3s", "Ảnh lớn + khung chữ đen"], ["3–6s", "MUA NGAY! + link"]],
    how: ["Thay khung ảnh bằng video sản phẩm", "Phù hợp quảng cáo ngắn một sản phẩm"], kw: ["buy now", "yellow ad", "cta"] },
  { id: "k-giam-gia-cua-hang", title: "Giảm giá + ghé cửa hàng", cat: "Khuyến mãi", seconds: 6, Comp: GiamGiaCuaHang,
    palette: ["#F26B21", "#F7B21A", "#FFFFFF", "#111216", "#C2187B", "#9A9A9A", "#5D5D5D", "#D9DCE0"],
    fields: [F("shop", "Tên cửa hàng", "CỬA HÀNG ABC"), F("offer", "Ưu đãi", "Giảm 30% tất cả laptop!", true), F("note", "Ghi chú thời hạn", "Khuyến mãi chỉ áp dụng từ 1 - 15/8"), F("cta", "Lời kêu gọi", "Ghé các cửa hàng hoặc mua online!", true), F("url", "Link", "www.trangwebhay.vn")],
    scenes: [["0–3s", "Ảnh sản phẩm + nhãn ưu đãi"], ["3–6s", "Nền trắng, lời kêu gọi + link"]],
    how: ["Ghi rõ thời hạn khuyến mãi thật", "Thay khung ảnh bằng video sản phẩm"], kw: ["store sale", "orange gradient", "laptop discount"] },
  { id: "k-tu-xa", title: "Làm việc từ xa (khung chữ mảnh)", cat: "Giới thiệu", seconds: 7, Comp: TuXa,
    palette: ["#26332F", "#0F1614", "#FFFFFF", "#1B2220"],
    fields: [F("t1", "Câu 1", "Cùng tôi làm việc từ xa", true), F("t2a", "Dòng nhỏ câu 2", "TÔI ĐANG SỬ DỤNG"), F("t2b", "Tên sản phẩm", "Laptop ABC"), F("t3", "Câu 3", "Thật dễ dàng và thuận tiện!", true)],
    scenes: [["0–2s", "Câu mở đầu trong khung"], ["2–4s", "Giới thiệu sản phẩm đang dùng"], ["4–7s", "Cảm nhận ngắn"]],
    how: ["Ghép video quay người dùng thật làm nền", "Chỉ nói trải nghiệm có thật"], kw: ["testimonial", "outlined text", "work from home"] },
  { id: "n-bai-hoc", title: "Bài học đắt giá", cat: "Quote · Chia sẻ", seconds: 5, Comp: BaiHoc,
    palette: ["#1238C9", "#FFFFFF", "#FFC21A", "#1A1A1A", "#C9D6FF", "#7FB6FF", "#FFD0A8"],
    fields: [F("title", "Dòng tiêu đề", "Bài học khó"), F("sub", "Dòng phụ", "đã thay đổi mình"), F("handle", "Tên kênh", "@tenkenh")],
    scenes: [["0–1s", "Khung ảnh phóng to vào"], ["1–3s", "Hai nhãn chữ vàng trượt vào"], ["3–5s", "Tên kênh"]],
    how: ["Thay khung ảnh bằng ảnh thật của bạn trong Trình chỉnh sửa", "Dùng cho câu chuyện, bài học, trích dẫn ngắn"], kw: ["hard lessons", "photo caption", "story"] },
  { id: "n-tai-ra-mat", title: "Đang tải rồi ra mắt", cat: "Ra mắt sản phẩm", seconds: 5, Comp: TaiRaMat,
    palette: ["#E6E6E6", "#D9C7B0", "#2A2420", "#FFFFFF", "#8A8A8A"],
    fields: [F("loading", "Chữ khi đang tải", "ĐANG TẢI..."), F("tag", "Dòng nhỏ", "SẢN PHẨM MỚI"), F("name", "Tên sản phẩm", "Tên Sản Phẩm", true), F("cta", "Dòng cuối", "XEM NGAY")],
    scenes: [["0–2s", "Vòng tải xoay"], ["2–3s", "Tên sản phẩm hiện dần"], ["3–5s", "Lời kêu gọi"]],
    how: ["Ghép đoạn quay sản phẩm làm nền phía sau", "Đổi tên sản phẩm và dòng cuối"], kw: ["loading", "new product", "reveal"] },
  { id: "n-dich-vu", title: "Dịch vụ của tôi", cat: "Giới thiệu", seconds: 6, Comp: DichVu,
    palette: ["#101114", "#FFFFFF", "#E4FF3A", "#1B1D24", "#2C2F3A", "#9A9EAD"],
    fields: [F("title", "Tiêu đề", "Mình làm được"), F("hl", "Từ nổi bật", "gì cho bạn"), F("g1", "Nhãn 1", "THIẾT KẾ"), F("t1", "Việc 1", "Thiết kế web"), F("d1", "Chi tiết 1", "Gọn, đẹp, dễ dùng"), F("g2", "Nhãn 2", "VIDEO"), F("t2", "Việc 2", "Dựng video ngắn"), F("d2", "Chi tiết 2", "Reels, TikTok, Shorts"), F("g3", "Nhãn 3", "MARKETING"), F("t3", "Việc 3", "Email marketing"), F("d3", "Chi tiết 3", "Viết và lên lịch gửi"), F("foot", "Dòng cuối", "Nhắn mình để biết thêm")],
    scenes: [["0–2s", "Tiêu đề"], ["2–8s", "Ba thẻ dịch vụ lần lượt trượt vào"], ["8–10s", "Dòng liên hệ"]],
    how: ["Mỗi thẻ một dịch vụ, giữ chữ ngắn", "Ghép cảnh minh hoạ cho từng thẻ nếu có"], kw: ["our services", "cards", "intro"] },
  { id: "n-tinh-nang", title: "Vì sao app này hợp bạn", cat: "Review tool", seconds: 6, Comp: VaiTinhNang,
    palette: ["#0A2BC0", "#1B49E8", "#FFFFFF", "#0B1F6B", "#0B1033", "#E4EBFF", "#B8C8FF", "#D5DEFF"],
    fields: [F("brand", "Tên app / công ty", "Tên App"), F("title", "Tiêu đề", "Vì sao app này hợp với bạn", true), F("b1", "Tính năng 1", "Nhanh"), F("b2", "Tính năng 2", "Dễ dùng"), F("b3", "Tính năng 3", "Đồng bộ"), F("foot", "Dòng cuối", "Tải miễn phí hôm nay")],
    scenes: [["0–2s", "Tiêu đề + điện thoại"], ["2–7s", "Ba nhãn tính năng bật quanh điện thoại"], ["7–10s", "Lời kêu gọi tải app"]],
    how: ["Thay màn hình điện thoại bằng ảnh chụp app thật", "Mỗi nhãn chỉ 1–2 từ"], kw: ["app feature", "phone mockup", "why this app"] },
  { id: "n-cam-nang", title: "Cẩm nang cho người mới", cat: "Hướng dẫn", seconds: 6, Comp: CamNang,
    palette: ["#2F7BEF", "#10224F", "#FFFFFF", "#EEF3FF", "#4A5A86"],
    fields: [F("title", "Tiêu đề", "Đầu tư cho người mới", true), F("sub", "Mô tả", "Hướng dẫn từng bước để bắt đầu gọn gàng", true), F("handle", "Tên kênh", "@tenkenh")],
    scenes: [["0–1s", "Thẻ trắng phóng to vào"], ["1–3s", "Biểu đồ cột mọc lên"], ["3–6s", "Tiêu đề + mô tả + tên kênh"]],
    how: ["Đổi biểu đồ bằng ảnh minh hoạ của chủ đề bạn", "Dùng cho video giới thiệu bài hướng dẫn"], kw: ["guide card", "investing basics", "beginner"] },
  { id: "n-lien-he", title: "Hẹn gặp lại và liên hệ", cat: "Kết video", seconds: 5, Comp: LienHe,
    palette: ["#0C0D11", "#FFFFFF", "#0A84FF"],
    fields: [F("bye", "Lời chào cuối", "Hẹn gặp lại"), F("contact", "Tiêu đề liên hệ", "Liên hệ:"), F("p1", "Thông tin 1", "0900 000 000"), F("p2", "Thông tin 2", "@tenkenh")],
    scenes: [["0–2s", "Vòng tròn lời chào"], ["2–5s", "Thông tin liên hệ hiện ra"]],
    how: ["Ghép cuối mọi video", "Đổi số điện thoại và tên kênh"], kw: ["see you next time", "contact us", "outro"] },
  { id: "s-tin-nong", title: "Tin nóng AI", cat: "Tin tức AI", seconds: 6, Comp: TinNong,
    palette: ["#0A1A52", "#1238C9", "#FF3B3B", "#C9D6FF", "#FFFFFF"],
    fields: [F("live", "Nhãn LIVE", "LIVE"), F("title", "Tiêu đề", "TIN NÓNG AI"), F("desc", "Mô tả ngắn", "Công cụ AI mới vừa ra mắt, làm video trong 30 giây", true), F("bar", "Nhãn thanh dưới", "MỚI"), F("tick1", "Chữ chạy 1", "Cập nhật AI mỗi ngày"), F("tick2", "Chữ chạy 2", "Theo dõi để không bỏ lỡ")],
    scenes: [["0–2s", "Khung LIVE nháy + tiêu đề trượt vào"], ["2–8s", "Quay màn hình tool mới, chèn 1 dòng chú thích lớn"], ["8–13s", "3 điểm nổi bật, mỗi điểm 1 câu"], ["13–15s", "Thanh chạy chữ: theo dõi để cập nhật"]],
    how: ["Dùng làm cảnh mở đầu, ghép tiếp đoạn quay màn hình trong CapCut", "Giữ mỗi cảnh ≤ 3 giây để giữ nhịp tin tức"], kw: ["breaking news", "news update", "live report"] },
  { id: "s-sap-ra-mat", title: "Sắp ra mắt", cat: "Ra mắt sản phẩm", seconds: 6, Comp: SapRaMat,
    palette: ["#1A0A03", "#FFF4E6", "#FF5A1F"],
    fields: [F("date", "Ngày ra mắt", "01 · 11 · 2026"), F("title", "Tiêu đề", "SẮP RA MẮT"), F("sub", "Dòng phụ", "Theo dõi để không bỏ lỡ"), F("d", "Số ngày", "06"), F("h", "Số giờ", "12"), F("m", "Số phút", "30")],
    scenes: [["0–1s", "Ngày ra mắt hiện trước"], ["1–4s", "Chữ SẮP RA MẮT phóng to"], ["4–6s", "Đồng hồ đếm ngược + lời nhắc"]],
    how: ["Đăng 3–5 ngày trước ngày bán, đổi số đếm ngược mỗi ngày", "Dùng cho teaser khoá học, ebook, livestream"], kw: ["coming soon", "launch teaser", "countdown"] },
  { id: "s-review", title: "Review tool AI", cat: "Review tool", seconds: 5, Comp: Review,
    palette: ["#CDB8FF", "#1B1036", "#FFFFFF", "#F1ECFF", "#7B5CFF", "#E4FF3A", "#F5B800", "#DCD3FF"],
    fields: [F("tag", "Nhãn", "REVIEW"), F("title", "Tiêu đề", "Mình đã test tool này 7 ngày", true), F("score", "Điểm chấm", "9.5")],
    scenes: [["0–3s", "Hook: đã test 7 ngày"], ["3–10s", "Quay màn hình thao tác chính"], ["10–22s", "3 điểm thích + 1 điểm chưa ổn"], ["22–30s", "Điểm /10 + CTA"]],
    how: ["Dùng làm mở đầu, ghép tiếp đoạn quay màn hình", "Luôn nói 1 nhược điểm thật để người xem tin bạn"], kw: ["app review", "phone mockup", "product review"] },
  { id: "s-vs", title: "Tool A vs Tool B", cat: "So sánh", seconds: 6, Comp: Versus,
    palette: ["#111216", "#FFFFFF", "#FF3B6B", "#E4FF3A"],
    fields: [F("l1", "Nhãn trên", "LỰA CHỌN 1"), F("a", "Tên lựa chọn 1", "TOOL A"), F("a1", "Ưu điểm 1 (A)", "Rẻ hơn"), F("a2", "Ưu điểm 2 (A)", "Dễ dùng"), F("l2", "Nhãn dưới", "LỰA CHỌN 2"), F("b", "Tên lựa chọn 2", "TOOL B"), F("b1", "Ưu điểm 1 (B)", "Video đẹp hơn"), F("b2", "Ưu điểm 2 (B)", "Nhiều mẫu hơn"), F("q", "Câu hỏi cuối", "Cái nào đáng tiền hơn?")],
    scenes: [["0–2s", "Màn chia đôi + vòng VS đập nhịp"], ["2–10s", "Demo lựa chọn 1"], ["10–18s", "Demo lựa chọn 2"], ["18–25s", "Kết luận theo đối tượng + CTA"]],
    how: ["Kết luận theo từng đối tượng, đừng chê thẳng 1 bên"], kw: ["versus", "split screen", "comparison"] },
  { id: "s-quote", title: "Trích dẫn podcast", cat: "Podcast · Quote", seconds: 7, Comp: Quote,
    palette: ["#1D1813", "#F3E9DC", "#C9B9A3", "#E4FF3A"],
    fields: [F("quote", "Câu trích dẫn", "AI không lấy việc của bạn. Người biết dùng AI mới làm điều đó.", true), F("who", "Tên người nói / kênh", "HUONGPTC AI"), F("ep", "Số tập", "Tập 12")],
    scenes: [["0–3s", "Câu trích dẫn hiện lên"], ["3–17s", "Ghép giọng nói gốc, sóng âm chạy theo"], ["17–20s", "Tên chương trình + số tập"]],
    how: ["Cắt 1 câu đắt nhất từ livestream để làm", "Ghép âm thanh gốc trong CapCut"], kw: ["podcast quote", "audiogram", "quote video"] },
  { id: "s-hook", title: "Hook chữ lớn", cat: "Hook mở đầu", seconds: 4, Comp: Hook,
    palette: ["#111216", "#E4FF3A"],
    fields: [F("top", "Dòng nhỏ trên cùng", "DỪNG LƯỚT 3 GIÂY"), F("l1", "Dòng 1", "Bạn đang"), F("l2", "Dòng 2", "làm"), F("l3", "Từ khoá nổi bật (nền đen)", "affiliate"), F("l4", "Dòng 4", "sai cách?"), F("hint", "Lời nhắc góc dưới", "Xem tiếp ↓")],
    scenes: [["0–0.5s", "Dòng nhỏ 'Dừng lướt 3 giây'"], ["0.5–3s", "Từng dòng chữ to bật vào"], ["3–4s", "Chuyển sang nội dung chính"]],
    how: ["Ghép vào đầu MỌI video: 3 giây đầu quyết định lượt xem", "Mỗi dòng 1–2 từ để chữ đủ to"], kw: ["kinetic typography", "bold text", "hook"] },
  { id: "s-3buoc", title: "3 bước làm video AI", cat: "Hướng dẫn", seconds: 6, Comp: Steps,
    palette: ["#121318", "#FFFFFF", "#5A3DF0", "#646877", "#FBFBF8", "#E9EAF0", "#E4FF3A"],
    fields: [F("title", "Tiêu đề", "3 bước tạo video bằng"), F("hl", "Từ tô sáng", "AI"), F("n1", "Số bước 1", "01"), F("s1", "Bước 1", "Viết kịch bản"), F("d1", "Chi tiết bước 1", "Dán chủ đề vào Claude"), F("n2", "Số bước 2", "02"), F("s2", "Bước 2", "Tạo giọng đọc"), F("d2", "Chi tiết bước 2", "Chọn giọng tiếng Việt"), F("n3", "Số bước 3", "03"), F("s3", "Bước 3", "Ghép hình + phụ đề"), F("d3", "Chi tiết bước 3", "Xuất 1080×1920")],
    scenes: [["0–3s", "Tiêu đề + tổng quan 3 bước"], ["3–15s", "Bước 1: quay màn hình"], ["15–27s", "Bước 2"], ["27–37s", "Bước 3"], ["37–40s", "Lưu video để làm theo"]],
    how: ["Mỗi bước có 1 cảnh quay màn hình riêng", "Kết bằng 'Lưu lại để làm theo' để tăng lượt lưu"], kw: ["tutorial steps", "how to", "checklist"] },
  { id: "s-cta", title: "Bình luận nhận quà", cat: "Chốt đơn · CTA", seconds: 5, Comp: Cta,
    palette: ["#C41E7A", "#5B1AA8", "#111216", "#E4FF3A"],
    fields: [F("top", "Dòng trên", "Bình luận"), F("kw", "Từ khoá bình luận", "AI"), F("gift", "Quà nhận được", "để nhận bộ prompt làm video miễn phí", true)],
    scenes: [["0–1s", "Chữ 'Bình luận'"], ["1–3s", "Ô từ khoá bật to giữa màn"], ["3–5s", "Lợi ích + mũi tên chỉ xuống"]],
    how: ["Ghép vào cuối video để thu lead qua bình luận", "Từ khoá ngắn 2–4 ký tự, dễ gõ"], kw: ["comment to get", "call to action", "giveaway"] },
  { id: "s-ebook", title: "Ra mắt sản phẩm số", cat: "Ra mắt sản phẩm", seconds: 6, Comp: Ebook,
    palette: ["#C9C1B0", "#0E6B60", "#EFFFF9", "#F7F3EA", "#3C5A55", "#0B2B27", "#E4FF3A"],
    fields: [F("tag", "Nhãn", "SẢN PHẨM MỚI"), F("name", "Tên sản phẩm", "BỘ PROMPT VIDEO AI"), F("cover", "Chữ trên bìa", "100 PROMPT"), F("coverSub", "Dòng phụ trên bìa", "làm video bán hàng"), F("price", "Giá", "199K")],
    scenes: [["0–2s", "Nhãn + tên sản phẩm"], ["2–8s", "Mockup lắc nhẹ"], ["8–12s", "3 thứ người mua nhận được"], ["12–15s", "Giá + link ở bio"]],
    how: ["Đổi màu nền theo từng sản phẩm để dễ nhận diện"], kw: ["digital product", "ebook mockup", "launch"] },
  { id: "s-outro", title: "Cảm ơn đã xem", cat: "Kết video", seconds: 4, Comp: Outro,
    palette: ["#FFFFFF", "#0C0D11", "#E4FF3A", "#9A9EAD"],
    fields: [F("initial", "Chữ trong ảnh đại diện", "H"), F("thanks", "Lời cảm ơn", "CẢM ƠN ĐÃ XEM"), F("handle", "Tên kênh", "Huongptc AI"), F("b1", "Nút 1", "Theo dõi"), F("b2", "Nút 2", "Xem video tiếp theo")],
    scenes: [["0–1s", "Ảnh đại diện tròn viền neon"], ["1–4s", "Lời cảm ơn + 2 nút hành động"]],
    how: ["Dùng chung cho mọi video để tạo nhận diện", "Giữ dưới 4 giây"], kw: ["outro", "end screen", "thanks for watching"] },
  { id: "s-proof", title: "Khoe kết quả", cat: "Proof · Kết quả", seconds: 5, Comp: Proof,
    palette: ["#0F2A1D", "#E9FFF2", "#8FD9B0", "#2E7A52", "#E4FF3A"],
    fields: [F("label", "Nhãn trên", "KẾT QUẢ 30 NGÀY · SỐ MINH HOẠ"), F("num", "Con số chính", "+312%"), F("desc", "Giải thích con số", "Lượt xem sau khi dùng hook chữ lớn ở 3 giây đầu", true)],
    scenes: [["0–2s", "Con số lớn nhất hiện trước"], ["2–6s", "Biểu đồ cột mọc lên"], ["6–10s", "Ảnh chụp số liệu thật làm bằng chứng"], ["10–12s", "CTA xem video tiếp"]],
    how: ["Thay số minh hoạ bằng số liệu thật của bạn", "Luôn kèm ảnh chụp màn hình gốc"], kw: ["results", "bar chart", "growth"] },
  { id: "s-vlog", title: "Một ngày làm affiliate AI", cat: "Vlog", seconds: 6, Comp: Vlog,
    palette: ["#2A140B", "#FF5A1F", "#FFE3D3"],
    fields: [F("title", "Tiêu đề", "MỘT NGÀY CỦA TÔI"), F("sub", "Dòng phụ", "làm affiliate bằng AI"), F("t1", "Giờ 1", "07:00"), F("v1", "Việc 1", "Lên ý tưởng với Claude"), F("t2", "Giờ 2", "09:00"), F("v2", "Việc 2", "Dựng 3 video bằng AI"), F("t3", "Giờ 3", "14:00"), F("v3", "Việc 3", "Trả lời bình luận, gửi link"), F("t4", "Giờ 4", "20:00"), F("v4", "Việc 4", "Xem số liệu, chốt đơn")],
    scenes: [["0–3s", "Tiêu đề + cảnh bàn làm việc"], ["3–40s", "Mỗi mốc giờ 1 đoạn 6–8 giây"], ["40–45s", "Câu chốt + CTA theo dõi"]],
    how: ["Quay cảnh thật bằng điện thoại, chèn mốc giờ lớn"], kw: ["day in the life", "vlog", "timeline"] },
  { id: "s-chu", title: "Chữ tự do", cat: "Khác", seconds: 5, Comp: TextLayer, palette: [],
    fields: [F("text", "Nội dung chữ", "Nhập chữ của bạn ở đây", true), NUM("size", "Cỡ chữ", "9", 3, 30, 0.5), COL("color", "Màu chữ", "#FFFFFF"),
      SEL("font", "Font", "ui", [["ui", "Be Vietnam Pro"], ["display", "Anton (chữ lớn)"], ["serif", "Playfair Display (có chân)"]]),
      SEL("weight", "Độ đậm", "800", [["500", "Thường"], ["700", "Đậm"], ["800", "Rất đậm"]]),
      SEL("align", "Căn lề", "center", [["left", "Trái"], ["center", "Giữa"], ["right", "Phải"]]),
      NUM("y", "Vị trí dọc (%)", "50", 5, 95, 1),
      SEL("anim", "Hiệu ứng", "up", [["up", "Trượt lên"], ["left", "Trượt từ trái"], ["scale", "Phóng to"], ["fade", "Mờ dần vào"], ["typewriter", "Gõ từng chữ"], ["none", "Không"]]),
      SEL("fx", "Viền / bóng chữ", "shadow", [["none", "Không"], ["shadow", "Bóng đổ"], ["outline", "Viền đen"]]),
      COL("box", "Nền sau chữ (xoá để bỏ)", "")],
    scenes: [["0–5s", "Chữ hiện theo hiệu ứng bạn chọn"]],
    how: ["Đặt lên video của bạn trong Trình chỉnh sửa để làm tiêu đề, chú thích hoặc kêu gọi hành động", "Dùng nhiều lớp chữ ở các thời điểm khác nhau"], kw: ["text", "chữ", "tiêu đề", "caption"] },
  { id: "s-phude", title: "Phụ đề", cat: "Khác", seconds: 10, hidden: true, Comp: CaptionLayer, palette: [],
    fields: [NUM("size", "Cỡ chữ", "6.4", 3, 20, 0.2), COL("color", "Màu chữ", "#FFFFFF"), COL("hi", "Màu từ đang đọc", "#FFEA88"),
      SEL("font", "Font", "ui", [["ui", "Be Vietnam Pro"], ["display", "Anton (chữ lớn)"], ["serif", "Playfair Display (có chân)"]]),
      SEL("weight", "Độ đậm", "800", [["500", "Thường"], ["700", "Đậm"], ["800", "Rất đậm"]]),
      SEL("upper", "Chữ in hoa", "0", [["0", "Không"], ["1", "Có"]]),
      NUM("y", "Vị trí dọc (%)", "70", 10, 92, 1),
      SEL("fx", "Viền / bóng chữ", "outline", [["none", "Không"], ["shadow", "Bóng đổ"], ["outline", "Viền đen"]]),
      COL("box", "Nền sau chữ (xoá để bỏ)", "")],
    scenes: [["suốt video", "Hiện từng cụm 2–5 từ đúng lúc nói"]], how: ["Tạo tự động từ giọng đọc hoặc tiếng nói trong video"], kw: ["phụ đề", "subtitle", "caption"] },
];

export const defaults = (t: Template): Fields => Object.fromEntries(t.fields.map((x) => [x.key, x.def]));
export const CATS = ["Khuyến mãi", "Quote · Chia sẻ", "Giới thiệu", "Tin tức AI", "Review tool", "Hook mở đầu", "So sánh", "Podcast · Quote", "Ra mắt sản phẩm", "Hướng dẫn", "Proof · Kết quả", "Chốt đơn · CTA", "Vlog", "Kết video", "Khác"];
export { UI };
