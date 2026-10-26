import { memo, useState } from "react";
import { parseCues, type Cue, type CueWord } from "../templates/caption";
import { groupWords } from "./captions";
import { DURATIONS, OVERLAY_MAX, OVERLAY_MIN, clamp, type Overlay, type Project } from "./model";
import type { FieldDef, Template } from "../templates";

type Props = {
  o: Overlay; t: Template; mark: () => void;
  edit: (fn: (p: Project) => Project, live?: boolean) => void;
  onDuplicate: () => void; onRemove: () => void;
};

function FieldInput({ d, value, onFocus, onChange }: { d: FieldDef; value: string; onFocus: () => void; onChange: (v: string, live: boolean) => void }) {
  const id = "ov_" + d.key;
  if (d.type === "color")
    return (
      <div className="colors">
        <input id={id} type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"} onFocus={onFocus} onChange={(e) => onChange(e.target.value, true)} />
        {d.def === "" && <button type="button" className="mini" onClick={() => onChange("", false)} disabled={!value}>Bỏ nền</button>}
        <small>{value || "Không có"}</small>
      </div>
    );
  if (d.type === "select")
    return <select id={id} value={value} onChange={(e) => onChange(e.target.value, false)}>{d.options!.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;
  if (d.type === "number")
    return <input id={id} type="number" min={d.min} max={d.max} step={d.step} value={value} onFocus={onFocus} onChange={(e) => onChange(e.target.value, true)} />;
  return d.long
    ? <textarea id={id} rows={3} value={value} onFocus={onFocus} onChange={(e) => onChange(e.target.value, true)} />
    : <input id={id} value={value} onFocus={onFocus} onChange={(e) => onChange(e.target.value, true)} />;
}

const fmtT = (x: number) => `${Math.floor(x / 60)}:${(x % 60).toFixed(1).padStart(4, "0")}`;

/** Danh sách cụm phụ đề: sửa chữ, xoá cụm, chia lại theo số từ */
function CaptionCues({ o, patch }: { o: Overlay; patch: (p: Partial<Overlay>, live?: boolean) => void }) {
  const cues = parseCues(o.fields.cues);
  let words: CueWord[] = [];
  try { words = JSON.parse(o.fields.words || "[]"); } catch { /* không có */ }
  const [maxW, setMaxW] = useState(4);
  const setCues = (next: Cue[], live: boolean) => patch({ fields: { ...o.fields, cues: JSON.stringify(next) } }, live);
  return (
    <>
      <h3>Phụ đề ({cues.length} cụm)</h3>
      {words.length > 0 && (
        <div className="f"><span>Số từ tối đa mỗi cụm</span>
          <div className="seg">
            {[2, 3, 4, 5].map((n) => <button key={n} type="button" aria-pressed={maxW === n} onClick={() => { setMaxW(n); setCues(groupWords(words, n), false); }}>{n} từ</button>)}
          </div>
          <small>Chọn lại số từ sẽ chia lại toàn bộ cụm (các chỗ bạn đã sửa chữ sẽ mất).</small>
        </div>
      )}
      <div className="cues">
        {cues.map((c, i) => (
          <div className="cue" key={i}>
            <small>{fmtT(c.s)}</small>
            <input value={c.t} aria-label={`Cụm ${i + 1}`}
              onChange={(e) => setCues(cues.map((x, j) => (j === i ? { ...x, t: e.target.value, w: x.w && x.w.length === e.target.value.split(/\s+/).filter(Boolean).length ? x.w : undefined } : x)), true)} />
            <button type="button" className="mini x" aria-label="Xoá cụm" onClick={() => setCues(cues.filter((_, j) => j !== i), false)}>×</button>
          </div>
        ))}
        {!cues.length && <p className="hint">Chưa có phụ đề.</p>}
      </div>
    </>
  );
}

function OverlayEditor({ o, t, mark, edit, onDuplicate, onRemove }: Props) {
  const patch = (p: Partial<Overlay>, live = false) => edit((pr) => ({ ...pr, overlays: pr.overlays.map((x) => (x.id === o.id ? { ...x, ...p } : x)) }), live);
  const setField = (key: string, v: string, live: boolean) => patch({ fields: { ...o.fields, [key]: v } }, live);
  const setColor = (orig: string, v: string) => patch({ colors: { ...o.colors, [orig]: v.toUpperCase() } }, true);
  const free = t.id === "s-chu" || t.id === "s-phude";
  const caption = t.id === "s-phude";

  return (
    <>
      <h3>Mẫu đang chọn</h3>
      <p className="cname" title={t.title}>{t.title}</p>
      {!caption && <p className="hint">{t.cat}</p>}

      <div className="f"><span>Thời gian</span>
        <div className="two">
          <label className="f sub"><span>Bắt đầu (giây)</span>
            <input type="number" min={0} step={0.1} value={Number(o.start.toFixed(2))} onFocus={mark}
              onChange={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) patch({ start: clamp(v, 0, OVERLAY_MAX) }, true); }} /></label>
          <label className="f sub"><span>Dài (giây)</span>
            <input type="number" min={OVERLAY_MIN} max={OVERLAY_MAX} step={0.5} value={Number(o.len.toFixed(2))} onFocus={mark}
              onChange={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) patch({ len: clamp(v, OVERLAY_MIN, OVERLAY_MAX) }, true); }} /></label>
        </div>
        <div className="seg">
          {DURATIONS.map((d) => <button key={d} type="button" aria-pressed={Math.abs(o.len - d) < 0.05} onClick={() => patch({ len: d })}>{d}s</button>)}
          <button type="button" aria-pressed={Math.abs(o.len - t.seconds) < 0.05} onClick={() => patch({ len: t.seconds })}>Gốc {t.seconds}s</button>
        </div>
        <small>Chuyển động của mẫu giữ nguyên, phần thời gian còn lại giữ hình cuối.</small>
      </div>

      {!free && (
        <label className="chk">
          <input type="checkbox" checked={o.ownBg} onChange={(e) => patch({ ownBg: e.target.checked })} />
          <span>Dùng nền của mẫu <small>(bỏ chọn để chữ và hình nằm trên video / nền của bạn)</small></span>
        </label>
      )}

      {caption && <CaptionCues o={o} patch={patch} />}
      <h3>{caption ? "Kiểu chữ phụ đề" : "Nội dung"}</h3>
      {t.fields.map((d) => (
        <div className="f" key={d.key}>
          <label htmlFor={"ov_" + d.key}><span>{d.label}</span></label>
          <FieldInput d={d} value={o.fields[d.key] ?? d.def} onFocus={mark} onChange={(v, live) => setField(d.key, v, live)} />
        </div>
      ))}

      {t.palette.length > 0 && (
        <>
          <h3>Màu của mẫu</h3>
          <p className="hint">Mỗi ô là một màu gốc của mẫu. Đổi màu ở đây sẽ đổi mọi chỗ dùng màu đó.</p>
          <div className="pal">
            {t.palette.map((orig) => (
              <label key={orig} className="pc" title={`Màu gốc ${orig}`}>
                <input type="color" value={o.colors[orig] ?? orig} onFocus={mark} onChange={(e) => setColor(orig, e.target.value)} />
                {o.colors[orig] && o.colors[orig] !== orig && <i style={{ background: orig }} aria-label="màu gốc" />}
              </label>
            ))}
          </div>
          <button type="button" className="mini" disabled={!Object.keys(o.colors).length} onClick={() => patch({ colors: {} })}>Đặt lại màu gốc</button>
        </>
      )}

      <div className="acts left">
        <button className="btn sm" type="button" onClick={onDuplicate}>Nhân đôi</button>
        <button className="btn sm danger" type="button" onClick={onRemove}>Xoá lớp này</button>
      </div>
    </>
  );
}

export default memo(OverlayEditor);
