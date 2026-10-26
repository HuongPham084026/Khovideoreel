"""Tiện ích FFmpeg/FFprobe dùng chung cho mọi tính năng."""
import json
import re
import subprocess
import sys
import threading

CREATE_NO_WINDOW = 0x08000000 if sys.platform == "win32" else 0


def probe(path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
        capture_output=True, text=True, encoding="utf-8", creationflags=CREATE_NO_WINDOW,
    )
    if out.returncode != 0:
        raise RuntimeError(f"ffprobe lỗi: {out.stderr.strip()}")
    data = json.loads(out.stdout)
    v = next((s for s in data["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in data["streams"] if s["codec_type"] == "audio"), None)
    info = {"duration": float(data["format"].get("duration", 0) or 0), "has_audio": a is not None}
    if v:
        info.update(width=int(v["width"]), height=int(v["height"]))
        num, _, den = v.get("r_frame_rate", "30/1").partition("/")
        info["fps"] = round(float(num) / float(den or 1), 2) if float(den or 1) else 30
    return info


def run_ffmpeg(job, args: list[str], total: float | None = None, cwd=None, p0=0.0, p1=100.0):
    """Chạy ffmpeg, cập nhật tiến độ job trong khoảng [p0, p1]."""
    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-progress", "pipe:1", "-nostats", *args]
    proc = subprocess.Popen(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
        encoding="utf-8", errors="replace", cwd=cwd, creationflags=CREATE_NO_WINDOW,
    )
    job.track(proc)
    err_lines: list[str] = []
    t = threading.Thread(target=lambda: err_lines.extend(proc.stderr.read().splitlines()), daemon=True)
    t.start()
    for line in proc.stdout:
        m = re.match(r"out_time_us=(\d+)", line)
        if m and total:
            job.set(p0 + (p1 - p0) * min(1.0, int(m.group(1)) / 1e6 / total))
        job.check()
    proc.wait()
    t.join(timeout=2)
    job.check()
    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg lỗi (mã {proc.returncode}):\n" + "\n".join(err_lines[-15:]))


def detect_silences(path, noise_db=-25, min_dur=0.4) -> list[tuple[float, float | None]]:
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-af",
         f"silencedetect=noise={noise_db}dB:d={min_dur}", "-vn", "-f", "null", "-"],
        capture_output=True, text=True, encoding="utf-8", errors="replace", creationflags=CREATE_NO_WINDOW,
    ).stderr
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: (-?[\d.]+)", out)]
    return [(max(0.0, s), ends[i] if i < len(ends) else None) for i, s in enumerate(starts)]


def extract_frame(path, t: float, out_png):
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{t:.3f}", "-i", str(path),
         "-frames:v", "1", str(out_png)],
        check=True, creationflags=CREATE_NO_WINDOW,
    )
