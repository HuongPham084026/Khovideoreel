import { Thumbnail } from "@remotion/player";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as S from "../storage";
import { CATS, FPS, H, TEMPLATES, W, defaults, type Fields, type Template } from "../templates";
import { TemplateRunner } from "../templates/runner";
import { isImage, type AClip, type Src } from "./model";
import VoiceMaker from "./VoiceMaker";

type TabId = "tpl" | "bg" | "music" | "voice" | "project";
type Tab = { id: TabId; kind?: S.Kind; label: string; hint: string };
const TABS: Tab[] = [
  { id: "tpl", label: "Video mẫu", hint: "Kho mẫu của bạn. Bấm một mẫu để đặt lên timeline, rồi sửa chữ, màu, thời gian ở cột bên phải." },
  { id: "bg", kind: "bg", label: "Video & nền", hint: "Video và ảnh của bạn. Bấm tên để thêm vào cuối timeline, hoặc bấm “Dùng làm nền” để đặt làm nền phía sau." },
  { id: "music", kind: "music", label: "Nhạc", hint: "Nhạc nền của bạn. Bấm tên để đặt vào timeline tại đầu phát, bấm ▶ để nghe thử." },
  { id: "voice", kind: "voice", label: "Giọng đọc", hint: "Gõ văn bản để tạo giọng đọc, hoặc tải file ghi âm của bạn." },
  { id: "project", kind: "project", label: "Dự án", hint: "Các dự án đã lưu. Bấm để mở." },
];
const ACCEPT: Partial<Record<S.Kind, string>> = { video: "video/*,image/*", bg: "video/*,image/*", music: "audio/*", voice: "audio/*" };
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

type Props = {
  onAdd: (src: Src) => void; onUseBg: (src: Src) => void; onOpenProject: (name: string) => void;
  onAddTemplate: (t: Template, fields?: Fields) => void; onAddAudio: (src: Src, kind: AClip["kind"]) => void;
  say: (m: string) => void; reloadKey: number;
};

function Thumb({ kind, name }: { kind: S.Kind; name: string }) {
  const url = S.fileUrl(kind, name);
  if (kind === "project") return <div className="th doc">{"{ }"}</div>;
  if (kind === "music" || kind === "voice") return <div className="th doc">{kind === "music" ? "♪" : "🎙"}</div>;
  return isImage(name)
    ? <img className="th" src={url} alt="" loading="lazy" />
    : <video className="th" src={url + "#t=0.1"} preload="metadata" muted playsInline />;
}

/** Nút nghe thử một tệp âm thanh; chỉ một tệp phát tại một thời điểm */
let currentPreview: HTMLAudioElement | null = null;
function PreviewButton({ kind, name }: { kind: S.Kind; name: string }) {
  const [on, setOn] = useState(false);
  const el = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => { el.current?.pause(); }, []);
  function toggle() {
    if (on) { el.current?.pause(); setOn(false); return; }
    if (currentPreview && currentPreview !== el.current) currentPreview.pause();
    if (!el.current) { el.current = new Audio(S.fileUrl(kind, name)); el.current.onended = () => setOn(false); el.current.onpause = () => setOn(false); }
    currentPreview = el.current;
    el.current.currentTime = 0;
    el.current.play().then(() => setOn(true)).catch(() => setOn(false));
  }
  return <button type="button" className="mini" aria-label={on ? "Dừng nghe thử" : "Nghe thử"} onClick={toggle}>{on ? "❚❚" : "▶"}</button>;
}

function TplThumb({ t, f }: { t: Template; f: Fields }) {
  return (
    <div className="tpl-th">
      <Thumbnail component={TemplateRunner} inputProps={{ tid: t.id, f, env: { transparent: false, colors: {} } }} compositionWidth={W} compositionHeight={H}
        durationInFrames={t.seconds * FPS} fps={FPS} frameToDisplay={Math.round(FPS * 1.6)} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

function Templates({ onAddTemplate, say, reloadKey }: Pick<Props, "onAddTemplate" | "say" | "reloadKey">) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [mine, setMine] = useState<S.Edit[]>([]);
  useEffect(() => {
    S.loadLibrary().then((l) => setMine(l.items.filter((x): x is S.Edit => x.kind === "edit"))).catch((e) => say((e as Error).message));
  }, [say, reloadKey]);

  const nq = norm(q.trim());
  const list = useMemo(() => TEMPLATES.filter((t) => !t.hidden && (!cat || t.cat === cat) && (!nq || norm([t.title, t.cat, ...t.kw].join(" ")).includes(nq))), [cat, nq]);
  const mineList = mine.filter((e) => !nq || norm(e.title).includes(nq));
  const cats = CATS.filter((c) => TEMPLATES.some((t) => !t.hidden && t.cat === c));

  return (
    <>
      <input className="msearch" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm mẫu: tin nóng, review…" aria-label="Tìm mẫu" />
      <select className="msearch" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Chủ đề">
        <option value="">Mọi chủ đề</option>
        {cats.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <div className="mlist">
        {mineList.length > 0 && <div className="mgroup">Bản của tôi</div>}
        {mineList.map((e) => {
          const t = TEMPLATES.find((x) => x.id === e.templateId);
          if (!t) return null;
          return (
            <div className="mitem" key={e.id}>
              <button type="button" className="mmain" title="Đặt lên timeline" onClick={() => onAddTemplate(t, e.fields)}>
                <TplThumb t={t} f={{ ...defaults(t), ...e.fields }} />
                <span className="mn">{e.title}<small>{t.title} · {t.seconds}s</small></span>
              </button>
            </div>
          );
        })}
        <div className="mgroup">Mẫu có sẵn ({list.length})</div>
        {list.map((t) => (
          <div className="mitem" key={t.id}>
            <button type="button" className="mmain" title="Đặt lên timeline" onClick={() => onAddTemplate(t)}>
              <TplThumb t={t} f={defaults(t)} />
              <span className="mn">{t.title}<small>{t.cat} · {t.seconds}s</small></span>
            </button>
          </div>
        ))}
        {!list.length && <p className="hint">Không có mẫu phù hợp.</p>}
      </div>
    </>
  );
}

function MediaPanel({ onAdd, onUseBg, onOpenProject, onAddTemplate, onAddAudio, say, reloadKey }: Props) {
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const [files, setFiles] = useState<S.FileInfo[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [bump, setBump] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const kind = tab.kind;
  const isAudio = kind === "music" || kind === "voice";

  const load = useCallback(async (k: S.Kind) => {
    setFiles(null);
    try { setFiles(await S.listFiles(k)); } catch (e) { setFiles([]); say((e as Error).message); }
  }, [say]);
  useEffect(() => { if (kind) load(kind); }, [kind, load, reloadKey, bump]);

  async function upload(list: FileList | null) {
    if (!list?.length || !kind) return;
    setBusy(true);
    try { await S.uploadFiles(kind, [...list]); await load(kind); say(`Đã thêm ${list.length} tệp vào ${tab.label}`); }
    catch (e) { say("Không tải lên được: " + (e as Error).message); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  async function remove(f: S.FileInfo) {
    if (!kind || !confirm(`Xoá "${f.name}" khỏi ${tab.label}?`)) return;
    try { await S.deleteFile(kind, f.name); await load(kind); } catch (e) { say((e as Error).message); }
  }

  const canUpload = kind === "video" || kind === "bg" || isAudio;
  return (
    <section className="panel media" aria-label="Thư viện">
      <div className="ptabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab.id === t.id} className="ptab" type="button" onClick={() => setTab(t)}>{t.label}</button>
        ))}
      </div>
      <p className="hint">{tab.hint}</p>
      {tab.id === "tpl" && <Templates onAddTemplate={onAddTemplate} say={say} reloadKey={reloadKey} />}
      {tab.id === "voice" && <VoiceMaker say={say} onCreated={(name) => { setBump((b) => b + 1); onAddAudio({ kind: "voice", name }, "voice"); }} />}
      {canUpload && (
        <>
          <input ref={input} type="file" multiple hidden accept={kind ? ACCEPT[kind] : undefined} onChange={(e) => upload(e.target.files)} />
          <button className="btn sm" type="button" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Đang tải…" : "+ Tải lên từ máy"}</button>
        </>
      )}
      {kind && (
        <div className="mlist">
          {files === null && <p className="hint">Đang đọc thư mục…</p>}
          {files?.length === 0 && <p className="hint">Chưa có tệp nào.</p>}
          {files?.map((f) => (
            <div className="mitem" key={f.name}>
              <button type="button" className="mmain" title={kind === "project" ? "Mở dự án" : isAudio ? "Đặt vào timeline tại đầu phát" : "Thêm vào cuối timeline"}
                onClick={() => (kind === "project" ? onOpenProject(f.name) : isAudio ? onAddAudio({ kind, name: f.name }, kind as AClip["kind"]) : onAdd({ kind, name: f.name }))}>
                <Thumb kind={kind} name={f.name} />
                <span className="mn">{f.name.replace(/\.(json|mp3|wav|m4a|aac|flac|ogg|opus|webm)$/i, "")}<small>{(f.size / 1048576).toFixed(1)} MB</small></span>
              </button>
              {isAudio && <PreviewButton kind={kind} name={f.name} />}
              {kind === "bg" && <button type="button" className="mini" onClick={() => onUseBg({ kind: "bg", name: f.name })}>Dùng làm nền</button>}
              <button type="button" className="mini x" aria-label={"Xoá " + f.name} onClick={() => remove(f)}>×</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default memo(MediaPanel);
