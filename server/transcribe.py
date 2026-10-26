"""Phiên âm tiếng nói thành chữ có mốc thời gian từng từ (faster-whisper, chạy trên máy)."""
import subprocess
import tempfile
from pathlib import Path

from .core.media import CREATE_NO_WINDOW
from .core.paths import file_in

_model = None
MODEL = "small"


def _load(job):
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        job.set(5, "Nạp mô hình nhận dạng giọng nói (lần đầu cần tải khoảng 460 MB, cần Internet)")
        _model = WhisperModel(MODEL, device="cpu", compute_type="int8")
    return _model


def transcribe(job, req: dict) -> dict:
    """req: {kind, name, in, out, language}. Trả về {words:[{w,s,e}]} với mốc giây tính từ đầu đoạn [in, out]."""
    p = file_in(req["kind"], req["name"])
    if not p.is_file():
        raise ValueError("Không tìm thấy tệp để phiên âm")
    a = max(0.0, float(req.get("in") or 0))
    d = max(0.0, float(req.get("out") or 0) - a)
    with tempfile.TemporaryDirectory() as td:
        wav = Path(td) / "a.wav"
        cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{a:.3f}", *(["-t", f"{d:.3f}"] if d > 0 else []), "-i", str(p), "-vn", "-ac", "1", "-ar", "16000", str(wav)]
        job.set(3, "Tách âm thanh")
        r = subprocess.run(cmd, capture_output=True, text=True, creationflags=CREATE_NO_WINDOW)
        if r.returncode != 0 or not wav.is_file():
            raise ValueError("Tệp này không có âm thanh để phiên âm")
        model = _load(job)
        job.set(20, "Đang nhận dạng giọng nói")
        segments, info = model.transcribe(str(wav), language=req.get("language") or "vi", word_timestamps=True, vad_filter=True)
        words = []
        total = max(info.duration, 0.1)
        for seg in segments:
            job.check()
            job.set(20 + 75 * min(1.0, seg.end / total))
            for w in seg.words or []:
                t = w.word.strip()
                if t:
                    words.append({"w": t, "s": round(float(w.start), 3), "e": round(float(w.end), 3)})
    if not words:
        raise ValueError("Không nhận ra lời nói nào trong đoạn này")
    return {"words": words, "duration": round(float(total), 2)}
