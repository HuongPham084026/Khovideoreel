import type { ComponentType } from "react";
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

/* ===== Bộ mẫu Huongptc AI (bảng màu Creative Spring) =====
   Slate #4D6787 + hồng #F599C6 cố định; mint = hướng dẫn; vàng = CTA/kết quả; chữ than xanh #263238 trên hồng/mint/vàng, chữ trắng trên Slate. */
const SLATE = "#4D6787", PINK = "#F599C6", MINT = "#7DCCAD", SUN = "#FFEA88", WARM = "#FFFDF7", INK = "#263238";

/* ---------- H1. Hook câu hỏi ---------- */
function HHook({ f }: { f: Fields }) {
  const K = useK();
  const bob = useLoop(1.2) * c(3);
  return (
    <Frame bg={SLATE} color={WARM}>
      <div style={abs({ top: c(10), left: c(7), display: "flex", alignItems: "center", gap: c(2), ...useIn(0) })}>
        <div style={{ width: c(5), height: c(5), borderRadius: "50%", background: K(PINK) }} />
        <div style={{ fontWeight: 800, fontSize: c(3.8), letterSpacing: "0.14em" }}>{f.top}</div>
      </div>
      <div style={abs({ left: c(7), right: c(7), top: "25%", fontWeight: 800, fontSize: c(9.4), lineHeight: 1.18, letterSpacing: "-0.01em", whiteSpace: "nowrap" })}>
        <div style={useIn(2, "left")}>{f.l1}</div>
        <div style={{ ...useIn(7, "left"), marginTop: c(1.5) }}>
          <span style={{ background: K(PINK), color: K(INK), padding: `0 ${c(2.2)}px`, borderRadius: c(2) }}>{f.hl}</span>
        </div>
        <div style={{ ...useIn(12, "left"), marginTop: c(2) }}>{f.l2}</div>
      </div>
      <div style={abs({ left: c(7), right: c(7), top: "66%", fontSize: c(4.6), lineHeight: 1.4, fontWeight: 500, color: K("#DDE6F0"), ...useIn(16) })}>{f.sub}</div>
      <div style={abs({ bottom: c(12), right: c(8), fontWeight: 700, fontSize: c(4.4), color: K(SUN), transform: `translateY(${bob}px)` })}>{f.hint}</div>
    </Frame>
  );
}

/* ---------- H2. Một sản phẩm thành 5 ảnh ---------- */
function H5Anh({ f }: { f: Fields }) {
  const K = useK();
  const tile = (label: string, bg: string, delay: number, st: object) => (
    <div style={{ background: K(bg), color: K(INK), borderRadius: c(4), display: "flex", alignItems: "flex-end", padding: c(3.2), fontWeight: 800, fontSize: c(4.2), letterSpacing: "0.06em", ...st, ...useIn(delay, "scale") }}>{label}</div>
  );
  return (
    <Frame bg={WARM} color={INK}>
      <div style={abs({ top: c(9), left: c(7), right: c(7), ...useIn(0) })}>
        <div style={{ display: "inline-block", background: K(SLATE), color: K(WARM), fontWeight: 800, fontSize: c(3.4), letterSpacing: "0.14em", padding: `${c(1.2)}px ${c(3)}px`, borderRadius: 999 }}>{f.tag}</div>
        <div style={{ fontWeight: 800, fontSize: c(9.6), lineHeight: 1.12, marginTop: c(3), color: K(SLATE) }}>{f.title}</div>
      </div>
      <div style={abs({ left: c(7), right: c(7), top: c(52), bottom: c(18), display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1.25fr 1fr 1fr", gap: c(2.6) })}>
        {tile(f.t1, PINK, 4, { gridColumn: "1 / span 2" })}
        {tile(f.t2, MINT, 8, {})}
        {tile(f.t3, SUN, 11, {})}
        {tile(f.t4, SUN, 14, {})}
        {tile(f.t5, PINK, 17, {})}
      </div>
      <div style={abs({ left: c(7), right: c(7), bottom: c(7), textAlign: "center", fontWeight: 700, fontSize: c(4), color: K(SLATE), ...useIn(19) })}>{f.foot}</div>
    </Frame>
  );
}

/* ---------- H3. Trước và sau khi đồng bộ thương hiệu ---------- */
function HTruocSau({ f }: { f: Fields }) {
  const K = useK();
  const p = useLoop(1.4);
  const half = (top: boolean, label: string, a: string, b: string, c3: string, st: object) => (
    <div style={abs({ left: 0, right: 0, height: "50%", [top ? "top" : "bottom"]: 0, background: top ? K(WARM) : K(SLATE), color: top ? K(INK) : K(WARM), display: "flex", flexDirection: "column", justifyContent: "center", padding: `0 ${c(8)}px`, ...st })}>
      <div style={{ fontWeight: 800, fontSize: c(3.6), letterSpacing: "0.16em", color: top ? K(SLATE) : K(PINK) }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: c(7.2), lineHeight: 1.12, marginTop: c(1.5), whiteSpace: "nowrap" }}>{a}</div>
      <div style={{ fontSize: c(4.2), fontWeight: 600, lineHeight: 1.5, marginTop: c(2), opacity: 0.92 }}>{b}<br />{c3}</div>
    </div>
  );
  return (
    <Frame bg={SLATE}>
      {half(true, f.l1, f.a, f.a1, f.a2, useIn(0, "left"))}
      {half(false, f.l2, f.b, f.b1, f.b2, useIn(8))}
      <div style={abs({ top: "50%", left: "50%", width: c(20), height: c(20), marginLeft: -c(10), marginTop: -c(10), borderRadius: "50%", background: K(PINK), color: K(INK), display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: c(9), border: K(`${c(1.4)}px solid ${WARM}`), transform: `scale(${1 + p * 0.1})` })}>→</div>
      <div style={abs({ bottom: c(5), left: 0, right: 0, textAlign: "center", fontWeight: 700, fontSize: c(3.8), color: K(SUN), ...useIn(16) })}>{f.q}</div>
    </Frame>
  );
}

/* ---------- H4. Quy trình 3 bước ---------- */
function HQuyTrinh({ f }: { f: Fields }) {
  const K = useK();
  const item = (n: string, t: string, d: string, delay: number) => (
    <div style={{ display: "flex", gap: c(4), alignItems: "center", background: K("#FFFFFF"), border: K(`${c(0.5)}px solid ${SLATE}`), borderRadius: c(4), padding: c(4), boxShadow: K(`${c(1.2)}px ${c(1.2)}px 0 ${SLATE}`), ...useIn(delay, "left") }}>
      <div style={{ flex: "none", width: c(14), height: c(14), borderRadius: c(4), background: K(MINT), color: K(INK), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontSize: c(8) }}>{n}</div>
      <div>
        <div style={{ fontSize: c(5), fontWeight: 800, lineHeight: 1.25, color: K(INK) }}>{t}</div>
        <div style={{ fontSize: c(3.8), fontWeight: 500, color: K(SLATE), marginTop: c(0.6) }}>{d}</div>
      </div>
    </div>
  );
  return (
    <Frame bg={WARM} color={INK}>
      <GridBg step={c(6)} color="#EFE9DC" />
      <div style={abs({ top: c(11), left: c(7), right: c(7), fontWeight: 800, fontSize: c(9.6), lineHeight: 1.12, color: K(SLATE), ...useIn(0) })}>
        {f.title} <span style={{ background: K(MINT), color: K(INK), padding: `0 ${c(1.8)}px`, borderRadius: c(1.6) }}>{f.hl}</span>
      </div>
      <div style={abs({ left: c(7), right: c(7), top: c(62), display: "flex", flexDirection: "column", gap: c(5) })}>
        {item(f.n1, f.s1, f.d1, 6)}{item(f.n2, f.s2, f.d2, 11)}{item(f.n3, f.s3, f.d3, 16)}
      </div>
      <div style={abs({ left: c(7), right: c(7), bottom: c(9), textAlign: "center", fontWeight: 700, fontSize: c(4), color: K(SLATE), ...useIn(19) })}>{f.foot}</div>
    </Frame>
  );
}

/* ---------- H5. Ba việc Huongptc AI giúp bạn ---------- */
function HDichVu({ f }: { f: Fields }) {
  const K = useK();
  const card = (tag: string, tagBg: string, t: string, d: string, delay: number) => (
    <div style={{ background: K(WARM), color: K(INK), borderRadius: c(4.5), padding: c(4.4), ...useIn(delay, "left") }}>
      <div style={{ display: "inline-block", background: K(tagBg), color: K(INK), fontWeight: 800, fontSize: c(3.2), letterSpacing: "0.1em", padding: `${c(0.8)}px ${c(2.6)}px`, borderRadius: 999 }}>{tag}</div>
      <div style={{ fontSize: c(5.6), fontWeight: 800, lineHeight: 1.22, marginTop: c(2) }}>{t}</div>
      <div style={{ fontSize: c(3.8), fontWeight: 500, color: K(SLATE), marginTop: c(1) }}>{d}</div>
    </div>
  );
  return (
    <Frame bg={SLATE} color={WARM}>
      <div style={abs({ top: c(10), left: c(7), right: c(7), ...useIn(0) })}>
        <div style={{ fontWeight: 800, fontSize: c(3.6), letterSpacing: "0.16em", color: K(PINK) }}>{f.tag}</div>
        <div style={{ fontWeight: 800, fontSize: c(10.4), lineHeight: 1.12, marginTop: c(2) }}>{f.title}</div>
      </div>
      <div style={abs({ left: c(7), right: c(7), top: c(50), display: "flex", flexDirection: "column", gap: c(3.6) })}>
        {card(f.g1, PINK, f.t1, f.d1, 6)}{card(f.g2, MINT, f.t2, f.d2, 11)}{card(f.g3, SUN, f.t3, f.d3, 16)}
      </div>
      <div style={abs({ left: c(7), right: c(7), bottom: c(8), textAlign: "center", fontWeight: 700, fontSize: c(4), color: K(SUN), ...useIn(19) })}>{f.foot}</div>
    </Frame>
  );
}

/* ---------- H6. Bình luận nhận checklist ---------- */
function HCta({ f }: { f: Fields }) {
  const K = useK();
  const bob = useLoop(1) * c(3);
  return (
    <Frame bg={PINK} color={INK}>
      <DotBg step={c(9)} r={c(1)} color="rgba(255,253,247,0.35)" />
      <div style={abs({ top: "24%", left: 0, right: 0, textAlign: "center", fontWeight: 800, fontSize: c(6.4), ...useIn(0) })}>{f.top}</div>
      <div style={abs({ top: "32%", left: 0, right: 0, display: "flex", justifyContent: "center", ...useIn(5, "scale") })}>
        <div style={{ background: K(SUN), color: K(INK), border: K(`${c(1)}px solid ${SLATE}`), boxShadow: K(`${c(1.8)}px ${c(1.8)}px 0 ${SLATE}`), fontFamily: DISPLAY, fontSize: c(26), lineHeight: 1.05, padding: `${c(3)}px ${c(9)}px`, borderRadius: c(5) }}>{f.kw}</div>
      </div>
      <div style={abs({ top: "58%", left: c(8), right: c(8), textAlign: "center", fontWeight: 700, fontSize: c(5.6), lineHeight: 1.32, ...useIn(12) })}>{f.gift}</div>
      <div style={abs({ top: "72%", left: c(8), right: c(8), textAlign: "center", fontWeight: 600, fontSize: c(3.8), color: K(SLATE), ...useIn(15) })}>{f.note}</div>
      <svg viewBox="0 0 24 24" style={abs({ bottom: c(10), left: c(44), width: c(12), height: c(12), transform: `translateY(${bob}px)` })} fill="none" stroke={K(SLATE)} strokeWidth={2.6} strokeLinecap="round">
        <path d="M12 4v15M5 12l7 7 7-7" />
      </svg>
    </Frame>
  );
}

/* ---------- H7. Cảm ơn và theo dõi ---------- */
function HOutro({ f }: { f: Fields }) {
  const K = useK();
  const btn = (t: string, solid: boolean, d: number) => (
    <div style={{ textAlign: "center", borderRadius: 999, padding: `${c(3)}px 0`, fontWeight: 800, fontSize: c(4.4), border: K(`${c(0.5)}px solid ${solid ? SUN : WARM}`), background: solid ? K(SUN) : "transparent", color: solid ? K(INK) : K(WARM), ...useIn(d) }}>{t}</div>
  );
  return (
    <Frame bg={SLATE} color={WARM}>
      <div style={abs({ top: "28%", left: c(33), width: c(34), height: c(34), ...useIn(0, "scale") })}>
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: K(PINK), color: K(INK), display: "flex", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, fontSize: c(16), boxShadow: K(`0 0 0 ${c(1.6)}px ${SLATE}, 0 0 0 ${c(2.4)}px ${WARM}`) }}>{f.initial}</div>
      </div>
      <div style={abs({ top: "52%", left: c(6), right: c(6), textAlign: "center", fontWeight: 800, fontSize: c(8.6), lineHeight: 1.15, ...useIn(6) })}>{f.thanks}</div>
      <div style={abs({ top: "62%", left: 0, right: 0, textAlign: "center", fontSize: c(4.2), color: K("#DDE6F0"), fontWeight: 600, ...useIn(9) })}>{f.handle}</div>
      <div style={abs({ bottom: c(16), left: c(10), right: c(10), display: "flex", flexDirection: "column", gap: c(3) })}>
        {btn(f.b1, true, 13)}{btn(f.b2, false, 16)}
      </div>
    </Frame>
  );
}

const F = (key: string, label: string, def: string, long = false): FieldDef => ({ key, label, def, long });
const COL = (key: string, label: string, def: string): FieldDef => ({ key, label, def, type: "color" });
const SEL = (key: string, label: string, def: string, options: [string, string][]): FieldDef => ({ key, label, def, type: "select", options });
const NUM = (key: string, label: string, def: string, min: number, max: number, step = 1): FieldDef => ({ key, label, def, type: "number", min, max, step });

export const TEMPLATES: Template[] = [
  { id: "h-hook", title: "Hook câu hỏi bán hàng", cat: "Hook mở đầu", seconds: 4, Comp: HHook,
    palette: [SLATE, PINK, WARM, INK, SUN, "#DDE6F0"],
    fields: [F("top", "Dòng nhỏ trên cùng", "HUONGPTC AI"), F("l1", "Dòng 1", "Một ảnh sản phẩm"), F("hl", "Cụm nổi bật (nền hồng)", "đủ đăng cả tuần"), F("l2", "Dòng 2", "không?"), F("sub", "Dòng giải thích", "Mình thử biến 1 ảnh thành cả bộ nội dung bán hàng.", true), F("hint", "Lời nhắc góc dưới", "Xem tiếp ↓")],
    scenes: [["0–2s", "Câu hỏi gây tò mò, cụm khoá nền hồng"], ["2–3s", "Một dòng nói bạn sẽ chỉ gì"], ["3–4s", "Mũi tên chuyển sang demo"]],
    how: ["Ghép vào đầu video demo, hook phải trả đúng điều video sẽ cho xem", "Không hứa kết quả chắc chắn, chỉ nêu việc mình đã thử"], kw: ["hook", "question", "why we started"] },
  { id: "h-5anh", title: "Một sản phẩm thành 5 ảnh", cat: "Ra mắt sản phẩm", seconds: 6, Comp: H5Anh,
    palette: [WARM, INK, SLATE, PINK, MINT, SUN],
    fields: [F("tag", "Nhãn", "CASE STUDY"), F("title", "Tiêu đề", "1 sản phẩm → 5 ảnh bán hàng", true), F("t1", "Ảnh 1", "HERO"), F("t2", "Ảnh 2", "LIFESTYLE"), F("t3", "Ảnh 3", "LỢI ÍCH"), F("t4", "Ảnh 4", "CHI TIẾT"), F("t5", "Ảnh 5", "CTA"), F("foot", "Dòng cuối", "Thay các ô màu bằng ảnh thật của bạn")],
    scenes: [["0–2s", "Tiêu đề + ảnh gốc"], ["2–8s", "Năm ô ảnh bật lần lượt, mỗi ô một mục đích"], ["8–10s", "Chốt: ảnh nào dùng ở đâu"]],
    how: ["Ghép ảnh đầu ra thật của bạn vào từng ô trong CapCut", "Gắn nhãn theo mục đích để người xem hiểu vì sao cần 5 ảnh"], kw: ["collection grid", "product images", "before after"] },
  { id: "h-truoc-sau", title: "Trước và sau đồng bộ thương hiệu", cat: "So sánh", seconds: 6, Comp: HTruocSau,
    palette: [SLATE, WARM, INK, PINK, SUN],
    fields: [F("l1", "Nhãn trên", "TRƯỚC"), F("a", "Tiêu đề trên", "Ảnh đẹp nhưng rời rạc"), F("a1", "Ý 1 (trên)", "Mỗi ảnh một màu"), F("a2", "Ý 2 (trên)", "Mỗi ảnh một font"), F("l2", "Nhãn dưới", "SAU"), F("b", "Tiêu đề dưới", "Cùng một thương hiệu"), F("b1", "Ý 1 (dưới)", "Một bảng màu cố định"), F("b2", "Ý 2 (dưới)", "Một bộ bố cục chung"), F("q", "Câu hỏi cuối", "Bạn đang ở bên nào?")],
    scenes: [["0–2s", "Màn chia đôi, nhãn TRƯỚC"], ["2–5s", "Nhãn SAU, ba thay đổi: màu, font, bố cục"], ["5–6s", "Câu hỏi để người xem bình luận"]],
    how: ["Đặt ảnh thật trước/sau vào hai nửa màn hình", "Chỉ ra đúng ba thay đổi, đừng nói quá"], kw: ["split screen", "before after", "comparison"] },
  { id: "h-quy-trinh", title: "Quy trình 3 bước", cat: "Hướng dẫn", seconds: 6, Comp: HQuyTrinh,
    palette: [WARM, "#EFE9DC", INK, SLATE, MINT, "#FFFFFF"],
    fields: [F("title", "Tiêu đề", "3 bước biến một ảnh thành"), F("hl", "Cụm tô sáng", "video bán hàng"), F("n1", "Số 1", "01"), F("s1", "Bước 1", "Chọn 1 ảnh sản phẩm"), F("d1", "Chi tiết 1", "Ảnh rõ nét, đúng màu thật"), F("n2", "Số 2", "02"), F("s2", "Bước 2", "Viết brief cho AI"), F("d2", "Chi tiết 2", "Nói rõ mục tiêu và hook"), F("n3", "Số 3", "03"), F("s3", "Bước 3", "Kiểm tra rồi mới đăng"), F("d3", "Chi tiết 3", "Soát lỗi chữ, màu, sản phẩm"), F("foot", "Dòng cuối", "Lưu lại để làm theo")],
    scenes: [["0–2s", "Tiêu đề + tổng quan 3 bước"], ["2–7s", "Bước 1: cho xem ảnh gốc"], ["7–12s", "Bước 2: cho xem brief"], ["12–17s", "Bước 3: soát lỗi, đăng"], ["17–18s", "Lưu video để làm theo"]],
    how: ["Mỗi bước một cảnh quay màn hình riêng", "Bước cuối luôn là người duyệt"], kw: ["steps", "how to", "checklist"] },
  { id: "h-dich-vu", title: "Ba việc mình làm cùng bạn", cat: "Hướng dẫn", seconds: 6, Comp: HDichVu,
    palette: [SLATE, WARM, INK, PINK, MINT, SUN],
    fields: [F("tag", "Nhãn", "HUONGPTC AI"), F("title", "Tiêu đề", "Mình cùng bạn làm 3 việc", true), F("g1", "Nhãn thẻ 1", "ẢNH"), F("t1", "Việc 1", "Ảnh sản phẩm đồng bộ"), F("d1", "Chi tiết 1", "Hero, lifestyle, poster"), F("g2", "Nhãn thẻ 2", "VIDEO"), F("t2", "Việc 2", "Video ngắn bán hàng"), F("d2", "Chi tiết 2", "Hook, phụ đề, nhạc"), F("g3", "Nhãn thẻ 3", "QUY TRÌNH"), F("t3", "Việc 3", "Dùng lại cho sản phẩm"), F("d3", "Chi tiết 3", "Checklist và skill"), F("foot", "Dòng cuối", "Nhắn mình khi bạn cần")],
    scenes: [["0–2s", "Tiêu đề"], ["2–8s", "Ba thẻ lần lượt trượt vào"], ["8–10s", "Một lời mời hành động"]],
    how: ["Dùng để giới thiệu kênh hoặc sản phẩm mới", "Mỗi thẻ chỉ một ý, không thêm số liệu chưa kiểm chứng"], kw: ["our services", "feature cards", "intro"] },
  { id: "h-cta", title: "Bình luận nhận checklist", cat: "Chốt đơn · CTA", seconds: 5, Comp: HCta,
    palette: [PINK, INK, SUN, SLATE, WARM],
    fields: [F("top", "Dòng trên", "Bình luận"), F("kw", "Từ khoá", "AI"), F("gift", "Quà nhận được", "để nhận checklist soát lỗi ảnh AI", true), F("note", "Ghi chú nhỏ", "Mình gửi qua tin nhắn")],
    scenes: [["0–1s", "Chữ 'Bình luận'"], ["1–3s", "Ô từ khoá vàng bật to"], ["3–5s", "Lợi ích + mũi tên chỉ xuống"]],
    how: ["Ghép cuối video, chỉ một CTA", "Chỉ hứa tài nguyên mà bạn thật sự sẽ gửi"], kw: ["comment", "call to action", "like share subscribe"] },
  { id: "h-outro", title: "Cảm ơn bạn đã xem", cat: "Kết video", seconds: 4, Comp: HOutro,
    palette: [SLATE, WARM, PINK, INK, SUN, "#DDE6F0"],
    fields: [F("initial", "Chữ trong ảnh đại diện", "H"), F("thanks", "Lời cảm ơn", "Cảm ơn bạn đã xem", true), F("handle", "Tên kênh", "Huongptc AI · Phạm Hương"), F("b1", "Nút 1", "Theo dõi"), F("b2", "Nút 2", "Xem video tiếp theo")],
    scenes: [["0–1s", "Ảnh đại diện tròn"], ["1–4s", "Lời cảm ơn + hai nút"]],
    how: ["Thay chữ H bằng ảnh thật của Phạm Hương trong trình chỉnh sửa", "Giữ dưới 4 giây"], kw: ["outro", "thanks for watching", "end screen"] },
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
export const CATS = ["Tin tức AI", "Review tool", "Hook mở đầu", "So sánh", "Podcast · Quote", "Ra mắt sản phẩm", "Hướng dẫn", "Proof · Kết quả", "Chốt đơn · CTA", "Vlog", "Kết video", "Khác"];
export { UI };
