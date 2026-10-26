import { memo } from "react";
import { MIN_LEN, aLen, clamp, type AClip, type Project } from "./model";

export type CaptionSource = { kind: string; name: string; in: number; out: number; start: number; label: string };
type Props = {
  a: AClip; mark: () => void;
  edit: (fn: (p: Project) => Project, live?: boolean) => void;
  onDuplicate: () => void; onRemove: () => void; onCaptions: (s: CaptionSource) => void;
};

function Range({ label, value, min, max, step, unit, onFocus, onChange }: { label: string; value: number; min: number; max: number; step: number; unit: string; onFocus: () => void; onChange: (v: number) => void }) {
  return (
    <label className="f"><span>{label}: {value}{unit}</span>
      <input type="range" min={min} max={max} step={step} value={value} onPointerDown={onFocus} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}

function AudioEditor({ a, mark, edit, onDuplicate, onRemove, onCaptions }: Props) {
  const patch = (p: Partial<AClip>) => edit((pr) => ({ ...pr, audio: pr.audio.map((x) => (x.id === a.id ? { ...x, ...p } : x)) }), true);
  const len = aLen(a);
  const num = (v: string, f: (n: number) => void) => { const n = parseFloat(v); if (!Number.isNaN(n)) f(n); };
  return (
    <>
      <h3>{a.kind === "music" ? "Nhạc nền đang chọn" : "Giọng đọc đang chọn"}</h3>
      <p className="cname" title={a.name}>{a.name}</p>
      <div className="two">
        <label className="f sub"><span>Bắt đầu lúc (giây)</span>
          <input type="number" min={0} step={0.1} value={Number(a.start.toFixed(2))} onFocus={mark} onChange={(e) => num(e.target.value, (n) => patch({ start: Math.max(0, n) }))} /></label>
        <label className="f sub"><span>Dài (giây)</span>
          <input type="number" min={MIN_LEN} max={a.dur - a.in} step={0.5} value={Number(len.toFixed(2))} onFocus={mark}
            onChange={(e) => num(e.target.value, (n) => patch({ out: a.in + clamp(n, MIN_LEN, a.dur - a.in) }))} /></label>
      </div>
      <p className="hint">Tệp gốc dài {a.dur.toFixed(1)}s · đang dùng từ giây {a.in.toFixed(1)} đến {a.out.toFixed(1)}. Kéo hai mép trên timeline để cắt bớt.</p>
      <Range label="Âm lượng" value={a.vol} min={0} max={200} step={5} unit="%" onFocus={mark} onChange={(v) => patch({ vol: v })} />
      <Range label="Mờ dần khi vào" value={a.fadeIn} min={0} max={Math.min(10, Math.max(0.5, len / 2))} step={0.1} unit="s" onFocus={mark} onChange={(v) => patch({ fadeIn: Number(v.toFixed(1)) })} />
      <Range label="Mờ dần khi ra" value={a.fadeOut} min={0} max={Math.min(10, Math.max(0.5, len / 2))} step={0.1} unit="s" onFocus={mark} onChange={(v) => patch({ fadeOut: Number(v.toFixed(1)) })} />
      {a.kind === "voice" && (
        <button className="btn sm primary" type="button" onClick={() => onCaptions({ kind: a.src.kind, name: a.src.name, in: a.in, out: a.out, start: a.start, label: a.name })}>
          Tạo phụ đề tự động từ giọng này
        </button>
      )}
      <div className="acts left">
        <button className="btn sm" type="button" onClick={onDuplicate}>Nhân đôi</button>
        <button className="btn sm danger" type="button" onClick={onRemove}>Xoá</button>
      </div>
    </>
  );
}

export default memo(AudioEditor);
