"""Kho Reel Mẫu — máy chủ cục bộ. Chạy: python -m server.app (hoặc bấm Chay_app.bat) → http://127.0.0.1:8765"""
import json
import os
import shutil
import subprocess
import sys
import threading
import webbrowser
from pathlib import Path

from flask import Flask, abort, jsonify, request, send_file, send_from_directory

from . import studio_render, transcribe, tts
from .core import jobs
from .core.media import probe
from .core.paths import DATA, DIST, KINDS, LIBRARY, READONLY, file_in, kind_dir

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = None
PORT = int(os.environ.get("KHO_PORT", 8765))
HOST = "127.0.0.1"  # chỉ máy này truy cập được


def _kind(kind: str) -> str:
    if kind not in KINDS:
        abort(404, "Không có thư mục này")
    return kind


def _writable(kind: str) -> str:
    if _kind(kind) in READONLY:
        abort(403, "Thư mục này chỉ để đọc")
    return kind


def _module_ok(name: str) -> bool:
    try:
        __import__(name)
        return True
    except ImportError:
        return False


def _tool_ok(cmd: str) -> bool:
    return shutil.which(cmd) is not None


# ----------------------------------------------------------------------------- trạng thái
@app.get("/api/status")
def status():
    return jsonify(
        ok=True,
        dataDir=str(DATA),
        folders={k: v[0] for k, v in KINDS.items()},
        ffmpeg=_tool_ok("ffmpeg") and _tool_ok("ffprobe"),
        whisper=_module_ok("faster_whisper"),
        edgeTts=_module_ok("edge_tts"),
        geminiKey=tts.key_status()["has"],
        built=(DIST / "index.html").is_file(),
    )


@app.post("/api/open-folder")
def open_folder():
    kind = (request.json or {}).get("kind")
    target = kind_dir(_kind(kind)) if kind else DATA
    if sys.platform == "win32":
        os.startfile(target)  # noqa: S606
    elif sys.platform == "darwin":
        subprocess.Popen(["open", str(target)])
    else:
        subprocess.Popen(["xdg-open", str(target)])
    return jsonify(ok=True)


# ----------------------------------------------------------------------------- thư viện (library.json)
@app.get("/api/library")
def get_library():
    try:
        return jsonify(json.loads(LIBRARY.read_text(encoding="utf-8")))
    except (OSError, ValueError):
        return jsonify(version=1, items=[], favTemplates=[])


@app.put("/api/library")
def put_library():
    lib = request.get_json(silent=True)
    if not isinstance(lib, dict) or not isinstance(lib.get("items"), list):
        abort(400, "Dữ liệu thư viện không hợp lệ")
    tmp = LIBRARY.with_suffix(".tmp")
    tmp.write_text(json.dumps(lib, ensure_ascii=False, indent=2), encoding="utf-8")
    if LIBRARY.exists():
        shutil.copy2(LIBRARY, LIBRARY.with_suffix(".bak"))  # giữ bản trước đó phòng khi lỗi
    tmp.replace(LIBRARY)
    return jsonify(ok=True)


# ----------------------------------------------------------------------------- tệp
def _unique(kind: str, name: str) -> Path:
    p = file_in(kind, name)
    i = 1
    while p.exists():
        p = file_in(kind, f"{Path(name).stem}_{i}{Path(name).suffix}")
        i += 1
    return p


@app.get("/api/list/<kind>")
def list_files(kind):
    d = kind_dir(_kind(kind))
    exts = KINDS[kind][1]
    items = [p for p in d.iterdir() if p.is_file() and p.suffix.lower() in exts and not p.name.startswith(".")]
    items.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return jsonify([{"name": p.name, "size": p.stat().st_size, "mtime": int(p.stat().st_mtime)} for p in items])


@app.post("/api/upload/<kind>")
def upload(kind):
    """Nhận thẳng nội dung tệp (không giới hạn dung lượng). Tên tệp ở ?name=. Trả về tên đã lưu."""
    _writable(kind)
    name = request.args.get("name", "")
    if not name or Path(name).suffix.lower() not in KINDS[kind][1]:
        abort(400, "Định dạng tệp không được hỗ trợ")
    dest = _unique(kind, name) if request.args.get("keep") else file_in(kind, name)
    tmp = dest.with_name(dest.name + ".part")
    with open(tmp, "wb") as f:
        shutil.copyfileobj(request.stream, f, 1024 * 1024)
    tmp.replace(dest)
    return jsonify(name=dest.name, size=dest.stat().st_size)


@app.get("/api/files/<kind>/<path:name>")
def get_file(kind, name):
    try:
        p = file_in(_kind(kind), name)
    except ValueError:
        abort(400)
    if not p.is_file():
        abort(404)
    return send_file(p, conditional=True, max_age=0)  # conditional → hỗ trợ tua video (Range)


@app.delete("/api/files/<kind>/<path:name>")
def delete_file(kind, name):
    p = file_in(_writable(kind), name)
    p.unlink(missing_ok=True)
    return jsonify(ok=True)


@app.get("/api/probe/<kind>/<path:name>")
def probe_file(kind, name):
    p = file_in(_kind(kind), name)
    if not p.is_file():
        abort(404)
    try:
        return jsonify(probe(p))
    except RuntimeError as e:
        abort(400, str(e))


# ----------------------------------------------------------------------------- tác vụ nền
@app.get("/api/jobs/<jid>")
def get_job(jid):
    j = jobs.JOBS.get(jid)
    if not j:
        abort(404)
    return jsonify(j.to_dict(int(request.args.get("since", 0))))


@app.post("/api/jobs/<jid>/cancel")
def cancel_job(jid):
    j = jobs.JOBS.get(jid)
    if j:
        j.cancel()
    return jsonify(ok=True)


@app.get("/api/tts/voices")
def tts_voices():
    return jsonify(voices=tts.voices(), key=tts.key_status(), aiStudio=tts.AI_STUDIO_URL)


@app.post("/api/tts/key")
def tts_key():
    try:
        tts.save_key(str((request.get_json(silent=True) or {}).get("key", "")))
    except ValueError as e:
        abort(400, str(e))
    return jsonify(tts.key_status())


@app.post("/api/tts/open-aistudio")
def tts_open_aistudio():
    webbrowser.open(tts.AI_STUDIO_URL)  # chỉ mở đúng trang lấy khóa
    return jsonify(ok=True)


@app.post("/api/tts")
def tts_generate():
    return jsonify(jobs.start("tts", tts.generate, request.get_json(silent=True) or {}).to_dict())


@app.post("/api/transcribe")
def transcribe_api():
    req = request.get_json(silent=True) or {}
    if req.get("kind") not in KINDS:
        abort(400, "Nguồn không hợp lệ")
    return jsonify(jobs.start("transcribe", transcribe.transcribe, req).to_dict())


@app.post("/api/studio/export")
def studio_export():
    project = request.get_json(silent=True) or {}
    if not (project.get("video") or project.get("overlays") or project.get("audio")):
        abort(400, "Timeline chưa có video hay mẫu nào")
    return jsonify(jobs.start("render", studio_render.export, project).to_dict())


@app.errorhandler(400)
@app.errorhandler(403)
@app.errorhandler(404)
def err(e):
    if request.path.startswith("/api/"):
        return jsonify(error=getattr(e, "description", str(e))), e.code
    return e


# ----------------------------------------------------------------------------- giao diện (thư mục dist)
@app.get("/", defaults={"path": ""})
@app.get("/<path:path>")
def spa(path):
    if path.startswith("api/"):
        abort(404)
    if not (DIST / "index.html").is_file():
        return ("Chưa có giao diện. Hãy chạy Cai_dat.bat một lần (hoặc 'npm run build') rồi mở lại.", 503)
    target = (DIST / path).resolve()
    if path and target.is_file() and DIST.resolve() in target.parents:
        return send_from_directory(DIST, path)
    resp = send_from_directory(DIST, "index.html")
    resp.headers["Cache-Control"] = "no-cache"  # luôn nhận bản giao diện mới nhất sau khi cập nhật
    return resp


def main():
    url = f"http://{HOST}:{PORT}"
    print(f"Kho Reel Mẫu đang chạy tại {url}\nDữ liệu lưu ở: {DATA}\n(Đóng cửa sổ này để tắt app)")
    if not os.environ.get("KHO_NO_BROWSER"):
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    app.run(host=HOST, port=PORT, threaded=True)


if __name__ == "__main__":
    main()
