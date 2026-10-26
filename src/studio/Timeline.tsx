import { memo, useRef, type PointerEvent as RPointerEvent } from "react";
import { IMAGE_MAX, MIN_LEN, OVERLAY_MIN, aLen, clamp, fmt, type AClip, type Overlay, type Project, type Slot, type VClip } from "./model";
import { useClock, type Clock } from "./clock";

type Edit = (fn: (p: Project) => Project, live?: boolean) => void;
type Props = {
  slots: Slot[]; overlays: Overlay[]; lanes: number[]; audio: AClip[]; aLanes: number[]; total: number;
  sel: string | null; selO: string | null; selA: string | null; pps: number; clock: Clock;
  onSeek: (t: number) => void; onSelect: (id: string | null) => void; onSelectO: (id: string | null) => void; onSelectA: (id: string | null) => void;
  mark: () => void; edit: Edit;
};

const STEPS = [0.5, 1, 2, 5, 10, 15, 30, 60, 120];

function Playhead({ clock, pps }: { clock: Clock; pps: number }) {
  const t = useClock(clock);
  return <div className="playhead" style={{ transform: `translateX(${t * pps}px)` }}><i /></div>;
}

function Timeline({ slots, overlays, lanes, audio, aLanes, total, sel, selO, selA, pps, clock, onSeek, onSelect, onSelectO, onSelectA, mark, edit }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const width = Math.max(total * pps + 120, 600);
  const step = STEPS.find((s) => s * pps >= 70) ?? 120;
  const ticks = Array.from({ length: Math.floor((width / pps) / step) + 1 }, (_, i) => i * step);

  const nLanes = Math.max(1, ...lanes.map((l) => l + 1));
  const nALanes = Math.max(1, ...aLanes.map((l) => l + 1));
  const timeAt = (e: { clientX: number }) => (e.clientX - trackRef.current!.getBoundingClientRect().left) / pps;

  /* kéo trên thước / vùng trống để tua */
  function scrub(e: RPointerEvent) {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onSeek(clamp(timeAt(e), 0, total));
    const move = (ev: PointerEvent) => onSeek(clamp(timeAt(ev), 0, total));
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  /* kéo thân clip để đổi thứ tự */
  function bodyDown(e: RPointerEvent, c: VClip) {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect(c.id);
    const x0 = e.clientX;
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - x0) < 5) return;
      if (!moved) { moved = true; mark(); }
      const pt = timeAt(ev);
      edit((p) => {
        const others = p.video.filter((v) => v.id !== c.id);
        let acc = 0, idx = 0;
        for (const o of others) { const len = o.out - o.in; if (acc + len / 2 < pt) idx++; acc += len; }
        const cur = p.video.find((v) => v.id === c.id)!;
        if (p.video.indexOf(cur) === idx) return p;
        return { ...p, video: [...others.slice(0, idx), cur, ...others.slice(idx)] };
      }, true);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!moved) onSeek(clamp(timeAt(ev), 0, total));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  /* kéo mép clip để cắt bớt đầu / cuối */
  function edgeDown(e: RPointerEvent, c: VClip, side: "l" | "r") {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect(c.id);
    mark();
    const x0 = e.clientX;
    const base = c;
    const move = (ev: PointerEvent) => {
      const dt = (ev.clientX - x0) / pps;
      edit((p) => ({
        ...p,
        video: p.video.map((v) => {
          if (v.id !== c.id) return v;
          if (base.image) {
            const len = clamp(base.out - base.in + (side === "r" ? dt : -dt), 0.2, IMAGE_MAX);
            return { ...v, in: 0, out: len };
          }
          return side === "l"
            ? { ...v, in: clamp(base.in + dt, 0, base.out - MIN_LEN) }
            : { ...v, out: clamp(base.out + dt, base.in + MIN_LEN, base.dur) };
        }),
      }), true);
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  /* lớp mẫu/chữ: kéo thân để dời thời điểm, kéo mép để đổi độ dài */
  function oBodyDown(e: RPointerEvent, o: Overlay) {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelectO(o.id);
    const x0 = e.clientX;
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - x0) < 5) return;
      if (!moved) { moved = true; mark(); }
      const start = Math.max(0, o.start + (ev.clientX - x0) / pps);
      edit((p) => ({ ...p, overlays: p.overlays.map((x) => (x.id === o.id ? { ...x, start } : x)) }), true);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!moved) onSeek(clamp(timeAt(ev), 0, total));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  function oEdgeDown(e: RPointerEvent, o: Overlay, side: "l" | "r") {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    onSelectO(o.id);
    mark();
    const x0 = e.clientX;
    const move = (ev: PointerEvent) => {
      const dt = (ev.clientX - x0) / pps;
      edit((p) => ({
        ...p,
        overlays: p.overlays.map((x) => {
          if (x.id !== o.id) return x;
          if (side === "r") return { ...x, len: Math.max(OVERLAY_MIN, o.len + dt) };
          const start = clamp(o.start + dt, 0, o.start + o.len - OVERLAY_MIN);
          return { ...x, start, len: o.len - (start - o.start) };
        }),
      }), true);
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  /* nhạc / giọng đọc: kéo thân để dời thời điểm, kéo mép để cắt bớt đầu / cuối */
  function aBodyDown(e: RPointerEvent, a: AClip) {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelectA(a.id);
    const x0 = e.clientX;
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - x0) < 5) return;
      if (!moved) { moved = true; mark(); }
      const start = Math.max(0, a.start + (ev.clientX - x0) / pps);
      edit((p) => ({ ...p, audio: p.audio.map((x) => (x.id === a.id ? { ...x, start } : x)) }), true);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!moved) onSeek(clamp(timeAt(ev), 0, total));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }
  function aEdgeDown(e: RPointerEvent, a: AClip, side: "l" | "r") {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    onSelectA(a.id);
    mark();
    const x0 = e.clientX;
    const move = (ev: PointerEvent) => {
      const dt = (ev.clientX - x0) / pps;
      edit((p) => ({
        ...p,
        audio: p.audio.map((x) => {
          if (x.id !== a.id) return x;
          if (side === "r") return { ...x, out: clamp(a.out + dt, a.in + MIN_LEN, a.dur) };
          const nin = clamp(a.in + dt, 0, a.out - MIN_LEN);
          return { ...x, in: nin, start: Math.max(0, a.start + (nin - a.in)) };
        }),
      }), true);
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div className="tl-scroll">
      <div className="tl-inner" style={{ width }} ref={trackRef}>
        <div className="ruler" onPointerDown={scrub}>
          {ticks.map((t) => <span key={t} className="tick" style={{ left: t * pps }}>{fmt(t).replace(".0", "")}</span>)}
        </div>
        <div className="track" onPointerDown={(e) => { if (e.target === e.currentTarget) { onSelect(null); scrub(e); } }}>
          {!slots.length && <p className="tl-empty">Chọn video hoặc ảnh ở cột bên trái để thêm vào đây</p>}
          {slots.map(({ c, start, len }) => (
            <div key={c.id} className={"clip" + (c.image ? " img" : "") + (sel === c.id ? " sel" : "")}
              style={{ left: start * pps, width: Math.max(len * pps - 2, 8) }} title={`${c.name} · ${fmt(len)}`}
              onPointerDown={(e) => bodyDown(e, c)}>
              <b className="h l" onPointerDown={(e) => edgeDown(e, c, "l")} aria-label="Cắt đầu clip" />
              <span className="cn">{c.name}</span>
              <small>{len.toFixed(1)}s{c.vol !== 100 ? ` · ${c.vol}%` : ""}</small>
              <b className="h r" onPointerDown={(e) => edgeDown(e, c, "r")} aria-label="Cắt cuối clip" />
            </div>
          ))}
        </div>
        <div className="otrack" style={{ height: nLanes * 40 + 8 }} onPointerDown={(e) => { if (e.target === e.currentTarget) { onSelectO(null); scrub(e); } }}>
          {!overlays.length && <p className="tl-empty">Lớp mẫu / chữ: chọn một mẫu ở tab “Video mẫu” để đặt lên video</p>}
          {overlays.map((o, i) => (
            <div key={o.id} className={"oclip" + (selO === o.id ? " sel" : "")}
              style={{ left: o.start * pps, width: Math.max(o.len * pps - 2, 10), top: 4 + lanes[i] * 40 }} title={`${o.name} · ${fmt(o.len)}`}
              onPointerDown={(e) => oBodyDown(e, o)}>
              <b className="h l" onPointerDown={(e) => oEdgeDown(e, o, "l")} aria-label="Đổi điểm bắt đầu" />
              <span className="cn">{o.name}</span><small>{o.len.toFixed(1)}s</small>
              <b className="h r" onPointerDown={(e) => oEdgeDown(e, o, "r")} aria-label="Đổi độ dài" />
            </div>
          ))}
        </div>
        <div className="atrack" style={{ height: nALanes * 40 + 8 }} onPointerDown={(e) => { if (e.target === e.currentTarget) { onSelectA(null); scrub(e); } }}>
          {!audio.length && <p className="tl-empty">Nhạc nền / giọng đọc: chọn ở tab “Nhạc” hoặc “Giọng đọc” bên trái</p>}
          {audio.map((a, i) => (
            <div key={a.id} className={"aclip " + a.kind + (selA === a.id ? " sel" : "")}
              style={{ left: a.start * pps, width: Math.max(aLen(a) * pps - 2, 10), top: 4 + aLanes[i] * 40 }} title={`${a.name} · ${fmt(aLen(a))}`}
              onPointerDown={(e) => aBodyDown(e, a)}>
              <b className="h l" onPointerDown={(e) => aEdgeDown(e, a, "l")} aria-label="Cắt đầu" />
              <span className="cn">{a.kind === "music" ? "♪ " : "🎙 "}{a.name}</span><small>{aLen(a).toFixed(1)}s · {a.vol}%</small>
              <b className="h r" onPointerDown={(e) => aEdgeDown(e, a, "r")} aria-label="Cắt cuối" />
            </div>
          ))}
        </div>
        <Playhead clock={clock} pps={pps} />
      </div>
    </div>
  );
}

export default memo(Timeline);
