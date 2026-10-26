import * as S from "../storage";
import { defaults, type Fields, type Template } from "../templates";

export type Aspect = "9:16" | "16:9" | "1:1" | "4:5";
export type Fit = "cover" | "blur" | "contain";
export type Src = { kind: S.Kind; name: string };
export type Bg = { type: "color" | "gradient" | "image" | "video"; color: string; color2: string; src?: Src };
export type VClip = { id: string; src: Src; name: string; in: number; out: number; dur: number; image: boolean; vol: number };
/** Lớp mẫu/chữ đặt lên trên video: dựng từ một mẫu (Remotion), có thể đổi chữ, màu, thời gian */
export type Overlay = { id: string; tid: string; name: string; fields: Fields; colors: Record<string, string>; start: number; len: number; ownBg: boolean };
/** Nhạc nền hoặc giọng đọc đặt trên timeline: start = thời điểm bắt đầu, in/out = đoạn lấy từ tệp gốc */
export type AClip = { id: string; src: Src; name: string; kind: "music" | "voice"; start: number; in: number; out: number; dur: number; vol: number; fadeIn: number; fadeOut: number };
export type Corner = "tl" | "tr" | "bl" | "br";
export type Brand = { logo?: Src; logoPos: Corner; logoSize: number; avatar?: Src; avatarPos: Corner; avatarSize: number };
export type Options = { aspect: Aspect; fit: Fit; bg: Bg; filter: { id: string; strength: number }; brand: Brand };
export type Project = { name: string; options: Options; video: VClip[]; overlays: Overlay[]; audio: AClip[] };
export type Slot = { c: VClip; start: number; len: number };

export const ASPECTS: Record<Aspect, [number, number]> = { "9:16": [9, 16], "16:9": [16, 9], "1:1": [1, 1], "4:5": [4, 5] };
export const FITS: { id: Fit; label: string; hint: string }[] = [
  { id: "cover", label: "Phủ kín khung", hint: "Cắt bớt phần thừa của video" },
  { id: "blur", label: "Vừa khung + nền mờ", hint: "Giữ nguyên video, nền là chính video làm mờ" },
  { id: "contain", label: "Vừa khung + nền riêng", hint: "Giữ nguyên video, lộ phần nền bạn chọn" },
];
export const IMAGE_MAX = 600; // ảnh kéo dài tối đa (giây)
export const MIN_LEN = 0.1;

export const uid = () => Math.random().toString(36).slice(2, 10);
export const isImage = (name: string) => /\.(png|jpe?g|webp|gif|svg)$/i.test(name);
export const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
export const fmt = (t: number) => {
  const s = Math.max(0, t);
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
};

const DEFAULT_OPTIONS: Options = {
  aspect: "9:16", fit: "cover", bg: { type: "color", color: "#263238", color2: "#4D6787" },
  filter: { id: "", strength: 100 },
  brand: { logoPos: "tl", logoSize: 18, avatarPos: "br", avatarSize: 16 },
};
export const newProject = (): Project => ({ name: "Video mới", options: DEFAULT_OPTIONS, video: [], overlays: [], audio: [] });

export function layout(p: Project): Slot[] {
  let t = 0;
  return p.video.map((c) => {
    const s = { c, start: t, len: c.out - c.in };
    t += s.len;
    return s;
  });
}
export const totalOf = (sl: Slot[]) => (sl.length ? sl[sl.length - 1].start + sl[sl.length - 1].len : 0);
export const overlayEnd = (p: Project) => p.overlays.reduce((m, o) => Math.max(m, o.start + o.len), 0);
export const aLen = (a: AClip) => a.out - a.in;
export const audioEnd = (p: Project) => p.audio.reduce((m, a) => Math.max(m, a.start + aLen(a)), 0);
/** Độ dài cả video = phần dài nhất trong dãy clip, các lớp mẫu/chữ và âm thanh */
export const projectTotal = (p: Project, sl: Slot[]) => Math.max(totalOf(sl), overlayEnd(p), audioEnd(p));
/** Chia các mục vào dòng (lane) sao cho không chồng lên nhau trên timeline */
export function lanesOf(items: { start: number; len: number }[]): number[] {
  const ends: number[] = [];
  return items.map((o) => {
    let i = ends.findIndex((e) => e <= o.start + 0.001);
    if (i < 0) i = ends.length;
    ends[i] = o.start + o.len;
    return i;
  });
}
export const overlayLanes = (os: Overlay[]) => lanesOf(os);
export const audioLanes = (as: AClip[]) => lanesOf(as.map((a) => ({ start: a.start, len: aLen(a) })));

/** Tạo clip âm thanh (nhạc/giọng) từ một tệp trong kho; đọc độ dài bằng ffprobe */
export async function makeAudio(src: Src, kind: AClip["kind"], start: number): Promise<AClip> {
  const info = await S.probeFile(src.kind, src.name);
  const dur = Math.max(0.2, info.duration);
  return { id: uid(), src, name: src.name.replace(/\.[^.]+$/, "").replace(/-[0-9a-f]{5}$/, ""), kind, start, in: 0, out: dur, dur, vol: kind === "music" ? 40 : 100, fadeIn: 0, fadeOut: kind === "music" ? 1 : 0 };
}
export const OVERLAY_MIN = 0.2;
export const OVERLAY_MAX = 600;
export const DURATIONS = [15, 30, 60]; // nút chọn nhanh thời lượng (giây)

export function makeOverlay(t: Template, start: number, fields?: Fields, colors: Record<string, string> = {}): Overlay {
  return { id: uid(), tid: t.id, name: t.title, fields: { ...defaults(t), ...(fields ?? {}) }, colors, start, len: t.seconds, ownBg: t.id !== "s-chu" && t.id !== "s-phude" };
}
export function slotAt(sl: Slot[], t: number): Slot | undefined {
  return sl.find((s) => t >= s.start && t < s.start + s.len);
}

/** Tạo clip từ một tệp trong kho (đọc độ dài bằng ffprobe; ảnh mặc định 3 giây) */
export async function makeClip(src: Src): Promise<VClip> {
  if (isImage(src.name)) return { id: uid(), src, name: src.name, in: 0, out: 3, dur: IMAGE_MAX, image: true, vol: 100 };
  const info = await S.probeFile(src.kind, src.name);
  const dur = Math.max(0.2, info.duration);
  return { id: uid(), src, name: src.name, in: 0, out: dur, dur, image: false, vol: 100 };
}

/** Cắt clip tại thời điểm t của timeline; null nếu t quá sát mép */
export function splitAt(p: Project, t: number): { p: Project; keep: string } | null {
  const s = layout(p).find((x) => t > x.start + MIN_LEN && t < x.start + x.len - MIN_LEN);
  if (!s) return null;
  const rel = t - s.start;
  const a: VClip = { ...s.c, out: s.c.in + rel };
  const b: VClip = s.c.image ? { ...s.c, id: uid(), in: 0, out: s.c.out - s.c.in - rel } : { ...s.c, id: uid(), in: s.c.in + rel };
  const i = p.video.indexOf(s.c);
  return { p: { ...p, video: [...p.video.slice(0, i), a, b, ...p.video.slice(i + 1)] }, keep: b.id };
}

/** Dự án cũ chưa có lớp mẫu/chữ vẫn mở được */
export const normalize = (p: Project): Project => ({
  ...p,
  overlays: Array.isArray(p.overlays) ? p.overlays : [],
  audio: Array.isArray(p.audio) ? p.audio : [],
  options: { ...DEFAULT_OPTIONS, ...p.options, filter: { ...DEFAULT_OPTIONS.filter, ...p.options?.filter }, brand: { ...DEFAULT_OPTIONS.brand, ...p.options?.brand } },
});

/* Bản nháp chỉ giữ trong tab đang mở (sessionStorage): tải lại trang không mất việc, còn mở tab mới hoặc bấm nút từ kho thì luôn là trang trắng */
const DRAFT = "kho-reel:studio-draft";
const LEGACY = [DRAFT, "kho-reel:studio-draft-prev"]; // các bản nháp lưu lâu dài ở phiên bản trước: xoá đi
const purgeLegacy = () => { try { LEGACY.forEach((k) => localStorage.removeItem(k)); } catch { /* bị chặn */ } };

export function loadDraft(): Project {
  purgeLegacy();
  try {
    const d = JSON.parse(sessionStorage.getItem(DRAFT) || "null");
    if (d && Array.isArray(d.video) && d.options) return normalize(d);
  } catch { /* bản nháp hỏng hoặc không có */ }
  return newProject();
}

/** Mở từ kho bằng nút "Trình chỉnh sửa" (#studio?new=1) thì bắt đầu một dự án trống và xoá hẳn phiên cũ */
export const wantsNewProject = () => /[?&]new=1/.test(location.hash);
/** Xoá phiên cũ, và bỏ ?new=1 khỏi địa chỉ để tải lại trang không mất việc đang làm */
export function startFresh() {
  purgeLegacy();
  try { sessionStorage.removeItem(DRAFT); } catch { /* bị chặn */ }
  history.replaceState(null, "", "#studio");
}

export function saveDraft(p: Project) {
  try { sessionStorage.setItem(DRAFT, JSON.stringify(p)); } catch { /* bị chặn */ }
}
