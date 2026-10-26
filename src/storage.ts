/**
 * Lưu dữ liệu qua máy chủ chạy trên máy người dùng (python -m server.app → http://127.0.0.1:8765).
 * Máy chủ ghi thẳng vào thư mục dữ liệu (xem config.json). Các thư mục con:
 *   library.json   danh sách video, bản đã sửa, yêu thích
 *   Kho video/     video & ảnh mẫu bạn tải lên
 *   Xuất video/    file MP4 xuất từ app
 */
import type { Fields } from "./templates";

export type Upload = {
  id: string; kind: "upload"; title: string; cat: string; note: string; link: string;
  file: string | null; type: "video" | "image" | "link"; size: number | null; fav: boolean; createdAt: number;
};
export type Edit = {
  id: string; kind: "edit"; templateId: string; title: string; fields: Fields; fav: boolean; createdAt: number; updatedAt?: number;
};
export type Library = { version: 1; items: (Upload | Edit)[]; favTemplates: string[] };
export type Status = { ok: boolean; dataDir: string; ffmpeg: boolean; whisper: boolean; edgeTts: boolean; built: boolean };

const EMPTY: Library = { version: 1, items: [], favTemplates: [] };

async function check(r: Response) {
  if (!r.ok) {
    let msg = `Lỗi máy chủ (${r.status})`;
    try { msg = (await r.json()).error || msg; } catch { /* không có nội dung */ }
    throw new Error(msg);
  }
  return r;
}

/** null = chưa chạy máy chủ (mở app bằng Chay_app.bat) */
export async function status(): Promise<Status | null> {
  try {
    const r = await fetch("/api/status");
    return r.ok ? ((await r.json()) as Status) : null;
  } catch { return null; }
}

export async function loadLibrary(): Promise<Library> {
  const lib = await (await check(await fetch("/api/library"))).json();
  return { ...EMPTY, ...lib };
}
export async function saveLibrary(lib: Library) {
  await check(await fetch("/api/library", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lib) }));
}

async function put(kind: string, name: string, body: Blob) {
  await check(await fetch(`/api/upload/${kind}?name=${encodeURIComponent(name)}`, { method: "POST", body }));
}
export async function saveUpload(id: string, file: File) {
  const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "");
  const name = `${id}.${ext}`;
  await put("video", name, file);
  return name;
}
export const uploadUrl = (name: string) => `/api/files/video/${encodeURIComponent(name)}`;
export async function deleteUpload(name: string) {
  try { await fetch(`/api/files/video/${encodeURIComponent(name)}`, { method: "DELETE" }); } catch { /* đã xoá */ }
}
export async function saveExport(fileName: string, blob: Blob) {
  await put("export", fileName, blob);
}
export async function openFolder(kind?: string) {
  await fetch("/api/open-folder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }) });
}

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const safeName = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60) || "video";

/* ---- tệp theo thư mục (Kho video, Nền, Nhạc, Giọng đọc, Video mẫu, Dự án, Xuất video) ---- */
export type Kind = "video" | "music" | "voice" | "bg" | "brand" | "export" | "project" | "overlay";
export type FileInfo = { name: string; size: number; mtime: number };

export const fileUrl = (kind: Kind, name: string) => `/api/files/${kind}/${encodeURIComponent(name)}`;
export async function listFiles(kind: Kind): Promise<FileInfo[]> {
  return (await check(await fetch(`/api/list/${kind}`))).json();
}
/** Tải nhiều tệp lên; trả về tên đã lưu (tự đổi tên nếu trùng) */
export async function uploadFiles(kind: Kind, files: File[]): Promise<string[]> {
  const saved: string[] = [];
  for (const f of files) {
    const r = await check(await fetch(`/api/upload/${kind}?keep=1&name=${encodeURIComponent(f.name)}`, { method: "POST", body: f }));
    saved.push((await r.json()).name);
  }
  return saved;
}
export type Probe = { duration: number; has_audio: boolean; width?: number; height?: number; fps?: number };
export async function probeFile(kind: Kind, name: string): Promise<Probe> {
  return (await check(await fetch(`/api/probe/${kind}/${encodeURIComponent(name)}`))).json();
}
export async function deleteFile(kind: Kind, name: string) {
  await check(await fetch(`/api/files/${kind}/${encodeURIComponent(name)}`, { method: "DELETE" }));
}
export async function putJson(kind: Kind, name: string, data: unknown) {
  await check(await fetch(`/api/upload/${kind}?name=${encodeURIComponent(name)}`, { method: "POST", body: new Blob([JSON.stringify(data)]) }));
}
export async function getJson<T>(kind: Kind, name: string): Promise<T> {
  return (await check(await fetch(fileUrl(kind, name)))).json();
}

/* ---- dựng video trên máy chủ ---- */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Job = { id: string; status: "running" | "done" | "error" | "cancelled"; progress: number; stage: string; error: string | null; result: Record<string, any> | null; logs?: string[] };
export async function startExport(project: unknown): Promise<Job> {
  return (await check(await fetch("/api/studio/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(project) }))).json();
}
export async function getJob(id: string): Promise<Job> {
  return (await check(await fetch(`/api/jobs/${id}`))).json();
}
export async function cancelJob(id: string) {
  await fetch(`/api/jobs/${id}/cancel`, { method: "POST" });
}

/* ---- gửi một mẫu từ kho sang trình chỉnh sửa ---- */
export const STUDIO_ADD_KEY = "kho-reel:studio-add";
export function sendToStudio(tid: string, fields: Fields, colors: Record<string, string> = {}) {
  try { localStorage.setItem(STUDIO_ADD_KEY, JSON.stringify({ tid, fields, colors })); } catch { /* bị chặn */ }
  location.hash = "#studio?new=1";
}

/** Chờ một tác vụ nền của máy chủ chạy xong; onUpdate nhận tiến độ. Ném lỗi nếu tác vụ lỗi hoặc bị hủy. */
export async function waitJob(first: Job, onUpdate: (j: Job) => void, signal?: AbortSignal): Promise<Job> {
  let j = first;
  while (j.status === "running") {
    onUpdate(j);
    if (signal?.aborted) { await cancelJob(j.id); throw new Error("Đã hủy"); }
    await new Promise((r) => setTimeout(r, 600));
    j = await getJob(j.id);
  }
  onUpdate(j);
  if (j.status === "error") throw new Error(j.error || "Tác vụ bị lỗi");
  if (j.status === "cancelled") throw new Error("Đã hủy");
  return j;
}

/* ---- giọng đọc (Microsoft Edge + Google Gemini) ---- */
export type Voice = { id: string; name: string; engine: "edge" | "gemini" };
export type VoiceInfo = { voices: Voice[]; key: { has: boolean; masked: string }; aiStudio: string };
export type TtsRequest = { text: string; voice: string; rate: number; pitch: number; volume: number; style: string };
export async function ttsVoices(): Promise<VoiceInfo> { return (await check(await fetch("/api/tts/voices"))).json(); }
export async function saveTtsKey(key: string) {
  return (await check(await fetch("/api/tts/key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key }) }))).json() as Promise<{ has: boolean; masked: string }>;
}
export async function openAiStudio() { await fetch("/api/tts/open-aistudio", { method: "POST" }); }
export async function startTts(req: TtsRequest): Promise<Job> {
  return (await check(await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) }))).json();
}

/* ---- phiên âm tiếng nói thành chữ (phụ đề tự động) ---- */
export type Word = { w: string; s: number; e: number };
export async function startTranscribe(req: { kind: Kind; name: string; in: number; out: number }): Promise<Job> {
  return (await check(await fetch("/api/transcribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) }))).json();
}
