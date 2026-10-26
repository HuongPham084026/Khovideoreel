import { canRenderMediaOnWeb, renderMediaOnWeb } from "@remotion/web-renderer";
import { FPS, H, W, type Fields, type Template } from "./templates";
import { fontsReady } from "./templates/fonts";

export async function checkExport() {
  try {
    const r = await canRenderMediaOnWeb({ width: W, height: H, container: "mp4", videoCodec: "h264", muted: true });
    return r.canRender ? null : r.issues.map((i) => i.message).join(" · ");
  } catch (e) {
    return (e as Error).message;
  }
}

/** Dựng video MP4 1080×1920 ngay trong trình duyệt */
export async function exportMp4(t: Template, f: Fields, onProgress: (p: number) => void, signal: AbortSignal) {
  await fontsReady();
  const { getBlob } = await renderMediaOnWeb({
    composition: {
      id: t.id,
      component: t.Comp as never,
      width: W,
      height: H,
      fps: FPS,
      durationInFrames: t.seconds * FPS,
      defaultProps: { f },
    },
    inputProps: { f },
    container: "mp4",
    videoCodec: "h264",
    muted: true,
    videoBitrate: "high",
    signal,
    onProgress: (p) => onProgress(p.progress),
    // Giấy phép miễn phí của Remotion: dành cho cá nhân và công ty tối đa 3 người
    licenseKey: "free-license",
    isProduction: true,
  });
  return getBlob();
}
