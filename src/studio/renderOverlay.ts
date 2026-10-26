import { canRenderMediaOnWeb, renderMediaOnWeb } from "@remotion/web-renderer";
import { FPS, H, W } from "../templates";
import { fontsReady } from "../templates/fonts";
import { TemplateRunner } from "../templates/runner";
import type { Overlay } from "./model";

/** Kiểm tra trình duyệt có dựng được WebM nền trong suốt không; trả về lý do nếu không */
export async function checkOverlayRender(): Promise<string | null> {
  try {
    const r = await canRenderMediaOnWeb({ width: W, height: H, container: "webm", videoCodec: "vp9", transparent: true, muted: true });
    return r.canRender ? null : r.issues.map((i) => i.message).join(" · ");
  } catch (e) { return (e as Error).message; }
}

/** Dựng một lớp mẫu/chữ thành WebM nền trong suốt ngay trong trình duyệt, rồi gửi lên máy chủ. Trả về tên tệp đã lưu. */
export async function renderOverlay(o: Overlay, onProgress: (p: number) => void, signal: AbortSignal): Promise<string> {
  await fontsReady();
  const props = { tid: o.tid, f: o.fields, env: { transparent: !o.ownBg, colors: o.colors } };
  const { getBlob } = await renderMediaOnWeb({
    composition: { id: o.tid, component: TemplateRunner as never, width: W, height: H, fps: FPS, durationInFrames: Math.max(2, Math.round(o.len * FPS)), defaultProps: props },
    inputProps: props,
    container: "webm",
    videoCodec: "vp9",
    transparent: true,
    muted: true,
    signal,
    onProgress: (p: { progress: number }) => onProgress(p.progress),
    // Giấy phép miễn phí của Remotion: dành cho cá nhân và công ty tối đa 3 người
    licenseKey: "free-license",
    isProduction: true,
  } as never);
  const blob = await getBlob();
  const name = `${o.id}.webm`;
  const r = await fetch(`/api/upload/overlay?name=${encodeURIComponent(name)}`, { method: "POST", body: blob });
  if (!r.ok) throw new Error("Không gửi được lớp mẫu lên máy chủ");
  return name;
}

