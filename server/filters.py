"""Bộ lọc màu có sẵn (FFmpeg thuần) + cường độ 0–100%. Lấy từ app edit video cũ."""

# id: chuỗi lọc FFmpeg (tên hiển thị và màu minh hoạ nằm ở src/studio/filters.ts)
PRESETS = {
    "cinematic": "eq=contrast=1.12:saturation=1.05,colorbalance=rs=-0.04:bs=0.06:rh=0.05:bh=-0.04,vignette=PI/6",
    "film": "eq=contrast=1.05:saturation=0.9:gamma=1.04,curves=master='0/0.04 0.5/0.52 1/0.96'",
    "luxury": "eq=contrast=1.1:saturation=0.85:brightness=-0.02,colorbalance=rm=0.05:gm=0.02:bm=-0.05",
    "bright": "eq=brightness=0.06:saturation=1.25:contrast=1.04",
    "teal_orange": "colorbalance=rs=-0.12:gs=-0.02:bs=0.15:rh=0.15:gh=0.02:bh=-0.12,eq=saturation=1.15:contrast=1.06",
    "moody": "eq=brightness=-0.08:contrast=1.2:saturation=0.8,curves=master='0/0 0.3/0.2 1/0.95'",
    "clean_ad": "eq=brightness=0.04:contrast=1.08:saturation=1.1,unsharp=5:5:0.6",
    "warm_skin": "colorbalance=rm=0.06:gm=0.01:bm=-0.04,eq=saturation=1.05:brightness=0.03",
    "bw": "hue=s=0,eq=contrast=1.2",
    "pastel": "eq=brightness=0.07:saturation=0.8:contrast=0.92,colorbalance=rh=0.04:bh=0.06",
    "kodak": "colorbalance=rs=0.05:gs=0.01:bs=-0.06:rm=0.05:bm=-0.05,eq=saturation=1.15:contrast=1.08",
    "bleach": "eq=saturation=0.45:contrast=1.35",
    "fuji": "colorbalance=gs=0.04:bs=0.03:gm=0.03,eq=saturation=0.95:contrast=0.98:brightness=0.02",
    "golden": "colorbalance=rs=0.1:rm=0.08:rh=0.06:bs=-0.1:bm=-0.08,eq=saturation=1.2:brightness=0.03",
    "vintage": "eq=saturation=0.8:contrast=1.1,colorbalance=rs=0.06:bs=-0.06,noise=alls=8:allf=t,vignette=PI/5",
    "neon": "eq=contrast=1.2:saturation=1.5,colorbalance=bs=0.12:rs=0.08:gs=-0.06",
}


def filter_graph(src: str, dst: str, fid: str, strength: float = 100.0) -> str:
    """Đoạn filtergraph đọc nhãn [src] và ghi ra nhãn [dst]; rỗng nếu không dùng bộ lọc."""
    if fid not in PRESETS:
        return ""
    chain = PRESETS[fid]
    k = max(0.0, min(100.0, float(strength))) / 100
    if k <= 0.005:
        return ""
    if k >= 0.995:
        return f"[{src}]{chain}[{dst}]"
    return f"[{src}]format=yuv420p,split[fo_{dst}][ff_{dst}];[ff_{dst}]{chain},format=yuv420p[fg_{dst}];[fg_{dst}][fo_{dst}]blend=all_mode=normal:all_opacity={k:.2f}[{dst}]"
