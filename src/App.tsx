import { Player, Thumbnail } from "@remotion/player";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as S from "./storage";
import type { Edit, Library, Upload } from "./storage";
import { CATS, FPS, H, TEMPLATES, W, defaults, type Fields, type Template } from "./templates";

type Tab = "all" | "mine" | "starter" | "fav";
type Item =
  | { kind: "starter"; id: string; t: Template; title: string; cat: string; fav: boolean; createdAt: number }
  | { kind: "edit"; id: string; t: Template; e: Edit; title: string; cat: string; fav: boolean; createdAt: number }
  | { kind: "upload"; id: string; u: Upload; title: string; cat: string; fav: boolean; createdAt: number };
type Modal =
  | { type: "starter"; t: Template }
  | { type: "editor"; t: Template; e?: Edit }
  | { type: "upload"; u?: Upload }
  | { type: "uploadView"; u: Upload }
  | { type: "full"; t: Template; f: Fields }
  | null;

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
const tById = (id: string) => TEMPLATES.find((t) => t.id === id);

export default function App() {
  const [conn, setConn] = useState<S.Status | null | undefined>(undefined); // undefined: đang kiểm tra · null: chưa chạy máy chủ
  const dir = !!conn;
  const [lib, setLib] = useState<Library>({ version: 1, items: [], favTemplates: [] });
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Tab>("all");
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("");
  const toastT = useRef<number>();
  const say = useCallback((m: string) => {
    setToast(m);
    window.clearTimeout(toastT.current);
    toastT.current = window.setTimeout(() => setToast(""), 3200);
  }, []);

  /* ---- kết nối máy chủ trên máy và đọc thư viện ---- */
  useEffect(() => {
    (async () => {
      const s = await S.status();
      setConn(s);
      if (!s) return;
      try {
        const l = await S.loadLibrary();
        setLib(l);
        const map: Record<string, string> = {};
        for (const it of l.items) if (it.kind === "upload" && it.file) map[it.file] = S.uploadUrl(it.file);
        setUrls(map);
      } catch (e) { say("Không đọc được thư viện: " + (e as Error).message); }
    })();
  }, [say]);

  async function ensureDir(): Promise<boolean> {
    if (dir) return true;
    say("Chưa kết nối máy chủ. Hãy mở app bằng Chay_app.bat");
    return false;
  }
  async function commit(next: Library, _saved?: boolean) {
    setLib(next);
    if (dir) await S.saveLibrary(next);
  }

  /* ---- danh sách hiển thị ---- */
  const items: Item[] = useMemo(() => {
    const mine: Item[] = lib.items
      .map((x): Item | null => {
        if (x.kind === "upload") return { kind: "upload", id: x.id, u: x, title: x.title, cat: x.cat, fav: x.fav, createdAt: x.createdAt };
        const t = tById(x.templateId);
        return t ? { kind: "edit", id: x.id, t, e: x, title: x.title, cat: t.cat, fav: x.fav, createdAt: x.updatedAt || x.createdAt } : null;
      })
      .filter((x): x is Item => !!x)
      .sort((a, b) => b.createdAt - a.createdAt);
    const st: Item[] = TEMPLATES.filter((t) => !t.hidden).map((t) => ({ kind: "starter", id: t.id, t, title: t.title, cat: t.cat, fav: lib.favTemplates.includes(t.id), createdAt: 0 }));
    let list = tab === "mine" ? mine : tab === "starter" ? st : [...mine, ...st];
    if (tab === "fav") list = [...mine, ...st].filter((i) => i.fav);
    if (cat) list = list.filter((i) => i.cat === cat);
    const nq = norm(q.trim());
    if (nq) list = list.filter((i) => norm([i.title, i.cat, i.kind === "upload" ? i.u.note : "", i.kind !== "upload" ? i.t.kw.join(" ") : ""].join(" ")).includes(nq));
    return list;
  }, [lib, tab, cat, q]);

  async function toggleFav(i: Item) {
    const d = await ensureDir(); if (!d) return;
    const next: Library =
      i.kind === "starter"
        ? { ...lib, favTemplates: i.fav ? lib.favTemplates.filter((x) => x !== i.id) : [...lib.favTemplates, i.id] }
        : { ...lib, items: lib.items.map((x) => (x.id === i.id ? { ...x, fav: !x.fav } : x)) };
    await commit(next, d);
  }

  const nMine = lib.items.length;

  return (
    <>
      <header className="top">
        <div className="top-in">
          <div className="row1">
            <div className="brand">
              <div className="logo">R</div>
              <div><h1>Kho Reel Mẫu</h1><small>Mẫu video TikTok · Reels · sửa chữ và xuất MP4</small></div>
            </div>
            <label className="search">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input id="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm mẫu: tin nóng, review, chốt đơn…" aria-label="Tìm mẫu" />
            </label>
            <a className="btn" href="#studio?new=1">Trình chỉnh sửa</a>
            <button className="btn primary" type="button" onClick={() => setModal({ type: "upload" })}>+ Thêm video mẫu</button>
          </div>
          <div className="row2">
            <div className="tabs" role="group" aria-label="Nguồn">
              {([["all", "Tất cả"], ["mine", "Video của tôi"], ["starter", "Mẫu có sẵn"], ["fav", "★ Yêu thích"]] as [Tab, string][]).map(([k, l]) => (
                <button key={k} className="tab" type="button" aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>
            <div className="sep" />
            {["", ...CATS].map((c) => (
              <button key={c} className="chip" type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>{c || "Mọi chủ đề"}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="main">
        <FolderBar conn={conn} />
        <div className="meta">
          <span><b>{items.length}</b> mẫu đang hiển thị · {nMine} video của bạn · {TEMPLATES.filter((t) => !t.hidden).length} mẫu có sẵn</span>
          <span>Rê chuột để xem chuyển động · bấm vào thẻ để sửa nội dung</span>
        </div>
        <div className="grid">
          {tab !== "starter" && tab !== "fav" && (
            <button className="card add" type="button" onClick={() => setModal({ type: "upload" })}>
              <span className="plus">+</span>Thêm video mẫu<small>MP4, MOV, ảnh hoặc link TikTok</small>
            </button>
          )}
          {items.map((i) => (
            <Card key={i.kind + i.id} i={i} url={i.kind === "upload" && i.u.file ? urls[i.u.file] : undefined}
              onOpen={() => setModal(i.kind === "starter" ? { type: "starter", t: i.t } : i.kind === "edit" ? { type: "editor", t: i.t, e: i.e } : { type: "uploadView", u: i.u })}
              onFav={() => toggleFav(i)} />
          ))}
          {!items.length && (
            <div className="empty">
              {tab === "mine" ? "Chưa có gì ở đây. Mở một mẫu có sẵn và bấm “Sửa nội dung”, hoặc thêm video mẫu của bạn."
                : tab === "fav" ? "Chưa có mẫu yêu thích. Bấm ngôi sao trên thẻ để đánh dấu." : "Không tìm thấy mẫu phù hợp."}
            </div>
          )}
        </div>
      </main>

      {modal?.type === "starter" && (
        <StarterDetail t={modal.t} fav={lib.favTemplates.includes(modal.t.id)} onClose={() => setModal(null)}
          onEdit={() => setModal({ type: "editor", t: modal.t })}
          onFav={() => toggleFav({ kind: "starter", id: modal.t.id, t: modal.t, title: "", cat: "", fav: lib.favTemplates.includes(modal.t.id), createdAt: 0 })} />
      )}
      {modal?.type === "editor" && (
        <Editor t={modal.t} e={modal.e} dir={dir} say={say} onClose={() => setModal(null)}
          onFull={(f) => setModal({ type: "full", t: modal.t, f })}
          onSave={async (title, fields) => {
            const d = await ensureDir(); if (!d) return false;
            const now = Date.now();
            const next: Library = modal.e
              ? { ...lib, items: lib.items.map((x) => (x.id === modal.e!.id ? { ...(x as Edit), title, fields, updatedAt: now } : x)) }
              : { ...lib, items: [{ id: S.newId(), kind: "edit", templateId: modal.t.id, title, fields, fav: false, createdAt: now }, ...lib.items] };
            await commit(next, d);
            say(modal.e ? "Đã lưu thay đổi" : "Đã lưu vào Video của tôi");
            return true;
          }}
          onDelete={modal.e ? async () => { await commit({ ...lib, items: lib.items.filter((x) => x.id !== modal.e!.id) }); setModal(null); say("Đã xoá bản này"); } : undefined}
          ensureDir={ensureDir} />
      )}
      {modal?.type === "full" && <FullScreen t={modal.t} f={modal.f} onClose={() => setModal({ type: "editor", t: modal.t })} />}
      {modal?.type === "upload" && (
        <UploadForm u={modal.u} onClose={() => setModal(null)} onSubmit={async (data, file) => {
          const d = await ensureDir(); if (!d) return "Chưa kết nối máy chủ. Hãy mở app bằng Chay_app.bat.";
          if (modal.u) {
            await commit({ ...lib, items: lib.items.map((x) => (x.id === modal.u!.id ? { ...(x as Upload), ...data } : x)) }, d);
            setModal(null); say("Đã lưu thay đổi"); return null;
          }
          const id = S.newId();
          let fileName: string | null = null;
          if (file) {
            fileName = await S.saveUpload(id, file);
            const url = await S.uploadUrl(fileName);
            setUrls((m) => ({ ...m, [fileName!]: url }));
          }
          const u: Upload = { id, kind: "upload", ...data, file: fileName, type: file ? (file.type.startsWith("image") ? "image" : "video") : "link", size: file?.size ?? null, fav: false, createdAt: Date.now() };
          await commit({ ...lib, items: [u, ...lib.items] }, d);
          setModal(null); setTab("mine"); say("Đã lưu vào thư mục của bạn"); return null;
        }} />
      )}
      {modal?.type === "uploadView" && (
        <UploadView u={modal.u} url={modal.u.file ? urls[modal.u.file] : undefined} onClose={() => setModal(null)}
          onEdit={() => setModal({ type: "upload", u: modal.u })}
          onFav={() => toggleFav({ kind: "upload", id: modal.u.id, u: modal.u, title: "", cat: "", fav: modal.u.fav, createdAt: 0 })}
          onDelete={async () => {
            if (dir && modal.u.file) await S.deleteUpload(modal.u.file);
            await commit({ ...lib, items: lib.items.filter((x) => x.id !== modal.u.id) }); setModal(null); say("Đã xoá video");
          }} />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}

/* ================= Thanh thư mục ================= */
function FolderBar({ conn }: { conn: S.Status | null | undefined }) {
  if (conn === undefined) return <div className="notice"><span>Đang kết nối máy chủ trên máy bạn…</span></div>;
  if (!conn)
    return <div className="notice warn">Chưa kết nối được máy chủ trên máy. Hãy mở app bằng <b>Chay_app.bat</b> (lần đầu chạy <b>Cai_dat.bat</b>). Bạn vẫn xem và xuất MP4 mẫu có sẵn được, nhưng chưa lưu được dữ liệu.</div>;
  const miss = [!conn.ffmpeg && "FFmpeg", !conn.whisper && "faster-whisper", !conn.edgeTts && "edge-tts"].filter(Boolean).join(", ");
  return (
    <div className="notice ok">
      <span>Đang lưu vào thư mục <b>{conn.dataDir}</b> trên máy bạn{miss ? ` · thiếu: ${miss} (chạy Cai_dat.bat)` : ""}</span>
      <button className="btn sm ghost" type="button" onClick={() => S.openFolder()}>Mở thư mục</button>
    </div>
  );
}

/* ================= Thẻ ================= */
function Card({ i, url, onOpen, onFav }: { i: Item; url?: string; onOpen: () => void; onFav: () => void }) {
  const [hover, setHover] = useState(false);
  const vref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = vref.current; if (!v) return;
    if (hover) v.play().catch(() => {}); else v.pause();
  }, [hover]);
  const props = i.kind === "starter" ? { f: defaults(i.t) } : i.kind === "edit" ? { f: { ...defaults(i.t), ...i.e.fields } } : null;
  const t = i.kind === "upload" ? null : i.t;
  return (
    <div className={"card" + (i.kind !== "starter" ? " mine-card" : "")} role="button" tabIndex={0} aria-label={i.title}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}
      onClick={onOpen} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}>
      <div className="media">
        {t && props && (hover ? (
          <Player component={t.Comp} inputProps={props} durationInFrames={t.seconds * FPS} fps={FPS} compositionWidth={W} compositionHeight={H}
            style={{ width: "100%", height: "100%" }} autoPlay loop initiallyMuted acknowledgeRemotionLicense />
        ) : (
          <Thumbnail component={t.Comp} inputProps={props} durationInFrames={t.seconds * FPS} fps={FPS} compositionWidth={W} compositionHeight={H}
            frameToDisplay={Math.round(FPS * 1.6)} style={{ width: "100%", height: "100%" }} />
        ))}
        {i.kind === "upload" && (i.u.type === "video" && url ? <video ref={vref} src={url} muted loop playsInline preload="metadata" />
          : i.u.type === "image" && url ? <img className="thumb" src={url} alt="" />
          : <div className="linkcard"><div className="t">{i.title}</div><div className="u">{i.u.link || "Không tìm thấy file trong thư mục"}</div></div>)}
      </div>
      {i.kind !== "starter" && <div className="cap">{i.title}</div>}
      <div className="tools">
        <button className={"icon-btn" + (i.fav ? " fav-on" : "")} type="button" aria-label={i.fav ? "Bỏ yêu thích" : "Yêu thích"} title={i.fav ? "Bỏ yêu thích" : "Yêu thích"}
          onClick={(e) => { e.stopPropagation(); onFav(); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" /></svg>
        </button>
      </div>
      <div className="badge">
        {i.kind === "starter" ? <><span className="playdot"><svg viewBox="0 0 10 10"><path d="M2 1l7 4-7 4z" /></svg></span><span className="pill">{i.t.seconds}s</span></>
          : <span className="pill mine">{i.kind === "edit" ? "BẢN CỦA TÔI" : "VIDEO CỦA TÔI"}</span>}
      </div>
    </div>
  );
}

/* ================= Khung cửa sổ ================= */
function Dialog({ label, onClose, wide = true, children }: { label: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={"dialog" + (wide ? "" : " narrow")} role="dialog" aria-modal="true" aria-label={label}>
        {children}
        <button className="btn x" type="button" onClick={onClose} aria-label="Đóng">✕</button>
      </div>
    </div>
  );
}

function Preview({ t, f, controls = false }: { t: Template; f: Fields; controls?: boolean }) {
  return (
    <div className="frame">
      <Player component={t.Comp} inputProps={{ f }} durationInFrames={t.seconds * FPS} fps={FPS} compositionWidth={W} compositionHeight={H}
        style={{ width: "100%", height: "100%" }} autoPlay loop initiallyMuted controls={controls} acknowledgeRemotionLicense />
    </div>
  );
}

function StarterDetail({ t, fav, onClose, onEdit, onFav }: { t: Template; fav: boolean; onClose: () => void; onEdit: () => void; onFav: () => void }) {
  const f = useMemo(() => defaults(t), [t]);
  return (
    <Dialog label={t.title} onClose={onClose}>
      <div className="pv"><Preview t={t} f={f} /></div>
      <div className="info">
        <div><div className="kicker">{t.cat} · {t.seconds}s · Mẫu có sẵn</div><h2>{t.title}</h2></div>
        <h4>Kịch bản cả video (mẫu này là cảnh chính)</h4>
        <ul className="scenes">{t.scenes.map(([a, b]) => <li key={a}><b>{a}</b><span>{b}</span></li>)}</ul>
        <h4>Mẹo dùng</h4>
        <ul className="howto">{t.how.map((h) => <li key={h}>{h}</li>)}</ul>
        <div className="actions">
          <button className="btn primary" type="button" onClick={onEdit}>✎ Sửa nội dung &amp; xuất MP4</button>
          <button className="btn" type="button" onClick={() => S.sendToStudio(t.id, f)}>Đặt lên video trong Trình chỉnh sửa</button>
          <button className="btn" type="button" onClick={onFav}>{fav ? "★ Đã yêu thích" : "☆ Yêu thích"}</button>
        </div>
      </div>
    </Dialog>
  );
}

/* ================= Trình sửa nội dung + xuất MP4 ================= */
function Editor({ t, e, dir, say, onClose, onSave, onDelete, onFull, ensureDir }: {
  t: Template; e?: Edit; dir: boolean; say: (m: string) => void; onClose: () => void;
  onSave: (title: string, f: Fields) => Promise<boolean>; onDelete?: () => Promise<void>; onFull: (f: Fields) => void;
  ensureDir: () => Promise<boolean>;
}) {
  const [f, setF] = useState<Fields>(() => ({ ...defaults(t), ...(e?.fields || {}) }));
  const [title, setTitle] = useState(e?.title || `${t.title} – bản của tôi`);
  const [busy, setBusy] = useState<"" | "save">("");
  const [armed, setArmed] = useState(false);
  const [exp, setExp] = useState<{ p: number; ctl: AbortController } | null>(null);
  const [expErr, setExpErr] = useState("");

  async function doExport() {
    setExpErr("");
    const { checkExport, exportMp4 } = await import("./exportMp4");
    const problem = await checkExport();
    if (problem) { setExpErr("Máy này chưa xuất MP4 được: " + problem + ". Hãy dùng Chrome hoặc Edge bản mới."); return; }
    const d = dir || (await ensureDir());
    const ctl = new AbortController();
    setExp({ p: 0, ctl });
    try {
      const blob = await exportMp4(t, f, (p) => setExp({ p, ctl }), ctl.signal);
      const name = `${S.safeName(title)}.mp4`;
      if (d) await S.saveExport(name, blob);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 30000);
      say(d ? `Đã xuất ${name} vào thư mục Xuất video` : `Đã xuất ${name}`);
    } catch (err) {
      if (!ctl.signal.aborted) setExpErr("Xuất video bị lỗi: " + (err as Error).message);
    } finally { setExp(null); }
  }

  return (
    <Dialog label={"Sửa nội dung " + t.title} onClose={() => { exp?.ctl.abort(); onClose(); }}>
      <div className="pv">
        <Preview t={t} f={f} controls />
        <p className="muted">Xem trước đổi ngay khi bạn gõ.</p>
      </div>
      <div className="info">
        <div><div className="kicker">{e ? "Bản của tôi" : "Sửa từ mẫu"} · {t.title} · {t.seconds}s</div><h2>Sửa nội dung</h2></div>
        <div className="field"><label htmlFor="e_name">Đặt tên bản này</label><input id="e_name" maxLength={80} value={title} onChange={(ev) => setTitle(ev.target.value)} /></div>
        <div className="fields">
          {t.fields.map((x) => (
            <div className="field" key={x.key}>
              <label htmlFor={"e_" + x.key}>{x.label}</label>
              {x.long ? <textarea id={"e_" + x.key} rows={2} value={f[x.key]} onChange={(ev) => setF({ ...f, [x.key]: ev.target.value })} />
                : <input id={"e_" + x.key} value={f[x.key]} onChange={(ev) => setF({ ...f, [x.key]: ev.target.value })} />}
            </div>
          ))}
        </div>
        {exp && (
          <div className="progress" aria-live="polite">
            <div className="bar"><i style={{ width: `${Math.round(exp.p * 100)}%` }} /></div>
            <span>Đang dựng MP4… {Math.round(exp.p * 100)}% · giữ tab này mở</span>
            <button className="btn sm ghost" type="button" onClick={() => exp.ctl.abort()}>Huỷ</button>
          </div>
        )}
        {expErr && <div className="err">{expErr}</div>}
        <div className="actions">
          <button className="btn primary" type="button" disabled={!!exp} onClick={doExport}>⬇ Xuất MP4</button>
          <button className="btn" type="button" disabled={busy === "save"} onClick={async () => { setBusy("save"); await onSave(title.trim() || t.title, f); setBusy(""); }}>
            {busy === "save" ? "Đang lưu…" : e ? "Lưu thay đổi" : "Lưu thành bản của tôi"}
          </button>
          <button className="btn" type="button" onClick={() => S.sendToStudio(t.id, f)}>Đặt lên video trong Trình chỉnh sửa</button>
          <button className="btn ghost" type="button" onClick={() => onFull(f)}>⛶ Toàn màn hình</button>
          {onDelete ? (
            <button className="btn danger" type="button" onClick={() => (armed ? onDelete() : setArmed(true))}>{armed ? "Bấm lần nữa để xoá" : "Xoá bản này"}</button>
          ) : (
            <button className="btn ghost" type="button" onClick={() => setF(defaults(t))}>Về chữ gốc</button>
          )}
        </div>
        <p className="muted">MP4 1080×1920, không tiếng. Ghép nhạc và đoạn quay của bạn trong CapCut.</p>
      </div>
    </Dialog>
  );
}

function FullScreen({ t, f, onClose }: { t: Template; f: Fields; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="full" onClick={onClose}>
      <div className="full-frame">
        <Player component={t.Comp} inputProps={{ f }} durationInFrames={t.seconds * FPS} fps={FPS} compositionWidth={W} compositionHeight={H}
          style={{ width: "100%", height: "100%" }} autoPlay loop initiallyMuted acknowledgeRemotionLicense />
      </div>
      <div className="full-hint">Chạm để đóng</div>
    </div>
  );
}

/* ================= Video tải lên ================= */
type UploadData = { title: string; cat: string; link: string; note: string };
function UploadForm({ u, onClose, onSubmit }: { u?: Upload; onClose: () => void; onSubmit: (d: UploadData, file: File | null) => Promise<string | null> }) {
  const [file, setFile] = useState<File | null>(null);
  const [d, setD] = useState<UploadData>({ title: u?.title || "", cat: u?.cat || "Khác", link: u?.link || "", note: u?.note || "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const fi = useRef<HTMLInputElement>(null);
  const pick = (f?: File) => {
    if (!f) return;
    setFile(f); setErr("");
    if (!d.title) setD((x) => ({ ...x, title: f.name.replace(/\.[^.]+$/, "").slice(0, 80) }));
  };
  return (
    <Dialog label={u ? "Sửa thông tin" : "Thêm video mẫu"} onClose={onClose} wide={false}>
      <form className="info" onSubmit={async (e) => {
        e.preventDefault();
        if (!d.title.trim()) return setErr("Đặt tên cho mẫu để dễ tìm lại.");
        if (!u && !file && !d.link.trim()) return setErr("Chọn một file video/ảnh hoặc dán link gốc.");
        setBusy(true);
        try { const r = await onSubmit({ ...d, title: d.title.trim(), link: d.link.trim(), note: d.note.trim() }, file); if (r) setErr(r); }
        catch (x) { setErr("Chưa lưu được: " + (x as Error).message); }
        setBusy(false);
      }}>
        <h2>{u ? "Sửa thông tin" : "Thêm video mẫu"}</h2>
        {!u && (
          <>
            <div className={"drop" + (over ? " over" : "")} role="button" tabIndex={0} onClick={() => fi.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fi.current?.click(); } }}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}>
              <b>Chọn hoặc kéo thả video / ảnh</b>
              <span className="muted">MP4, MOV, JPG, PNG · lưu thẳng vào thư mục trên máy</span>
              {file && <div className="muted">Đã chọn: {file.name} ({(file.size / 1048576).toFixed(1)} MB)</div>}
            </div>
            <input ref={fi} type="file" accept="video/*,image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
          </>
        )}
        <div className="field"><label htmlFor="ftitle">Tên mẫu</label><input id="ftitle" maxLength={80} value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="VD: Hook chữ chạy nền đen" /></div>
        <div className="field"><label htmlFor="fcat">Chủ đề</label><select id="fcat" value={d.cat} onChange={(e) => setD({ ...d, cat: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="field"><label htmlFor="flink">Link gốc (TikTok, Canva…), không bắt buộc</label><input id="flink" type="url" value={d.link} onChange={(e) => setD({ ...d, link: e.target.value })} placeholder="https://www.tiktok.com/@…" /></div>
        <div className="field"><label htmlFor="fnote">Ghi chú: vì sao lưu, sẽ dựng lại thế nào</label><textarea id="fnote" maxLength={1500} value={d.note} onChange={(e) => setD({ ...d, note: e.target.value })} placeholder="VD: Hook 3 giây đầu rất mạnh, đổi chủ đề sang tool AI làm video" /></div>
        <div className="err">{err}</div>
        <div className="actions">
          <button className="btn primary" type="submit" disabled={busy}>{busy ? "Đang lưu…" : u ? "Lưu thay đổi" : "Lưu vào kho"}</button>
          <button className="btn ghost" type="button" onClick={onClose}>Huỷ</button>
        </div>
      </form>
    </Dialog>
  );
}

function UploadView({ u, url, onClose, onEdit, onFav, onDelete }: { u: Upload; url?: string; onClose: () => void; onEdit: () => void; onFav: () => void; onDelete: () => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <Dialog label={u.title} onClose={onClose}>
      <div className="pv"><div className="frame">
        {u.type === "video" && url ? <video src={url} controls autoPlay muted loop playsInline />
          : u.type === "image" && url ? <img src={url} alt="" />
          : <div className="linkcard"><div className="t">{u.title}</div></div>}
      </div></div>
      <div className="info">
        <div><div className="kicker">{u.cat} · Video của tôi</div><h2>{u.title}</h2></div>
        {u.link && <div><h4>Link gốc</h4><a className="link" href={u.link} target="_blank" rel="noopener noreferrer">{u.link}</a></div>}
        {u.note && <div><h4>Ghi chú / ý tưởng dựng lại</h4><div className="note">{u.note}</div></div>}
        <div className="muted">{u.file ? `videos/${u.file} · ` : ""}{u.size ? (u.size / 1048576).toFixed(1) + " MB · " : ""}Thêm ngày {new Date(u.createdAt).toLocaleDateString("vi-VN")}</div>
        <div className="muted">Muốn biến video này thành mẫu sửa được? Gửi file này cho Claude để dựng thành mẫu mới.</div>
        <div className="actions">
          <button className="btn primary" type="button" onClick={onFav}>{u.fav ? "★ Đã yêu thích" : "☆ Yêu thích"}</button>
          <button className="btn" type="button" onClick={onEdit}>Sửa thông tin</button>
          <button className="btn danger" type="button" onClick={() => (armed ? onDelete() : setArmed(true))}>{armed ? "Bấm lần nữa để xoá" : "Xoá"}</button>
        </div>
      </div>
    </Dialog>
  );
}
