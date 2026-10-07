"""签筒 3D 模型用的贴图（程序化生成，可复现）：

  qt-cup.webp     筒身颜色：朱漆底 + 描金（上下回纹边、正面开光「灵签」、两侧祥云、背面「心诚则灵」）
  qt-cup-orm.webp 筒身材质：G=粗糙度、B=金属度（描金处为金属）
  qt-stick.webp   竹签：竹纤维 + 朱漆签头 + 金线

贴图的横向绕筒身一周（中心 = 正面），纵向自下而上（图片最上一行 = 筒口）。
用法：python scripts/gen-qiantong.py [--preview 目录]
"""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module

art = import_module("gen-art")  # 复用噪声工具
spectral, smoothstep = art.spectral, art.smoothstep

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "art"
FONT = ROOT / "fonts-src" / "MaShanZheng-Regular.ttf"

W, H = 2048, 1024
SS = 2  # 描金图案先画在 2 倍画布上再缩小


def lacquer():
    low = spectral((H, W), 3.2, 501)
    brush = spectral((H, W), 1.6, 502, aniso=(1.0, 9.0))  # 横向刷痕
    fine = spectral((H, W), 0.4, 503)
    base = np.array([0.56, 0.11, 0.075], np.float32)
    rgb = base[None, None, :] * (1 + 0.05 * low[..., None] + 0.025 * brush[..., None] + 0.012 * fine[..., None])
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]  # 0 = 筒口，1 = 筒底
    # 筒底与筒口更暗（手摸、磨损处露出底层黑漆的意思）
    dark = 0.28 * smoothstep(0.9, 1.0, y) + 0.18 * (1 - smoothstep(0.0, 0.04, y))
    wear = smoothstep(0.6, 2.2, spectral((H, W), 2.2, 504))[..., None] * smoothstep(0.82, 0.98, y)
    rgb = rgb * (1 - dark) * (1 - 0.45 * wear)
    rough = 0.3 + 0.05 * np.tanh(low) + 0.03 * np.tanh(brush)
    return np.clip(rgb, 0, 1), rough


def meander_band(d: ImageDraw.ImageDraw, y0: float, h: float, lw: int):
    """回纹带：一排方回旋纹，正反交替。"""
    s = h * 0.62
    pad = (h - s) / 2
    step = s * 1.3
    n = int(W * SS / step) + 1
    for i in range(n):
        x0 = i * step + (step - s) / 2
        flip = i % 2 == 1
        pts = [(0, 1), (0, 0), (1, 0), (1, 0.78), (0.24, 0.78), (0.24, 0.24), (0.62, 0.24), (0.62, 0.52)]
        coords = []
        for px, py in pts:
            if flip:
                px = 1 - px
            coords.append((x0 + px * s, y0 + pad + py * s))
        d.line(coords, fill=255, width=lw, joint="curve")
    d.line([(0, y0), (W * SS, y0)], fill=255, width=lw + 2)
    d.line([(0, y0 + h), (W * SS, y0 + h)], fill=255, width=lw + 2)


def curl(d: ImageDraw.ImageDraw, cx, cy, r, turns=1.15, start=0.0, cw=True, lw=10):
    pts = []
    steps = 90
    for i in range(steps + 1):
        t = i / steps
        a = start + (1 if cw else -1) * t * turns * 2 * math.pi
        rr = r * (1 - 0.78 * t)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    d.line(pts, fill=255, width=lw, joint="curve")


def xiangyun(d: ImageDraw.ImageDraw, cx, cy, k=1.0, lw=10):
    """祥云：一大两小三个云头 + 一道云尾。"""
    curl(d, cx, cy, 64 * k, 1.1, math.pi * 0.95, True, lw)
    curl(d, cx + 96 * k, cy + 22 * k, 40 * k, 1.05, math.pi * 0.2, False, lw)
    curl(d, cx - 88 * k, cy + 26 * k, 34 * k, 1.0, math.pi * 0.85, True, lw)
    base = []
    for i in range(61):
        t = i / 60
        x = cx - 130 * k + t * 330 * k
        y = cy + 66 * k - 10 * k * math.sin(t * math.pi * 2.2) - (t**3) * 40 * k
        base.append((x, y))
    d.line(base, fill=255, width=lw, joint="curve")


def gold_pattern():
    img = Image.new("L", (W * SS, H * SS), 0)
    d = ImageDraw.Draw(img)
    lw = 7
    # 上下回纹边
    meander_band(d, 40 * SS, 64 * SS, lw)
    meander_band(d, (H - 118) * SS, 60 * SS, lw)
    # 正面开光：圆角长框，双线
    cx = W * SS // 2
    fw, top, bot = 330 * SS, 196 * SS, 850 * SS
    d.rounded_rectangle([cx - fw // 2, top, cx + fw // 2, bot], radius=46 * SS, outline=255, width=9 * SS // 2)
    d.rounded_rectangle([cx - fw // 2 + 18 * SS, top + 18 * SS, cx + fw // 2 - 18 * SS, bot - 18 * SS], radius=32 * SS, outline=255, width=2 * SS)
    font = ImageFont.truetype(str(FONT), 236 * SS)
    for i, ch in enumerate("灵签"):
        bbox = d.textbbox((0, 0), ch, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        d.text((cx - tw / 2 - bbox[0], top + (64 + i * 300) * SS - bbox[1]), ch, font=font, fill=255)
    # 两侧祥云
    for x in (W * SS * 0.25, W * SS * 0.75):
        xiangyun(d, x - 30 * SS, 430 * SS, k=1.0 * SS, lw=6 * SS)
        xiangyun(d, x + 60 * SS, 640 * SS, k=0.7 * SS, lw=5 * SS)
    # 背面竖排「心诚则灵」（跨在贴图左右接缝两边，各写一半会被切开，所以写在 x=0 处的两侧）
    small = ImageFont.truetype(str(FONT), 92 * SS)
    for i, ch in enumerate("心诚则灵"):
        bbox = d.textbbox((0, 0), ch, font=small)
        tw = bbox[2] - bbox[0]
        y = (250 + i * 118) * SS - bbox[1]
        for x in (-tw / 2 - bbox[0], W * SS - tw / 2 - bbox[0]):
            d.text((x, y), ch, font=small, fill=255)
    m = np.asarray(img, np.float32) / 255.0
    m = cv2.resize(m, (W, H), interpolation=cv2.INTER_AREA)
    return m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", default=None)
    args = ap.parse_args()

    rgb, rough = lacquer()
    g = gold_pattern()
    # 描金有磨损：少量斑驳缺金
    worn = smoothstep(1.3, 2.4, spectral((H, W), 1.2, 505))
    ga = np.clip(g * (1 - 0.7 * worn), 0, 1)
    gold = np.array([0.83, 0.64, 0.3], np.float32)
    gvar = 1 + 0.07 * spectral((H, W), 2.0, 506)[..., None]
    col = rgb * (1 - ga[..., None]) + np.clip(gold[None, None, :] * gvar, 0, 1) * ga[..., None]
    rough_map = rough * (1 - ga) + (0.24 + 0.04 * spectral((H, W), 1.5, 507)) * ga
    metal = ga
    orm = np.dstack([np.ones_like(rough_map), np.clip(rough_map, 0.05, 1), metal])
    art.save_rgba(OUT / "qt-cup.webp", col, quality=88)
    art.save_rgba(OUT / "qt-cup-orm.webp", orm, quality=90)

    # 竹签：64×1024，纵向纤维，签头朱漆
    SW, SH = 64, 1024
    fib = spectral((SH, SW), 1.2, 601, aniso=(12.0, 1.0))
    low = spectral((SH, SW), 3.0, 602)
    bamboo = np.array([0.86, 0.72, 0.47], np.float32)
    s = bamboo[None, None, :] * (1 + 0.06 * fib[..., None] + 0.04 * low[..., None])
    x = np.linspace(-1, 1, SW, dtype=np.float32)[None, :, None]
    s *= 1 - 0.18 * smoothstep(0.7, 1.0, np.abs(x))  # 边缘略深
    y = np.linspace(0, 1, SH, dtype=np.float32)[:, None, None]  # 0 = 签头
    s *= 1 - 0.12 * smoothstep(0.6, 1.0, y)  # 签尾手握处略深
    red = np.array([0.66, 0.12, 0.08], np.float32) * (1 + 0.05 * low[..., None])
    tip = 1 - smoothstep(0.135, 0.145, y)
    s = s * (1 - tip) + red * tip
    goldline = np.exp(-(((y - 0.152) / 0.004) ** 2))
    s = s * (1 - goldline) + np.array([0.85, 0.66, 0.3], np.float32) * goldline
    art.save_rgba(OUT / "qt-stick.webp", np.clip(s, 0, 1), quality=88)

    if args.preview:
        p = Path(args.preview)
        p.mkdir(parents=True, exist_ok=True)
        Image.fromarray(np.clip(col * 255, 0, 255).astype(np.uint8)).resize((1024, 512)).save(p / "qt-cup.png")


if __name__ == "__main__":
    main()
