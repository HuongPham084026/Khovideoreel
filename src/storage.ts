/**
 * Lưu toàn bộ dữ liệu vào MỘT THƯ MỤC trên máy người dùng (File System Access API, Chrome/Edge).
 * Cấu trúc thư mục:
 *   library.json        danh sách video, bản đã sửa, yêu thích
 *   videos/             video & ảnh mẫu bạn tải lên
 *   xuat-video/         file MP4 xuất từ app
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

const EMPTY: Library = { version: 1, items: [], favTemplates: [] };

declare global {
  interface Window { showDirectoryPicker?: (o?: { mode?: "read" | "readwrite"; id?: string }) => Promise<FileSystemDirectoryHandle>; }
  interface FileSystemHandle {
    queryPermission?(o: { mode: "readwrite" }): Promise<PermissionState>;
    requestPermission?(o: { mode: "readwrite" }): Promise<PermissionState>;
  }
}

export const supported = () => typeof window !== "undefined" && !!window.showDirectoryPicker;

/* ---- nhớ thư mục đã chọn (IndexedDB giữ được handle) ---- */
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open("kho-reel-mau", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("kv");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function kv<T>(mode: "get" | "put", key: string, val?: T): Promise<T | undefined> {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction("kv", mode === "get" ? "readonly" : "readwrite");
    const st = tx.objectStore("kv");
    const r = mode === "get" ? st.get(key) : st.put(val, key);
    r.onsuccess = () => res(mode === "get" ? (r.result as T) : undefined);
    r.onerror = () => rej(r.error);
  });
}

export async function savedFolder(): Promise<FileSystemDirectoryHandle | undefined> {
  try { return await kv<FileSystemDirectoryHandle>("get", "dir"); } catch { return undefined; }
}
export async function permission(dir: FileSystemDirectoryHandle): Promise<PermissionState> {
  return (await dir.queryPermission?.({ mode: "readwrite" })) ?? "granted";
}
/** Phải gọi trong lúc người dùng bấm nút */
export async function reopen(dir: FileSystemDirectoryHandle) {
  return (await dir.requestPermission?.({ mode: "readwrite" })) === "granted";
}
export async function pickFolder() {
  const dir = await window.showDirectoryPicker!({ mode: "readwrite", id: "kho-reel-mau" });
  await kv("put", "dir", dir);
  return dir;
}

/* ---- đọc / ghi ---- */
async function sub(dir: FileSystemDirectoryHandle, name: string) {
  return dir.getDirectoryHandle(name, { create: true });
}
async function writeFile(dir: FileSystemDirectoryHandle, name: string, data: Blob | string) {
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(data);
  await w.close();
}

export async function loadLibrary(dir: FileSystemDirectoryHandle): Promise<Library> {
  try {
    const fh = await dir.getFileHandle("library.json");
    const lib = JSON.parse(await (await fh.getFile()).text());
    return { ...EMPTY, ...lib };
  } catch {
    await saveLibrary(dir, EMPTY);
    return { ...EMPTY };
  }
}
export async function saveLibrary(dir: FileSystemDirectoryHandle, lib: Library) {
  await writeFile(dir, "library.json", JSON.stringify(lib, null, 2));
}

export async function saveUpload(dir: FileSystemDirectoryHandle, id: string, file: File) {
  const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "");
  const name = `${id}.${ext}`;
  await writeFile(await sub(dir, "videos"), name, file);
  return name;
}
export async function uploadUrl(dir: FileSystemDirectoryHandle, name: string) {
  const fh = await (await sub(dir, "videos")).getFileHandle(name);
  return URL.createObjectURL(await fh.getFile());
}
export async function deleteUpload(dir: FileSystemDirectoryHandle, name: string) {
  try { await (await sub(dir, "videos")).removeEntry(name); } catch { /* đã xoá */ }
}
export async function saveExport(dir: FileSystemDirectoryHandle, fileName: string, blob: Blob) {
  await writeFile(await sub(dir, "xuat-video"), fileName, blob);
}

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const safeName = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60) || "video";
