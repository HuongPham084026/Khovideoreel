import { Player, type PlayerRef } from "@remotion/player";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as S from "../storage";
import { FPS, H, TEMPLATES, W, type Fields, type Template } from "../templates";
import { TemplateRunner } from "../templates/runner";
import { Clock, useClock } from "./clock";
import { AudioBus } from "./audioBus";
import type { CaptionSource } from "./AudioEditor";
import { groupWords } from "./captions";
import { cssFilter } from "./filters";
import Inspector from "./Inspector";
import MediaPanel from "./MediaPanel";
import {
  ASPECTS, aLen, audioLanes, clamp, fmt, isImage, layout, loadDraft, makeAudio, makeClip, makeOverlay, newProject, normalize, overlayLanes, projectTotal, saveDraft, slotAt,
  splitAt, startFresh, totalOf, uid, wantsNewProject, type AClip, type Bg, type Overlay, type Project, type Slot, type Src,
} from "./model";
import { checkOverlayRender, renderOverlay } from "./renderOverlay";
import Timeline from "./Timeline";
import "./studio.css";

const MAX_HISTORY = 100;
/* Bố cục tính theo TỈ LỆ cửa sổ (không theo px): phóng to / thu nhỏ trang thì các khối vẫn giữ đúng tỉ lệ bạn đã chọn */
const TLF_KEY = "kho-reel:timeline-frac";
const TLF_DEFAULT = 0.3, TLF_MIN = 0.12, TLF_MAX = 0.75; // phần trăm chiều cao cửa sổ dành cho timeline
const readTlf = () => {
  try { const v = Number(localStorage.getItem(TLF_KEY)); if (Number.isFinite(v) && v >= TLF_MIN && v <= TLF_MAX) return v; } catch { /* bị chặn */ }
  return TLF_DEFAULT;
};

function TimeReadout({ clock, total }: { clock: Clock; total: number }) {
  const t = useClock(clock);
  return <span className="time"><b>{fmt(t)}</b> / {fmt(total)}</span>;
}

function BgLayer({ bg }: { bg: Bg }) {
  const url = bg.src ? S.fileUrl(bg.src.kind, bg.src.name) : "";
  if (bg.type === "gradient") return <div className="bgl" style={{ background: `linear-gradient(180deg, ${bg.color}, ${bg.color2})` }} />;
  if (bg.type === "image" && url) return <img className="bgl cover" src={url} alt="" />;
  if (bg.type === "video" && url) return <video className="bgl cover" src={url} autoPlay muted loop playsInline />;
  return <div className="bgl" style={{ background: bg.color }} />;
}

/** Xem trước một lớp mẫu/chữ: Player của Remotion đặt lên trên video, tua theo đồng hồ của timeline */
const OverlayPreview = memo(function OverlayPreview({ o, clock, box }: { o: Overlay; clock: Clock; box: { w: number; h: number } }) {
  const t = useClock(clock);
  const ref = useRef<PlayerRef>(null);
  const frames = Math.max(2, Math.round(o.len * FPS));
  const visible = t >= o.start && t < o.start + o.len;
  const frame = clamp(Math.floor((t - o.start) * FPS), 0, frames - 1);
  useEffect(() => { ref.current?.seekTo(frame); }, [frame]);
  const props = useMemo(() => ({ tid: o.tid, f: o.fields, env: { transparent: !o.ownBg, colors: o.colors } }), [o.tid, o.fields, o.ownBg, o.colors]);
  // mẫu thiết kế cho khung 9:16: ở khung khác thì đặt vừa chính giữa, giống bản xuất
  const h = Math.min(box.h, (box.w * 16) / 9);
  return (
    <div className="ovl" style={{ width: (h * 9) / 16, height: h, left: (box.w - (h * 9) / 16) / 2, top: (box.h - h) / 2, visibility: visible ? "visible" : "hidden" }}>
      <Player ref={ref} component={TemplateRunner} inputProps={props} durationInFrames={frames} fps={FPS} compositionWidth={W} compositionHeight={H}
        style={{ width: "100%", height: "100%" }} controls={false} clickToPlay={false} acknowledgeRemotionLicense />
    </div>
  );
});

export default function Studio() {
  const fresh = useRef(wantsNewProject()).current; // true: mở mới từ kho, bỏ qua phiên cũ
  const [P, setP] = useState<Project>(() => (fresh ? newProject() : loadDraft()));
  const pRef = useRef(P);
  useEffect(() => { if (fresh) startFresh(); }, [fresh]);
  const past = useRef<Project[]>([]);
  const future = useRef<Project[]>([]);
  const clock = useRef(new Clock()).current;
  const [sel, setSel] = useState<string | null>(null);
  const [selO, setSelO] = useState<string | null>(null);
  const [selA, setSelA] = useState<string | null>(null);
  const aud = useRef(new AudioBus()).current;
  const [cap, setCap] = useState<{ label: string; progress: number; stage: string; err: string } | null>(null);
  const capAbort = useRef<AbortController | null>(null);
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);
  const [activeId, setActiveId] = useState<string>();
  const [pps, setPps] = useState(60);
  const [tlf, setTlf] = useState(readTlf); // timeline chiếm bao nhiêu phần chiều cao cửa sổ, kéo thanh ngăn để đổi
  const saveTlf = (v: number) => { try { localStorage.setItem(TLF_KEY, v.toFixed(4)); } catch { /* bị chặn */ } };
  const dragSplit = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const y0 = e.clientY, f0 = tlf;
    let last = f0;
    const move = (ev: PointerEvent) => { last = clamp(f0 + (y0 - ev.clientY) / window.innerHeight, TLF_MIN, TLF_MAX); setTlf(last); };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); saveTlf(last); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const keySplit = (e: React.KeyboardEvent) => {
    const d = e.key === "ArrowUp" ? 0.02 : e.key === "ArrowDown" ? -0.02 : 0;
    if (!d) return;
    e.preventDefault();
    const v = clamp(tlf + d, TLF_MIN, TLF_MAX);
    setTlf(v);
    saveTlf(v);
  };
  const resetSplit = () => { setTlf(TLF_DEFAULT); saveTlf(TLF_DEFAULT); };
  const [toast, setToast] = useState("");
  const toastT = useRef<number>();
  const [reload, setReload] = useState(0);
  const [exportOpen, setExportOpen] = useState(false);
  const [conn, setConn] = useState<S.Status | null | undefined>(undefined);

  const say = useCallback((m: string) => {
    setToast(m);
    window.clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToast(""), 3500);
  }, []);
  useEffect(() => { S.status().then(setConn); }, []);

  /* ---------- dữ liệu dự án + lịch sử hoàn tác ---------- */
  const apply = useCallback((p: Project) => { pRef.current = p; setP(p); }, []);
  const mark = useCallback(() => {
    past.current.push(pRef.current);
    if (past.current.length > MAX_HISTORY) past.current.shift();
    future.current = [];
  }, []);
  /** live = true: không ghi thêm một mục lịch sử (dùng khi kéo thả, đã gọi mark() lúc bắt đầu) */
  const edit = useCallback((fn: (p: Project) => Project, live = false) => {
    const next = fn(pRef.current);
    if (next === pRef.current) return;
    if (!live) mark();
    apply(next);
  }, [apply, mark]);
  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(pRef.current);
    apply(prev);
  }, [apply]);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(pRef.current);
    apply(next);
  }, [apply]);

  const slots = useMemo(() => layout(P), [P]);
  const slotsRef = useRef<Slot[]>(slots);
  slotsRef.current = slots;
  const total = projectTotal(P, slots);
  const totalRef = useRef(total);
  totalRef.current = total;
  const lanes = useMemo(() => overlayLanes(P.overlays), [P.overlays]);
  const aLanes = useMemo(() => audioLanes(P.audio), [P.audio]);
  const active = slots.find((s) => s.c.id === activeId);
  const selClip = P.video.find((c) => c.id === sel);
  const selOverlay = P.overlays.find((o) => o.id === selO);
  const selAudio = P.audio.find((a) => a.id === selA);
  const clipStart = slots.find((x) => x.c.id === sel)?.start ?? 0;

  /* ---------- phát và tua ---------- */
  const vids = useRef(new Map<string, HTMLVideoElement>());
  const blurEl = useRef<HTMLVideoElement | null>(null);

  /** Clip đang hiển thị tại thời điểm tt; hết dãy clip mà không còn lớp mẫu nào thì giữ khung cuối */
  const slotFor = useCallback((tt: number) => {
    const sl = slotsRef.current;
    const s = slotAt(sl, tt);
    if (s) return s;
    return sl.length && tt >= totalOf(sl) && totalRef.current <= totalOf(sl) + 0.001 ? sl[sl.length - 1] : undefined;
  }, []);

  const setTime = useCallback((tt: number) => {
    clock.set(tt);
    setActiveId(slotFor(tt)?.c.id);
  }, [clock, slotFor]);

  /** Đưa nhạc / giọng đọc về đúng thời điểm tt, đặt âm lượng theo mờ dần vào/ra */
  const syncAudio = useCallback((tt: number, play: boolean) => {
    for (const a of pRef.current.audio) {
      const el = aud.els.get(a.id);
      if (!el) continue;
      const len = aLen(a);
      const local = tt - a.start;
      if (local < 0 || local >= len) { if (!el.paused) el.pause(); continue; }
      const want = a.in + local;
      if (!play || Math.abs(el.currentTime - want) > 0.15) el.currentTime = want;
      const fade = Math.min(a.fadeIn > 0 ? local / a.fadeIn : 1, a.fadeOut > 0 ? (len - local) / a.fadeOut : 1);
      aud.setGain(a.id, (a.vol / 100) * clamp(fade, 0, 1));
      if (play) { if (el.paused) el.play().catch(() => undefined); } else if (!el.paused) el.pause();
    }
  }, [aud]);

  /** Đưa hình và tiếng về đúng thời điểm tt của timeline */
  const sync = useCallback((tt: number, play: boolean) => {
    syncAudio(tt, play);
    const s = slotFor(tt);
    for (const [id, el] of vids.current) if (id !== s?.c.id) el.pause();
    const b = blurEl.current;
    if (!s || s.c.image) { b?.pause(); return; }
    const el = vids.current.get(s.c.id);
    if (!el) return;
    const want = s.c.in + clamp(tt - s.start, 0, s.len);
    if (!play || Math.abs(el.currentTime - want) > 0.08) el.currentTime = want;
    el.volume = clamp(s.c.vol / 100, 0, 1);
    if (play) el.play().catch(() => undefined); else el.pause();
    if (b) {
      if (!play || Math.abs(b.currentTime - want) > 0.2) b.currentTime = want;
      if (play) b.play().catch(() => undefined); else b.pause();
    }
  }, [slotFor, syncAudio]);

  const seek = useCallback((tt: number) => {
    const v = clamp(tt, 0, totalRef.current);
    setTime(v);
    sync(v, playingRef.current);
  }, [setTime, sync]);

  const stop = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    sync(clock.t, false);
  }, [clock, sync]);
  const play = useCallback(() => {
    if (totalRef.current <= 0) return;
    if (clock.t >= totalRef.current - 0.05) setTime(0);
    aud.ensure();
    playingRef.current = true;
    setPlaying(true);
    sync(clock.t, true);
  }, [clock, setTime, sync, aud]);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let curId = slotFor(clock.t)?.c.id;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const sl = slotsRef.current;
      const tot = totalRef.current;
      let tt = clock.t;
      const s = slotAt(sl, tt);
      if (!s) tt += dt; // chỉ còn lớp mẫu/chữ: thời gian chạy theo đồng hồ
      else {
        const el = vids.current.get(s.c.id);
        tt = s.c.image || !el ? tt + dt : s.start + (el.currentTime - s.c.in);
        if (tt >= s.start + s.len - 0.02) tt = s.start + s.len; // hết clip → sang clip kế
      }
      if (tt >= tot - 0.001) { setTime(tot); stop(); return; }
      const nid = slotFor(tt)?.c.id;
      if (nid !== curId) { curId = nid; setTime(tt); sync(tt, true); } else { setTime(tt); syncAudio(tt, true); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, clock, setTime, sync, syncAudio, stop, slotFor]);

  /* sau mỗi thay đổi dự án: tự lưu nháp, giữ đầu phát trong khoảng, cập nhật hình xem trước */
  useEffect(() => {
    setTime(Math.min(clock.t, total));
    if (!playingRef.current) sync(clock.t, false);
    const id = window.setTimeout(() => saveDraft(P), 500);
    return () => window.clearTimeout(id);
  }, [P, total, clock, setTime, sync]);
  /* tải lại / đóng trang đúng lúc vừa sửa: lưu ngay, không chờ 0,5 giây */
  useEffect(() => {
    const flush = () => saveDraft(pRef.current);
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);
  useEffect(() => { sync(clock.t, playingRef.current); }, [activeId, clock, sync]);
  /* gỡ phần tử âm thanh của các clip đã bị xoá */
  useEffect(() => {
    const ids = new Set(P.audio.map((a) => a.id));
    for (const id of [...aud.els.keys()]) if (!ids.has(id)) aud.unregister(id);
  }, [P.audio, aud]);

  /* ---------- thao tác ---------- */
  const add = useCallback(async (src: Src) => {
    try {
      const c = await makeClip(src);
      const start = totalOf(slotsRef.current);
      edit((p) => ({ ...p, video: [...p.video, c] }));
      setSel(c.id);
      setSelO(null);
      clock.set(start);
    } catch (e) { say("Không thêm được: " + (e as Error).message); }
  }, [edit, say, clock]);

  const addTemplate = useCallback((t: Template, fields?: Fields) => {
    const o = makeOverlay(t, clock.t, fields);
    edit((p) => ({ ...p, overlays: [...p.overlays, o] }));
    setSelO(o.id);
    setSel(null);
  }, [edit, clock]);

  const chooseBg = useCallback((src: Src) => {
    edit((p) => ({ ...p, options: { ...p.options, fit: "contain", bg: { ...p.options.bg, type: isImage(src.name) ? "image" : "video", src } } }));
    say("Đã chọn làm nền. Video đang ở chế độ “Vừa khung + nền riêng” để thấy nền.");
  }, [edit, say]);

  const selectClip = useCallback((id: string | null) => { setSel(id); if (id) { setSelO(null); setSelA(null); } }, []);
  const selectOverlay = useCallback((id: string | null) => { setSelO(id); if (id) { setSel(null); setSelA(null); } }, []);
  const selectAudio = useCallback((id: string | null) => { setSelA(id); if (id) { setSel(null); setSelO(null); } }, []);

  /** Đặt nhạc / giọng đọc vào timeline tại đầu phát */
  const addAudio = useCallback(async (src: Src, kind: AClip["kind"]) => {
    try {
      const a = await makeAudio(src, kind, clock.t);
      edit((p) => ({ ...p, audio: [...p.audio, a] }));
      selectAudio(a.id);
    } catch (e) { say("Không thêm được âm thanh: " + (e as Error).message); }
  }, [clock, edit, say, selectAudio]);

  /** Phiên âm tiếng nói → lớp phụ đề trên timeline */
  const makeCaptions = useCallback(async (src: CaptionSource) => {
    const ac = new AbortController();
    capAbort.current = ac;
    setCap({ label: src.label, progress: 0, stage: "Bắt đầu…", err: "" });
    try {
      const first = await S.startTranscribe({ kind: src.kind as S.Kind, name: src.name, in: src.in, out: src.out });
      const done = await S.waitJob(first, (j) => setCap({ label: src.label, progress: j.progress, stage: j.stage, err: "" }), ac.signal);
      const words = (done.result?.words ?? []) as S.Word[];
      const t = TEMPLATES.find((x) => x.id === "s-phude")!;
      const o = makeOverlay(t, src.start, { cues: JSON.stringify(groupWords(words, 4)), words: JSON.stringify(words) });
      o.len = Math.max(0.5, src.out - src.in);
      o.name = "Phụ đề: " + src.label;
      edit((p) => ({ ...p, overlays: [...p.overlays, o] }));
      selectOverlay(o.id);
      setCap(null);
      say(`Đã tạo phụ đề (${words.length} từ). Bạn có thể sửa chữ ở cột bên phải.`);
    } catch (e) {
      if (ac.signal.aborted) setCap(null);
      else setCap((c) => ({ label: src.label, progress: c?.progress ?? 0, stage: "", err: (e as Error).message }));
    }
  }, [edit, say, selectOverlay]);

  const split = useCallback(() => {
    const r = splitAt(pRef.current, clock.t);
    if (!r) { say("Đặt đầu phát vào giữa một clip để cắt."); return; }
    edit(() => r.p);
    setSel(r.keep);
    setSelO(null);
  }, [clock, edit, say]);
  const remove = useCallback(() => {
    if (selA) { edit((p) => ({ ...p, audio: p.audio.filter((a) => a.id !== selA) })); setSelA(null); return; }
    if (selO) { edit((p) => ({ ...p, overlays: p.overlays.filter((o) => o.id !== selO) })); setSelO(null); return; }
    if (!sel) return;
    edit((p) => ({ ...p, video: p.video.filter((c) => c.id !== sel) }));
    setSel(null);
  }, [sel, selO, selA, edit]);
  const duplicate = useCallback(() => {
    if (selA) {
      const a = pRef.current.audio.find((x) => x.id === selA);
      if (!a) return;
      const copy = { ...a, id: uid(), start: a.start + aLen(a) };
      edit((p) => ({ ...p, audio: [...p.audio, copy] }));
      setSelA(copy.id);
      return;
    }
    if (selO) {
      const o = pRef.current.overlays.find((x) => x.id === selO);
      if (!o) return;
      const copy = { ...o, id: uid(), start: o.start + o.len };
      edit((p) => ({ ...p, overlays: [...p.overlays, copy] }));
      setSelO(copy.id);
      return;
    }
    const c = pRef.current.video.find((v) => v.id === sel);
    if (!c) return;
    const copy = { ...c, id: uid() };
    edit((p) => { const i = p.video.findIndex((v) => v.id === sel); return { ...p, video: [...p.video.slice(0, i + 1), copy, ...p.video.slice(i + 1)] }; });
    setSel(copy.id);
  }, [sel, selO, selA, edit]);

  const saveProject = useCallback(async () => {
    try {
      await S.putJson("project", S.safeName(pRef.current.name) + ".json", pRef.current);
      setReload((r) => r + 1);
      say("Đã lưu dự án vào thư mục Dự án");
    } catch (e) { say("Không lưu được: " + (e as Error).message); }
  }, [say]);
  const openProject = useCallback(async (file: string) => {
    try {
      const p = await S.getJson<Project>("project", file);
      if (!Array.isArray(p.video) || !p.options) throw new Error("Tệp dự án không hợp lệ");
      stop();
      edit(() => normalize(p));
      setSel(null);
      setSelO(null);
      setSelA(null);
      setTime(0);
      say("Đã mở dự án");
    } catch (e) { say("Không mở được: " + (e as Error).message); }
  }, [edit, say, setTime, stop]);
  const newProj = useCallback(() => {
    if ((pRef.current.video.length || pRef.current.overlays.length || pRef.current.audio.length) && !confirm("Tạo dự án mới? Dự án hiện tại vẫn nằm trong lịch sử hoàn tác nếu bạn chưa lưu.")) return;
    stop();
    edit(() => newProject());
    setSel(null);
    setSelO(null);
    setSelA(null);
    setTime(0);
  }, [edit, setTime, stop]);

  /* nhận mẫu từ kho gửi sang ("Mở trong trình chỉnh sửa") */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(S.STUDIO_ADD_KEY);
      if (!raw) return;
      localStorage.removeItem(S.STUDIO_ADD_KEY);
      const { tid, fields, colors } = JSON.parse(raw) as { tid: string; fields?: Fields; colors?: Record<string, string> };
      const t = TEMPLATES.find((x) => x.id === tid);
      if (!t) return;
      const o = makeOverlay(t, 0, fields, colors);
      edit((p) => ({ ...p, overlays: [...p.overlays, o] }));
      setSelO(o.id);
    } catch { /* khoá hỏng: bỏ qua */ }
  }, [edit]);

  /* phím tắt */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]") && !(el instanceof HTMLInputElement && el.type === "range")) return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if ((e.ctrlKey || e.metaKey) && k === "y") { e.preventDefault(); redo(); }
      else if (e.ctrlKey || e.metaKey || e.altKey) return;
      else if (k === " ") { e.preventDefault(); playingRef.current ? stop() : play(); }
      else if (k === "s") split();
      else if (k === "delete" || k === "backspace") remove();
      else if (k === "arrowleft") seek(clock.t - (e.shiftKey ? 1 : 0.1));
      else if (k === "arrowright") seek(clock.t + (e.shiftKey ? 1 : 0.1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, play, stop, split, remove, seek, clock]);

  /* ---------- khung xem trước ---------- */
  const stageRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [aw, ah] = ASPECTS[P.options.aspect];
  const k = Math.min((box.w - 32) / aw, (box.h - 32) / ah);
  const fw = Math.max(0, aw * k), fh = Math.max(0, ah * k);
  const fit = P.options.fit;
  const fitCls = fit === "cover" ? "cover" : "contain";
  const url = (s: Slot) => S.fileUrl(s.c.src.kind, s.c.src.name);
  const hasAny = slots.length > 0 || P.overlays.length > 0 || P.audio.length > 0;
  const br = P.options.brand;
  const bm = fw * 0.04;
  const corner = (pos: string, size: number): React.CSSProperties => ({ width: size, [pos.startsWith("t") ? "top" : "bottom"]: bm, [pos.endsWith("l") ? "left" : "right"]: bm });

  return (
    <div className="studio" style={{ "--tlf": tlf } as React.CSSProperties}>
      <header className="sbar">
        <a className="btn sm ghost" href="#">← Kho mẫu</a>
        <h1>Trình chỉnh sửa</h1>
        <span className="sp" />
        <button className="btn sm" type="button" onClick={newProj}>Mới</button>
        <button className="btn sm" type="button" onClick={undo} disabled={!past.current.length} title="Ctrl+Z">↶ Hoàn tác</button>
        <button className="btn sm" type="button" onClick={redo} disabled={!future.current.length} title="Ctrl+Y">↷ Làm lại</button>
        <button className="btn sm" type="button" onClick={saveProject} disabled={!conn}>Lưu dự án</button>
        <button className="btn sm primary" type="button" onClick={() => { stop(); setExportOpen(true); }} disabled={!conn || !hasAny}>Xuất MP4</button>
      </header>

      {conn === null && <div className="sbanner">Chưa kết nối máy chủ trên máy. Hãy mở app bằng <b>Chay_app.bat</b>.</div>}

      <MediaPanel onAdd={add} onUseBg={chooseBg} onOpenProject={openProject} onAddTemplate={addTemplate} onAddAudio={addAudio} say={say} reloadKey={reload} />

      <main className="stage" ref={stageRef}>
        <div className="frame" style={{ width: fw, height: fh }}>
          <div className="vlayer" style={{ filter: cssFilter(P.options.filter.id, P.options.filter.strength) }}>
          {(fit === "contain" || !active) && <BgLayer bg={P.options.bg} />}
          {fit === "blur" && active && (active.c.image
            ? <img className="vid cover blur" src={url(active)} alt="" />
            : <video key={active.c.id} ref={blurEl} className="vid cover blur" src={url(active)} muted playsInline preload="auto" />)}
          {slots.filter((s) => !s.c.image).map((s) => (
            <video key={s.c.id} className={"vid " + fitCls} src={url(s)} preload="auto" playsInline
              ref={(el) => { if (el) vids.current.set(s.c.id, el); else vids.current.delete(s.c.id); }}
              style={{ visibility: s.c.id === active?.c.id ? "visible" : "hidden" }} />
          ))}
          {active?.c.image && <img className={"vid " + fitCls} src={url(active)} alt="" />}
          </div>
          {P.overlays.map((o) => <OverlayPreview key={o.id} o={o} clock={clock} box={{ w: fw, h: fh }} />)}
          {br.logo && <img className="brandlogo" alt="" src={S.fileUrl(br.logo.kind, br.logo.name)} style={corner(br.logoPos, (br.logoSize / 100) * fw)} />}
          {br.avatar && <img className="brandlogo" alt="" src={S.fileUrl(br.avatar.kind, br.avatar.name)} style={{ ...corner(br.avatarPos, (br.avatarSize / 100) * fw), aspectRatio: "1", objectFit: "cover", borderRadius: "50%" }} />}
          {P.audio.map((a) => (
            <audio key={a.id} src={S.fileUrl(a.src.kind, a.src.name)} preload="auto" ref={(el) => { if (el) aud.register(a.id, el); }} />
          ))}
          {!hasAny && <p className="empty">Thêm video, ảnh hoặc một mẫu từ cột bên trái để bắt đầu</p>}
        </div>
      </main>

      <Inspector P={P} clip={selClip} clipStart={clipStart} overlay={selOverlay} audio={selAudio} mark={mark} edit={edit} onDuplicate={duplicate} onRemove={remove} onCaptions={makeCaptions} say={say} />

      <div className="splitter" role="separator" aria-orientation="horizontal" tabIndex={0} aria-valuemin={Math.round(TLF_MIN * 100)} aria-valuenow={Math.round(tlf * 100)}
        title="Kéo lên/xuống để đổi độ cao của timeline · bấm đúp để đặt lại" onPointerDown={dragSplit} onKeyDown={keySplit} onDoubleClick={resetSplit}><i /></div>

      <section className="tl" aria-label="Dòng thời gian">
        <div className="tbar">
          <button className="btn sm" type="button" onClick={() => (playing ? stop() : play())} disabled={!hasAny} title="Phím cách">{playing ? "❚❚ Dừng" : "▶ Phát"}</button>
          <TimeReadout clock={clock} total={total} />
          <span className="sp" />
          <button className="btn sm" type="button" onClick={split} disabled={!slots.length} title="Phím S">✂ Cắt tại đầu phát</button>
          <button className="btn sm" type="button" onClick={duplicate} disabled={!sel && !selO && !selA}>Nhân đôi</button>
          <button className="btn sm danger" type="button" onClick={remove} disabled={!sel && !selO && !selA} title="Phím Delete">Xoá</button>
          <label className="zoom">Thu phóng
            <input type="range" min={10} max={240} value={pps} onChange={(e) => setPps(+e.target.value)} />
          </label>
        </div>
        <Timeline slots={slots} overlays={P.overlays} lanes={lanes} audio={P.audio} aLanes={aLanes} total={total} sel={sel} selO={selO} selA={selA} pps={pps} clock={clock}
          onSeek={seek} onSelect={selectClip} onSelectO={selectOverlay} onSelectA={selectAudio} mark={mark} edit={edit} />
      </section>

      {cap && (
        <div className="modal" role="dialog" aria-modal="true" aria-label="Tạo phụ đề tự động">
          <div className="box capmodal">
            <h2>Tạo phụ đề tự động</h2>
            <p className="hint">Nhận dạng lời nói trong “{cap.label}” (chạy trên máy bạn). Lần đầu dùng, máy cần tải mô hình nhận dạng khoảng 460 MB nên sẽ lâu hơn.</p>
            {!cap.err && <div className="prog" aria-live="polite"><div className="bar"><i style={{ width: `${Math.max(6, cap.progress)}%` }} /></div><span>{cap.stage || "Đang xử lý…"} {Math.round(cap.progress)}%</span></div>}
            {cap.err && <pre className="err">{cap.err}</pre>}
            <div className="acts">
              <button className="btn sm danger" type="button" onClick={() => { capAbort.current?.abort(); setCap(null); }}>{cap.err ? "Đóng" : "Hủy"}</button>
            </div>
          </div>
        </div>
      )}
      {exportOpen && <ExportDialog P={P} say={say} onClose={() => setExportOpen(false)} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

/* ================= Xuất MP4: dựng lớp mẫu trong trình duyệt, ghép bằng FFmpeg trên máy chủ ================= */
const ASPECTS_LABEL: Record<Project["options"]["aspect"], string> = { "9:16": "1080×1920", "16:9": "1920×1080", "1:1": "1080×1080", "4:5": "1080×1350" };

function ExportDialog({ P, say, onClose }: { P: Project; say: (m: string) => void; onClose: () => void }) {
  const [name, setName] = useState(P.name);
  const [job, setJob] = useState<S.Job | null>(null);
  const [err, setErr] = useState("");
  const [prep, setPrep] = useState<{ i: number; n: number; p: number } | null>(null);
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!job || job.status !== "running") return;
    const id = window.setTimeout(async () => {
      try { setJob(await S.getJob(job.id)); } catch (e) { setErr((e as Error).message); }
    }, 500);
    return () => window.clearTimeout(id);
  }, [job]);

  async function start() {
    setErr("");
    setJob(null);
    const ac = new AbortController();
    ctl.current = ac;
    try {
      const files: Record<string, string> = {};
      if (P.overlays.length) {
        const problem = await checkOverlayRender();
        if (problem) throw new Error("Trình duyệt này chưa dựng được lớp mẫu: " + problem + ". Hãy dùng Chrome hoặc Edge bản mới.");
        for (let i = 0; i < P.overlays.length; i++) {
          const o = P.overlays[i];
          setPrep({ i: i + 1, n: P.overlays.length, p: 0 });
          files[o.id] = await renderOverlay(o, (p) => setPrep({ i: i + 1, n: P.overlays.length, p }), ac.signal);
        }
      }
      setPrep(null);
      const project = { ...P, name, overlays: P.overlays.map((o) => ({ id: o.id, file: files[o.id], start: o.start, len: o.len })) };
      setJob(await S.startExport(project));
    } catch (e) {
      setPrep(null);
      if (!ac.signal.aborted) setErr((e as Error).message);
    }
  }
  const running = job?.status === "running" || !!prep;
  const done = job?.status === "done" && job.result;
  const nOv = P.overlays.length;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Xuất MP4" onClick={(e) => { if (e.target === e.currentTarget && !running) onClose(); }}>
      <div className="box">
        <h2>Xuất video MP4</h2>
        <label className="f"><span>Tên tệp</span><input value={name} maxLength={80} disabled={running} onChange={(e) => setName(e.target.value)} /></label>
        <p className="hint">{ASPECTS_LABEL[P.options.aspect]} · 30 fps · {P.video.length} clip{nOv ? ` · ${nOv} lớp mẫu/chữ` : ""}. Tệp lưu vào thư mục “Xuất video”.</p>
        {prep && (
          <div className="prog" aria-live="polite">
            <div className="bar"><i style={{ width: `${Math.round(prep.p * 100)}%` }} /></div>
            <span>Dựng lớp mẫu {prep.i}/{prep.n}… {Math.round(prep.p * 100)}%</span>
          </div>
        )}
        {job && (
          <div className="prog" aria-live="polite">
            <div className="bar"><i style={{ width: `${job.status === "done" ? 100 : job.progress}%` }} /></div>
            <span>{job.status === "running" ? `Ghép video… ${Math.round(job.progress)}%` : job.status === "done" ? "Hoàn tất" : job.status === "cancelled" ? "Đã hủy" : "Lỗi"}</span>
          </div>
        )}
        {(err || job?.error) && <pre className="err">{err || job?.error}</pre>}
        {done && (
          <p>
            <a className="btn sm primary" href={S.fileUrl("export", job.result!.file)} download={job.result!.file}>Tải {job.result!.file}</a>{" "}
            <button className="btn sm" type="button" onClick={() => S.openFolder("export")}>Mở thư mục Xuất video</button>
          </p>
        )}
        {done && <video className="result" src={S.fileUrl("export", job.result!.file)} controls playsInline />}
        <div className="acts">
          {running
            ? <button className="btn sm danger" type="button" onClick={() => { ctl.current?.abort(); if (job) S.cancelJob(job.id); setPrep(null); }}>Hủy</button>
            : <>
              <button className="btn sm ghost" type="button" onClick={onClose}>Đóng</button>
              <button className="btn sm primary" type="button" disabled={!name.trim()} onClick={() => { start(); say("Bắt đầu dựng video"); }}>{done ? "Xuất lại" : "Bắt đầu xuất"}</button>
            </>}
        </div>
      </div>
    </div>
  );
}
