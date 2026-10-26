import { memo, useEffect, useRef, useState } from "react";
import * as S from "../storage";
import { TEMPLATES } from "../templates";
import AudioEditor, { type CaptionSource } from "./AudioEditor";
import { FILTERS } from "./filters";
import OverlayEditor from "./OverlayEditor";
import {
  ASPECTS, DURATIONS, FITS, IMAGE_MAX, MIN_LEN, clamp, isImage, type AClip, type Aspect, type Corner, type Fit, type Overlay, type Project, type Src, type VClip,
} from "./model";

type Props = {
  P: Project; clip: VClip | undefined; clipStart: number; overlay: Overlay | undefined; audio: AClip | undefined; mark: () => void;
  edit: (fn: (p: Project) => Project, live?: boolean) => void;
  onDuplicate: () => void; onRemove: () => void; onCaptions: (s: CaptionSource) => void; say: (m: string) => void;
};

function Num({ label, value, min, max, step = 0.1, onChange, onFocus }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; onFocus: () => void }) {
  return (
    <label className="f">
      <span>{label}</span>
      <input type="number" onFocus={onFocus} min={min} max={max} step={step} value={Number(value.toFixed(2))}
        onChange={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v)) onChange(clamp(v, min, max)); }} />
    </label>
  );
}

const CORNERS: [Corner, string][] = [["tl", "Trên trái"], ["tr", "Trên phải"], ["bl", "Dưới trái"], ["br", "Dưới phải"]];

/** Chọn một ảnh trong thư mục Thương hiệu (hoặc tải ảnh mới lên) */
function BrandPicker({ label, value, onPick, say }: { label: string; value: Src | undefined; onPick: (s: Src | undefined) => void; say: (m: string) => void }) {
  const [files, setFiles] = useState<S.FileInfo[]>([]);
  const input = useRef<HTMLInputElement>(null);
  const load = () => S.listFiles("brand").then(setFiles).catch(() => setFiles([]));
  useEffect(() => { load(); }, []);
  async function upload(list: FileList | null) {
    if (!list?.length) return;
    try {
      const [name] = await S.uploadFiles("brand", [list[0]]);
      await load();
      onPick({ kind: "brand", name });
    } catch (e) { say("Không tải lên được: " + (e as Error).message); }
    if (input.current) input.current.value = "";
  }
  return (
    <div className="f">
      <span>{label}</span>
      <div className="row">
        <select value={value?.name ?? ""} onChange={(e) => onPick(e.target.value ? { kind: "brand", name: e.target.value } : undefined)}>
          <option value="">Không dùng</option>
          {files.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
        </select>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files)} />
        <button className="mini" type="button" onClick={() => input.current?.click()}>Tải ảnh</button>
      </div>
    </div>
  );
}

function Inspector({ P, clip, clipStart, overlay, audio, mark, edit, onDuplicate, onRemove, onCaptions, say }: Props) {
  const tpl = overlay ? TEMPLATES.find((x) => x.id === overlay.tid) : undefined;
  const o = P.options;
  const setOpt = (patch: Partial<Project["options"]>, live = false) => edit((p) => ({ ...p, options: { ...p.options, ...patch } }), live);
  const setBg = (patch: Partial<Project["options"]["bg"]>, live = false) => edit((p) => ({ ...p, options: { ...p.options, bg: { ...p.options.bg, ...patch } } }), live);
  const setBrand = (patch: Partial<Project["options"]["brand"]>, live = false) => edit((p) => ({ ...p, options: { ...p.options, brand: { ...p.options.brand, ...patch } } }), live);
  const setClip = (patch: Partial<VClip>) => clip && edit((p) => ({ ...p, video: p.video.map((v) => (v.id === clip.id ? { ...v, ...patch } : v)) }), true);
  const anySel = !!(overlay || audio || clip);

  return (
    <aside className="panel insp" aria-label="Thuộc tính">
      {overlay && tpl && <OverlayEditor key={overlay.id} o={overlay} t={tpl} mark={mark} edit={edit} onDuplicate={onDuplicate} onRemove={onRemove} />}
      {audio && <AudioEditor key={audio.id} a={audio} mark={mark} edit={edit} onDuplicate={onDuplicate} onRemove={onRemove} onCaptions={onCaptions} />}
      {clip && (
        <>
          <h3>Clip đang chọn</h3>
          <p className="cname" title={clip.name}>{clip.name}</p>
          {!clip.image && (
            <div className="two">
              <Num label="Bắt đầu (giây)" value={clip.in} min={0} max={clip.out - MIN_LEN} onFocus={mark} onChange={(v) => setClip({ in: v })} />
              <Num label="Kết thúc (giây)" value={clip.out} min={clip.in + MIN_LEN} max={clip.dur} onFocus={mark} onChange={(v) => setClip({ out: v })} />
            </div>
          )}
          {clip.image && <Num label="Thời lượng (giây)" value={clip.out} min={0.2} max={IMAGE_MAX} onFocus={mark} onChange={(v) => setClip({ out: v })} />}
          <div className="seg" aria-label="Chọn nhanh thời lượng">
            {DURATIONS.map((d) => {
              const ok = clip.image || clip.in + d <= clip.dur + 0.05;
              return (
                <button key={d} type="button" disabled={!ok} aria-pressed={Math.abs(clip.out - clip.in - d) < 0.05}
                  title={ok ? `Đặt clip dài ${d} giây` : `Video gốc chỉ còn ${(clip.dur - clip.in).toFixed(1)}s kể từ điểm bắt đầu`}
                  onClick={() => edit((p) => ({ ...p, video: p.video.map((v) => (v.id === clip.id ? { ...v, out: v.image ? d : Math.min(v.dur, v.in + d) } : v)) }))}>{d}s</button>
              );
            })}
          </div>
          <p className="hint">Dài {(clip.out - clip.in).toFixed(1)}s{clip.image ? " · ảnh" : ` · gốc ${clip.dur.toFixed(1)}s`}</p>
          {!clip.image && (
            <>
              <label className="f"><span>Âm lượng tiếng gốc: {clip.vol}%</span>
                <input type="range" min={0} max={100} step={5} value={clip.vol} onPointerDown={mark} onChange={(e) => setClip({ vol: +e.target.value })} />
              </label>
              <button className="btn sm" type="button" onClick={() => onCaptions({ kind: clip.src.kind, name: clip.src.name, in: clip.in, out: clip.out, start: clipStart, label: clip.name })}>
                Tạo phụ đề từ tiếng nói trong clip
              </button>
            </>
          )}
        </>
      )}
      {!anySel && <p className="hint">Bấm một clip, lớp mẫu hoặc âm thanh trên timeline để chỉnh.</p>}

      <h3>Dự án</h3>
      <label className="f"><span>Tên</span><input value={P.name} maxLength={80} onChange={(e) => edit((p) => ({ ...p, name: e.target.value }), true)} /></label>
      <div className="f"><span>Khung hình</span>
        <div className="seg">
          {(Object.keys(ASPECTS) as Aspect[]).map((a) => (
            <button key={a} type="button" aria-pressed={o.aspect === a} onClick={() => setOpt({ aspect: a })}>{a}</button>
          ))}
        </div>
      </div>
      <label className="f"><span>Video trong khung</span>
        <select value={o.fit} onChange={(e) => setOpt({ fit: e.target.value as Fit })}>
          {FITS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <small>{FITS.find((f) => f.id === o.fit)?.hint}</small>
      </label>

      <div className={"f bgbox" + (o.fit === "contain" ? "" : " off")}>
        <span>Nền {o.fit !== "contain" && <em>(chỉ hiện khi chọn “Vừa khung + nền riêng”)</em>}</span>
        <div className="seg">
          {([["color", "Màu"], ["gradient", "Gradient"], ["image", "Ảnh"], ["video", "Video"]] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={o.bg.type === k} onClick={() => setBg({ type: k })}>{l}</button>
          ))}
        </div>
        {(o.bg.type === "color" || o.bg.type === "gradient") && (
          <div className="colors">
            <input type="color" value={o.bg.color} aria-label="Màu nền" onFocus={mark} onChange={(e) => setBg({ color: e.target.value }, true)} />
            {o.bg.type === "gradient" && <input type="color" value={o.bg.color2} aria-label="Màu nền thứ hai" onFocus={mark} onChange={(e) => setBg({ color2: e.target.value }, true)} />}
            <span className="sw">
              {["#263238", "#4D6787", "#F599C6", "#7DCCAD", "#FFEA88", "#FFFDF7"].map((c) => (
                <button key={c} type="button" style={{ background: c }} aria-label={"Màu " + c} onClick={() => setBg({ color: c })} />
              ))}
            </span>
          </div>
        )}
        {(o.bg.type === "image" || o.bg.type === "video") && (
          <small>
            {o.bg.src ? <>Đang dùng: <b>{o.bg.src.name}</b></> : "Vào tab “Nền” bên trái, bấm “Dùng làm nền”."}
            {o.bg.src && isImage(o.bg.src.name) !== (o.bg.type === "image") && " — loại tệp không khớp với lựa chọn."}
          </small>
        )}
      </div>

      <h3>Bộ lọc màu</h3>
      <div className="flt">
        <button type="button" className="fl" aria-pressed={!o.filter.id} onClick={() => setOpt({ filter: { ...o.filter, id: "" } })}><i className="none" />Không</button>
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className="fl" aria-pressed={o.filter.id === f.id} onClick={() => setOpt({ filter: { ...o.filter, id: f.id } })}>
            <i style={{ background: `linear-gradient(135deg, ${f.colors[0]}, ${f.colors[1]})` }} />{f.name}
          </button>
        ))}
      </div>
      {o.filter.id && (
        <label className="f"><span>Cường độ: {o.filter.strength}%</span>
          <input type="range" min={0} max={100} step={5} value={o.filter.strength} onPointerDown={mark} onChange={(e) => setOpt({ filter: { ...o.filter, strength: +e.target.value } }, true)} />
          <small>Xem trước chỉ gần đúng; video xuất ra dùng bộ lọc FFmpeg chuẩn. Bộ lọc áp lên video nền, không áp lên chữ/mẫu.</small>
        </label>
      )}

      <h3>Logo và ảnh đại diện</h3>
      <BrandPicker label="Logo" value={o.brand.logo} onPick={(s) => setBrand({ logo: s })} say={say} />
      {o.brand.logo && (
        <>
          <div className="seg">{CORNERS.map(([k, l]) => <button key={k} type="button" aria-pressed={o.brand.logoPos === k} onClick={() => setBrand({ logoPos: k })}>{l}</button>)}</div>
          <label className="f"><span>Cỡ logo: {o.brand.logoSize}% chiều ngang</span>
            <input type="range" min={5} max={50} step={1} value={o.brand.logoSize} onPointerDown={mark} onChange={(e) => setBrand({ logoSize: +e.target.value }, true)} /></label>
        </>
      )}
      <BrandPicker label="Ảnh đại diện (cắt tròn)" value={o.brand.avatar} onPick={(s) => setBrand({ avatar: s })} say={say} />
      {o.brand.avatar && (
        <>
          <div className="seg">{CORNERS.map(([k, l]) => <button key={k} type="button" aria-pressed={o.brand.avatarPos === k} onClick={() => setBrand({ avatarPos: k })}>{l}</button>)}</div>
          <label className="f"><span>Cỡ ảnh: {o.brand.avatarSize}% chiều ngang</span>
            <input type="range" min={5} max={40} step={1} value={o.brand.avatarSize} onPointerDown={mark} onChange={(e) => setBrand({ avatarSize: +e.target.value }, true)} /></label>
        </>
      )}
    </aside>
  );
}

export default memo(Inspector);
