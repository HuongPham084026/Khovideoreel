"""Đường dẫn của app: thư mục mã nguồn + thư mục dữ liệu của người dùng (đặt trong config.json hoặc biến KHO_DATA)."""
import json
import os
from pathlib import Path

APP = Path(__file__).resolve().parents[2]          # thư mục kho-reel-mau-app
CONFIG = APP / "config.json"                       # {"data_dir": "D:\\...\\00_Dữ liệu"} — không đẩy lên git
DIST = APP / "dist"                                # giao diện đã build


def _data_dir() -> Path:
    env = os.environ.get("KHO_DATA")
    if env:
        return Path(env)
    try:
        d = json.loads(CONFIG.read_text(encoding="utf-8")).get("data_dir")
        if d:
            return Path(d)
    except (OSError, ValueError):
        pass
    return APP / "du-lieu"


DATA = _data_dir()
LIBRARY = DATA / "library.json"
WORK = DATA / ".work"                              # file tạm (dạng sóng, ảnh xem trước, giọng đọc tạm)

# kind → (tên thư mục, đuôi file cho phép)
VIDEO_EXT = {".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v"}
AUDIO_EXT = {".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".opus", ".webm"}
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"}
KINDS = {
    "video": ("Kho video", VIDEO_EXT | IMAGE_EXT),       # video/ảnh người dùng tải vào kho
    "music": ("Nhạc", AUDIO_EXT),
    "voice": ("Giọng đọc", AUDIO_EXT),
    "bg": ("Nền", VIDEO_EXT | IMAGE_EXT),                # nền dùng để thay vào mẫu
    "brand": ("Thương hiệu", IMAGE_EXT),                 # logo, ảnh đại diện
    "export": ("Xuất video", VIDEO_EXT | IMAGE_EXT),
    "project": ("Dự án", {".json"}),
    "overlay": (".work/overlay", {".webm", ".mov", ".mp4"}),   # lớp mẫu/chữ đã dựng sẵn (nền trong suốt), tạm thời
}
READONLY: set[str] = set()  # thư mục chỉ đọc (hiện chưa có)

for _name, _ in KINDS.values():
    (DATA / _name).mkdir(parents=True, exist_ok=True)
WORK.mkdir(exist_ok=True)


def kind_dir(kind: str) -> Path:
    return DATA / KINDS[kind][0]


def safe_name(name: str) -> str:
    """Tên tệp hợp lệ trên Windows, giữ nguyên tiếng Việt."""
    bad = '<>:"/\\|?*\x00'
    s = "".join("_" if c in bad else c for c in name).strip().rstrip(".")
    return s or "tep"


def file_in(kind: str, name: str) -> Path:
    """Đường dẫn thật của một tệp trong thư mục của `kind`; chặn truy cập ra ngoài thư mục."""
    base = kind_dir(kind).resolve()
    p = (base / safe_name(Path(name).name)).resolve()
    if p.parent != base:
        raise ValueError("Đường dẫn không hợp lệ")
    return p
