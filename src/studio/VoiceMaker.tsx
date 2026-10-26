import { useEffect, useState } from "react";
import * as S from "../storage";

type Props = { say: (m: string) => void; onCreated: (file: string) => void };

/** Tạo giọng đọc từ văn bản: Microsoft Edge (miễn phí) hoặc Google Gemini (cần khóa API miễn phí) */
export default function VoiceMaker({ say, onCreated }: Props) {
  const [info, setInfo] = useState<S.VoiceInfo | null>(null);
  const [text, setText] = useState("");
  const [voice, setVoice] = useState("vi-VN-HoaiMyNeural");
  const [rate, setRate] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [volume, setVolume] = useState(0);
  const [style, setStyle] = useState("");
  const [busy, setBusy] = useState<S.Job | "start" | null>(null);
  const [err, setErr] = useState("");
  const [keyOpen, setKeyOpen] = useState(false);
  const [keyText, setKeyText] = useState("");

  useEffect(() => { S.ttsVoices().then(setInfo).catch((e) => setErr((e as Error).message)); }, []);
  const v = info?.voices.find((x) => x.id === voice);
  const gemini = v?.engine === "gemini";
  const needKey = gemini && info && !info.key.has;

  async function make() {
    setErr("");
    setBusy("start");
    try {
      const first = await S.startTts({ text, voice, rate, pitch, volume, style });
      const done = await S.waitJob(first, (j) => setBusy(j));
      say(`Đã tạo giọng đọc ${done.result?.duration ?? ""}s và đặt vào timeline`);
      onCreated(String(done.result?.file));
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(null); }
  }
  async function saveKey() {
    try {
      const k = await S.saveTtsKey(keyText);
      setInfo((i) => (i ? { ...i, key: k } : i));
      setKeyText("");
      setKeyOpen(false);
      say(k.has ? "Đã lưu khóa Gemini" : "Đã xoá khóa Gemini");
    } catch (e) { setErr((e as Error).message); }
  }

  return (
    <div className="voice">
      <textarea rows={5} value={text} maxLength={10000} onChange={(e) => setText(e.target.value)} placeholder="Gõ hoặc dán nội dung cần đọc…" aria-label="Văn bản cần đọc" />
      <small className="hint">{text.length}/10000 ký tự</small>
      <label className="f"><span>Giọng đọc</span>
        <select value={voice} onChange={(e) => setVoice(e.target.value)}>
          <optgroup label="Microsoft Edge (miễn phí)">
            {info?.voices.filter((x) => x.engine === "edge").map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </optgroup>
          <optgroup label="Google Gemini (cần khóa API)">
            {info?.voices.filter((x) => x.engine === "gemini").map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </optgroup>
        </select>
      </label>

      {!gemini && (
        <>
          <label className="f"><span>Tốc độ: {rate > 0 ? "+" : ""}{rate}%</span><input type="range" min={-50} max={100} step={5} value={rate} onChange={(e) => setRate(+e.target.value)} /></label>
          <label className="f"><span>Cao độ: {pitch > 0 ? "+" : ""}{pitch} Hz</span><input type="range" min={-50} max={50} step={5} value={pitch} onChange={(e) => setPitch(+e.target.value)} /></label>
          <label className="f"><span>Âm lượng: {volume > 0 ? "+" : ""}{volume}%</span><input type="range" min={-50} max={50} step={5} value={volume} onChange={(e) => setVolume(+e.target.value)} /></label>
        </>
      )}
      {gemini && (
        <>
          <label className="f"><span>Phong cách đọc (tuỳ chọn)</span>
            <input value={style} onChange={(e) => setStyle(e.target.value)} placeholder="VD: giọng Huế, trầm ấm, chậm rãi" /></label>
          <p className="hint">
            {info?.key.has ? <>Đã có khóa Gemini ({info.key.masked}). </> : <>Chưa có khóa Gemini. </>}
            <button type="button" className="link" onClick={() => setKeyOpen((o) => !o)}>{info?.key.has ? "Đổi khóa" : "Nhập khóa Gemini"}</button>
          </p>
        </>
      )}
      {(keyOpen || needKey) && gemini && (
        <div className="keybox">
          <p className="hint">Khóa miễn phí lấy tại Google AI Studio. Khóa lưu trên máy bạn, không gửi đi đâu khác ngoài Google.</p>
          <input type="password" value={keyText} onChange={(e) => setKeyText(e.target.value)} placeholder="Dán khóa API vào đây" aria-label="Khóa Gemini" autoComplete="off" />
          <div className="row">
            <button type="button" className="btn sm" onClick={() => { S.openAiStudio(); }}>Mở trang lấy khóa</button>
            <button type="button" className="btn sm primary" disabled={!keyText.trim()} onClick={saveKey}>Lưu khóa</button>
            {info?.key.has && <button type="button" className="btn sm danger" onClick={() => { setKeyText(""); S.saveTtsKey("").then((k) => setInfo((i) => (i ? { ...i, key: k } : i))); }}>Xoá khóa</button>}
          </div>
        </div>
      )}

      {busy && <div className="prog"><div className="bar"><i style={{ width: `${typeof busy === "object" ? Math.max(8, busy.progress) : 8}%` }} /></div><span>Đang tạo giọng…</span></div>}
      {err && <pre className="err">{err}</pre>}
      <button className="btn primary" type="button" disabled={!!busy || !text.trim() || !!needKey} onClick={make}>
        {busy ? "Đang tạo…" : "Tạo giọng đọc và đặt vào timeline"}
      </button>
    </div>
  );
}
