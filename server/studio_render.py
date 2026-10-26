"""Dựng video từ timeline của Studio: các clip video/ảnh nối tiếp + nền (màu, gradient, ảnh, video) + khung hình."""
import re
from pathlib import Path

from . import filters
from .core.media import probe, run_ffmpeg
from .core.paths import IMAGE_EXT, KINDS, file_in, safe_name

ASPECTS = {"9:16": (1080, 1920), "16:9": (1920, 1080), "1:1": (1080, 1080), "4:5": (1080, 1350)}
FPS = 30
HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


def _num(x, d=0.0):
    try:
        return float(x)
    except (TypeError, ValueError):
        return d


def _color(c, default="#14151B") -> str:
    return "0x" + (c if isinstance(c, str) and HEX.match(c) else default)[1:]


def _src(s) -> Path:
    kind, name = (s or {}).get("kind"), (s or {}).get("name")
    if kind not in KINDS or not name:
        raise RuntimeError("Nguồn tệp không hợp lệ")
    p = file_in(kind, name)
    if not p.is_file():
        raise RuntimeError(f"Không tìm thấy tệp: {name}")
    return p


def _is_image(p: Path) -> bool:
    return p.suffix.lower() in IMAGE_EXT


def _clip_chain(vin: int, i: int, fit: str, W: int, H: int) -> str:
    """Đưa clip về đúng khung W×H. cover = phủ kín, blur = vừa khung + nền mờ, contain = vừa khung (để lộ nền dự án)."""
    if fit == "blur":
        return (f"[{vin}:v]setpts=PTS-STARTPTS,split[s{i}a][s{i}b];"
                f"[s{i}a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=24:3[bg{i}];"
                f"[s{i}b]scale={W}:{H}:force_original_aspect_ratio=decrease[fg{i}];"
                f"[bg{i}][fg{i}]overlay=(W-w)/2:(H-h)/2,setsar=1,fps={FPS},format=yuv420p[v{i}]")
    if fit == "contain":
        return (f"[{vin}:v]setpts=PTS-STARTPTS,scale={W}:{H}:force_original_aspect_ratio=decrease,format=rgba,"
                f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=black@0,setsar=1,fps={FPS}[v{i}]")
    return (f"[{vin}:v]setpts=PTS-STARTPTS,scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
            f"setsar=1,fps={FPS},format=yuv420p[v{i}]")


def _background(bg: dict, W: int, H: int, total: float, nin: int):
    """Trả về (đối số ffmpeg đầu vào, chuỗi lọc tạo luồng [bg])."""
    t = f"{total:.3f}"
    cover = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1,fps={FPS},format=yuv420p"
    kind = (bg or {}).get("type", "color")
    if kind == "gradient":
        c0, c1 = _color(bg.get("color")), _color(bg.get("color2"), "#4D6787")
        args = ["-f", "lavfi", "-t", t, "-i",
                f"gradients=s={W}x{H}:c0={c0}:c1={c1}:x0=0:y0=0:x1=0:y1={H}:r={FPS}:speed=0.00001"]
        return args, f"[{nin}:v]format=yuv420p[bg]"
    if kind in ("image", "video"):
        p = _src(bg.get("src"))
        if _is_image(p):
            args = ["-loop", "1", "-framerate", str(FPS), "-t", t, "-i", str(p)]
        else:
            args = ["-stream_loop", "-1", "-t", t, "-i", str(p)]
        return args, f"[{nin}:v]setpts=PTS-STARTPTS,{cover}[bg]"
    args = ["-f", "lavfi", "-t", t, "-i", f"color=c={_color((bg or {}).get('color'))}:s={W}x{H}:r={FPS}"]
    return args, f"[{nin}:v]format=yuv420p[bg]"


def _corner(pos: str, m: int) -> tuple[str, str]:
    x = f"{m}" if pos in ("tl", "bl") else f"W-w-{m}"
    y = f"{m}" if pos in ("tl", "tr") else f"H-h-{m}"
    return x, y


def render_timeline(job, project: dict, out_file: Path, p0=0.0, p1=100.0) -> float:
    o = project.get("options") or {}
    clips = [c for c in project.get("video") or [] if _num(c.get("out")) - _num(c.get("in")) > 0.03]
    overlays = [v for v in project.get("overlays") or [] if _num(v.get("len")) > 0.05]
    audio = [x for x in project.get("audio") or [] if _num(x.get("out")) - _num(x.get("in")) > 0.05]
    vtotal = sum(_num(c["out"]) - _num(c["in"]) for c in clips)
    total = max([vtotal] + [max(0.0, _num(v.get("start"))) + _num(v.get("len")) for v in overlays]
                + [max(0.0, _num(x.get("start"))) + _num(x["out"]) - _num(x["in"]) for x in audio])
    if total <= 0.03:
        raise RuntimeError("Timeline chưa có video, mẫu hay âm thanh nào")
    W, H = ASPECTS.get(o.get("aspect"), ASPECTS["9:16"])
    fit = o.get("fit") if o.get("fit") in ("cover", "blur", "contain") else "cover"
    args, parts, nin = [], [], 0
    labels = []

    for i, c in enumerate(clips):
        src, a, b = _src(c.get("src")), _num(c["in"]), _num(c["out"])
        d = b - a
        img = _is_image(src)
        if img:
            args += ["-loop", "1", "-framerate", str(FPS), "-t", f"{d:.3f}", "-i", str(src)]
        else:
            args += ["-ss", f"{a:.3f}", "-t", f"{d:.3f}", "-i", str(src)]
        vin = nin
        nin += 1
        parts.append(_clip_chain(vin, i, fit, W, H))
        if not img and probe(src)["has_audio"]:
            ain = vin
        else:
            args += ["-f", "lavfi", "-t", f"{d:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
            ain = nin
            nin += 1
        vol = max(0.0, min(2.0, _num(c.get("vol"), 100) / 100))
        parts.append(f"[{ain}:a]aresample=48000,aformat=channel_layouts=stereo,volume={vol:.3f},"
                     f"apad=whole_dur={d:.3f},atrim=0:{d:.3f},asetpts=PTS-STARTPTS[a{i}]")
        labels.append(f"[v{i}][a{i}]")

    # nền dự án hiện ra khi video "vừa khung + nền riêng", khi video ngắn hơn các lớp mẫu, hoặc khi chưa có video
    need_bg = fit == "contain" or not clips or total > vtotal + 0.01
    if clips:
        parts.append("".join(labels) + f"concat=n={len(clips)}:v=1:a=1[vc][ac]")
    if need_bg:
        bg_args, bg_chain = _background(o.get("bg") or {}, W, H, total, nin)
        args += bg_args
        nin += 1
        parts.append(bg_chain)
        parts.append("[bg][vc]overlay=eof_action=pass,format=yuv420p[vbase]" if clips else "[bg]null[vbase]")
    else:
        parts.append("[vc]format=yuv420p[vbase]")

    # bộ lọc màu áp lên video nền (không áp lên lớp mẫu/chữ, phụ đề, logo)
    prev = "vbase"
    flt = o.get("filter") or {}
    g = filters.filter_graph("vbase", "vfilt", flt.get("id", ""), _num(flt.get("strength"), 100))
    if g:
        parts.append(g)
        prev = "vfilt"

    # lớp mẫu/chữ/phụ đề (WebM nền trong suốt) đặt lên trên, đúng thời điểm
    for k, v in enumerate(overlays):
        p = file_in("overlay", v.get("file") or "")
        if not p.is_file():
            raise RuntimeError("Thiếu tệp lớp mẫu — hãy xuất lại từ trình chỉnh sửa")
        s0 = max(0.0, _num(v.get("start")))
        e0 = s0 + _num(v.get("len"))
        args += (["-c:v", "libvpx-vp9"] if p.suffix.lower() == ".webm" else []) + ["-i", str(p)]
        parts.append(f"[{nin}:v]scale={W}:{H}:force_original_aspect_ratio=decrease,format=rgba,setpts=PTS-STARTPTS+{s0:.3f}/TB[ov{k}]")
        parts.append(f"[{prev}][ov{k}]overlay=(W-w)/2:(H-h)/2:eof_action=pass:enable='between(t,{s0:.3f},{e0:.3f})'[vo{k}]")
        prev = f"vo{k}"
        nin += 1

    # logo và ảnh đại diện tròn (một khung hình, giữ nguyên suốt video)
    br = o.get("brand") or {}
    m = int(W * 0.04)
    if br.get("logo"):
        lw = max(16, int(W * max(3.0, min(60.0, _num(br.get("logoSize"), 18))) / 100))
        args += ["-i", str(_src(br["logo"]))]
        parts.append(f"[{nin}:v]scale={lw}:-2,format=rgba[logo]")
        x, y = _corner(br.get("logoPos", "tl"), m)
        parts.append(f"[{prev}][logo]overlay={x}:{y}[vlogo]")
        prev = "vlogo"
        nin += 1
    if br.get("avatar"):
        sz = max(16, int(W * max(3.0, min(60.0, _num(br.get("avatarSize"), 16))) / 100)) // 2 * 2
        args += ["-i", str(_src(br["avatar"]))]
        parts.append(f"[{nin}:v]scale={sz}:{sz}:force_original_aspect_ratio=increase,crop={sz}:{sz},format=rgba,"
                     f"geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(hypot(X-{sz}/2,Y-{sz}/2),{sz}/2),255,0)'[avt]")
        x, y = _corner(br.get("avatarPos", "br"), m)
        parts.append(f"[{prev}][avt]overlay={x}:{y}[vavt]")
        prev = "vavt"
        nin += 1
    parts.append(f"[{prev}]format=yuv420p[vout]")

    # âm thanh: tiếng gốc của video + nhạc nền + giọng đọc, mỗi clip đặt đúng thời điểm
    if clips:
        parts.append(f"[ac]apad=whole_dur={total:.3f},atrim=0:{total:.3f}[abase]")
    else:
        args += ["-f", "lavfi", "-t", f"{total:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
        parts.append(f"[{nin}:a]aformat=channel_layouts=stereo[abase]")
        nin += 1
    mix = ["[abase]"]
    for j, x in enumerate(audio):
        a0, a1 = _num(x["in"]), _num(x["out"])
        d = a1 - a0
        s0 = max(0.0, _num(x.get("start")))
        if s0 >= total:
            continue
        args += ["-ss", f"{a0:.3f}", "-t", f"{d:.3f}", "-i", str(_src(x.get("src")))]
        fi, fo = min(max(0.0, _num(x.get("fadeIn"))), d), min(max(0.0, _num(x.get("fadeOut"))), d)
        f = f"[{nin}:a]aresample=48000,aformat=channel_layouts=stereo,asetpts=PTS-STARTPTS"
        if fi > 0.01:
            f += f",afade=t=in:st=0:d={fi:.2f}"
        if fo > 0.01:
            f += f",afade=t=out:st={max(0.0, d - fo):.2f}:d={fo:.2f}"
        ms = int(round(s0 * 1000))
        f += f",volume={max(0.0, min(3.0, _num(x.get('vol'), 100) / 100)):.3f},adelay={ms}|{ms}[x{j}]"
        parts.append(f)
        mix.append(f"[x{j}]")
        nin += 1
    if len(mix) > 1:
        parts.append("".join(mix) + f"amix=inputs={len(mix)}:normalize=0:duration=first:dropout_transition=0,alimiter=limit=0.97[aout]")
    else:
        parts.append("[abase]alimiter=limit=0.97[aout]")

    gfile = out_file.with_suffix(".filtergraph.txt")
    gfile.write_text(";".join(parts), encoding="utf-8")
    try:
        run_ffmpeg(job, [*args, "-/filter_complex", str(gfile), "-map", "[vout]", "-map", "[aout]", "-t", f"{total:.3f}",
                         "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
                         "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out_file)],
                   total=total, p0=p0, p1=p1)
    finally:
        gfile.unlink(missing_ok=True)
    return total


def export(job, project: dict) -> dict:
    name = safe_name((project.get("name") or "").strip()) or "video"
    dest = file_in("export", name + ".mp4")
    i = 1
    while dest.exists():
        dest = file_in("export", f"{name}_{i}.mp4")
        i += 1
    job.set(1, "Dựng video")
    total = render_timeline(job, project, dest, 1, 99)
    job.set(100, "Hoàn tất")
    return {"file": dest.name, "duration": round(total, 2)}
