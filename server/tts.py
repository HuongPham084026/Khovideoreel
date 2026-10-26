"""Giọng đọc: Microsoft Edge (miễn phí) + Google Gemini (cần khóa API).
Lấy từ kho https://github.com/HuongPham084026/AppVoice_GeminiAPI (app/server.py), chỉnh để chạy như tác vụ nền trong app này."""
import asyncio
import base64
import json
import os
import re
import struct
import urllib.error
import urllib.request
import uuid
from pathlib import Path

from .core.media import probe
from .core.paths import file_in, safe_name

DEFAULT_VOICE = "vi-VN-HoaiMyNeural"
MAX_CHARS = 10000
EDGE_VOICES = [
    {"id": "vi-VN-HoaiMyNeural", "name": "HoaiMy (nữ)", "engine": "edge"},
    {"id": "vi-VN-NamMinhNeural", "name": "NamMinh (nam)", "engine": "edge"},
]
GEMINI_MODEL = "gemini-3.8-flash-tts"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
GEMINI_VOICES = [
    "Charon", "Kore", "Puck", "Zephyr", "Fenrir", "Leda", "Orus", "Aoede", "Callirrhoe", "Autonoe",
    "Enceladus", "Iapetus", "Umbriel", "Algieba", "Despina", "Erinome", "Algenib", "Rasalgethi",
    "Laomedeia", "Achernar", "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird",
    "Zubenelgenubi", "Vindemiatrix", "Sadachbia", "Sadaltager", "Sulafat",
]
AI_STUDIO_URL = "https://aistudio.google.com/apikey"
# Dùng chung vị trí lưu khóa với app VoiceLabs, nên nhập một lần là dùng được ở cả hai nơi
USER_KEY_FILE = Path(os.environ.get("APPDATA") or Path.home()) / "VoiceLabs" / "gemini_key.txt"
KEY_RE = re.compile(r"[\w.\-]{20,200}")


def voices() -> list[dict]:
    return EDGE_VOICES + [{"id": f"gemini:{n}", "name": n, "engine": "gemini"} for n in GEMINI_VOICES]


def gemini_key() -> str:
    """Thứ tự: biến môi trường GEMINI_API_KEY → khóa đã nhập (APPDATA\\VoiceLabs)."""
    if os.environ.get("GEMINI_API_KEY"):
        return os.environ["GEMINI_API_KEY"].strip()
    try:
        return USER_KEY_FILE.read_text(encoding="utf-8-sig").strip()
    except OSError:
        return ""


def key_status() -> dict:
    k = gemini_key()
    return {"has": bool(k), "masked": ("••••" + k[-4:]) if k else ""}


def save_key(key: str) -> None:
    key = key.strip()
    if not key:  # xoá khóa đã nhập
        USER_KEY_FILE.unlink(missing_ok=True)
        return
    if not KEY_RE.fullmatch(key):
        raise ValueError("Khóa không đúng định dạng. Hãy sao chép nguyên khóa từ Google AI Studio.")
    try:
        req = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", headers={"x-goog-api-key": key})
        urllib.request.urlopen(req, timeout=20).read()
    except urllib.error.HTTPError as e:
        if e.code in (400, 401, 403):
            raise ValueError("Google từ chối khóa này. Kiểm tra lại khóa hoặc tạo khóa mới.") from None
    except OSError:
        raise ValueError("Không kết nối được Google để kiểm tra khóa. Kiểm tra mạng rồi thử lại.") from None
    USER_KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
    USER_KEY_FILE.write_text(key, encoding="utf-8")


def _pcm_to_wav(pcm: bytes, rate=24000) -> bytes:
    hdr = b"RIFF" + struct.pack("<I", 36 + len(pcm)) + b"WAVEfmt " + struct.pack("<IHHIIHH", 16, 1, 1, rate, rate * 2, 2, 16)
    return hdr + b"data" + struct.pack("<I", len(pcm)) + pcm


def _gemini_audio(resp: dict) -> bytes:
    for step in resp.get("steps", []):
        for c in step.get("content", []) or []:
            if c.get("type") == "audio" and c.get("data"):
                raw = base64.b64decode(c["data"])
                return raw if raw[:4] == b"RIFF" else _pcm_to_wav(raw)
    raise ValueError("Gemini không trả về audio.")


def synth_gemini(text: str, voice: str, style: str) -> bytes:
    key = gemini_key()
    if not key:
        raise ValueError("Chưa có khóa Gemini. Bấm “Nhập khóa Gemini” để thêm khóa miễn phí.")
    item = {"type": "text", "text": text}
    if style.strip():
        item["annotations"] = [{"type": "speech_metadata", "style": style.strip()}]
    body = {
        "model": GEMINI_MODEL,
        "input": [{"type": "user_input", "content": [item]}],
        "response_format": {"type": "audio"},
        "generation_config": {"speech_config": [{"voice": voice}]},
    }
    req = urllib.request.Request(GEMINI_URL, json.dumps(body).encode(), {"x-goog-api-key": key, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return _gemini_audio(json.loads(r.read()))
    except urllib.error.HTTPError as e:
        raise ValueError({
            400: "Dịch vụ từ chối yêu cầu (khóa API sai hoặc văn bản không hợp lệ).",
            403: "Khóa API Gemini không có quyền hoặc chưa bật.",
            429: "Hết hạn mức hoặc bị giới hạn tốc độ, thử lại sau.",
        }.get(e.code, f"Dịch vụ Gemini trả lỗi {e.code}.")) from None


async def _edge(text, voice, rate, pitch, volume, path: Path):
    import edge_tts
    await edge_tts.Communicate(text, voice, rate=f"{rate:+d}%", pitch=f"{pitch:+d}Hz", volume=f"{volume:+d}%").save(str(path))


def generate(job, req: dict) -> dict:
    """Tạo một tệp giọng đọc trong thư mục “Giọng đọc”. Trả về {file, duration, voice}."""
    text = (req.get("text") or "").strip()
    if not text:
        raise ValueError("Chưa có văn bản.")
    if len(text) > MAX_CHARS:
        raise ValueError(f"Tối đa {MAX_CHARS} ký tự mỗi lần.")
    voice = req.get("voice") or DEFAULT_VOICE
    if not re.fullmatch(r"(gemini:)?[\w-]+", voice):
        raise ValueError("Giọng không hợp lệ.")
    clamp = lambda v, a, b: max(a, min(b, int(v or 0)))  # noqa: E731
    slug = re.sub(r"[^\w ]", "", text)[:24].strip().replace(" ", "-") or "giong"
    tag = uuid.uuid4().hex[:5]
    job.set(10, "Đang tạo giọng đọc")
    if voice.startswith("gemini:"):
        path = file_in("voice", f"{slug}-{tag}.wav")
        path.write_bytes(synth_gemini(text, voice[7:], req.get("style", "")))
    else:
        path = file_in("voice", f"{slug}-{tag}.mp3")
        try:
            asyncio.run(_edge(text, voice, clamp(req.get("rate"), -50, 100), clamp(req.get("pitch"), -50, 50), clamp(req.get("volume"), -50, 50), path))
        except Exception as e:  # noqa: BLE001
            path.unlink(missing_ok=True)
            raise ValueError("Không tạo được giọng Microsoft — hãy kiểm tra kết nối Internet. Chi tiết: " + str(e)[:160]) from None
    return {"file": path.name, "duration": round(probe(path)["duration"], 2), "voice": voice}
