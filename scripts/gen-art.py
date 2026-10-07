"""程序化生成网站美术素材（可复现，改参数后重跑即可）：

  paper.webp        宣纸纹理（无缝平铺）：云絮状浓淡 + 纤维 + 细颗粒
  gold.webp         洒金（无缝平铺，透明）：不规则金箔碎片
  ink-grain.webp    墨色飞白遮罩（CSS mask 用）：让毛笔字有干笔与纸纹
  seal-grain.webp   印泥遮罩：印章的斑驳与缺损
  sun.webp          朱日：带纸纹的红日
  hero-*.webp/avif  水墨浅绛山水（远、中、近三层，桌面横版与手机竖版各一套）

用法：python scripts/gen-art.py [paper gold grain sun hero ...] [--preview 目录]
需要：pip install numpy scipy opencv-python pillow
"""
from __future__ import annotations

import argparse
import math
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter1d

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "art"


# ───────────────────────── 噪声工具 ─────────────────────────
def spectral(shape, beta=2.0, seed=0, aniso=(1.0, 1.0), hi=None):
    """周期性噪声，功率谱 ~ 1/f^beta；aniso 放大某一轴的频率即压低该轴的变化（拉长纹理）。"""
    rng = np.random.default_rng(seed)
    h, w = shape
    F = np.fft.rfft2(rng.standard_normal((h, w)))
    fy = np.fft.fftfreq(h)[:, None] * aniso[0]
    fx = np.fft.rfftfreq(w)[None, :] * aniso[1]
    f = np.sqrt(fx * fx + fy * fy)
    f[0, 0] = 1.0
    amp = f ** (-beta / 2.0)
    if hi:
        amp = amp * np.exp(-((f / hi) ** 2))
    amp[0, 0] = 0.0
    out = np.fft.irfft2(F * amp, s=(h, w))
    out -= out.mean()
    out /= out.std() + 1e-12
    return out.astype(np.float32)


def noise1d(n, beta=2.0, seed=0, hi=None):
    rng = np.random.default_rng(seed)
    F = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n)
    f[0] = 1.0
    amp = f ** (-beta / 2.0)
    if hi:
        amp = amp * np.exp(-((f / hi) ** 2))
    amp[0] = 0.0
    out = np.fft.irfft(F * amp, n=n)
    out -= out.mean()
    out /= out.std() + 1e-12
    return out.astype(np.float32)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def blur_wrap(a, sigma):
    pad = int(sigma * 4) + 2
    p = np.pad(a, [(pad, pad), (pad, pad)] + [(0, 0)] * (a.ndim - 2), mode="wrap")
    b = cv2.GaussianBlur(p, (0, 0), sigma)
    return b[pad:-pad, pad:-pad]


def save_rgba(path: Path, rgb, alpha=None, quality=82, avif=False, lossless=False, avif_q=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    rgb8 = np.clip(rgb * 255 + 0.5, 0, 255).astype(np.uint8)
    if alpha is None:
        img = Image.fromarray(rgb8, "RGB")
    else:
        a8 = np.clip(alpha * 255 + 0.5, 0, 255).astype(np.uint8)
        img = Image.fromarray(np.dstack([rgb8, a8]), "RGBA")
    img.save(path, "WEBP", quality=quality, method=6, lossless=lossless, exact=False)
    msg = f"{path.relative_to(ROOT)}  {img.size[0]}x{img.size[1]}  {path.stat().st_size / 1024:.0f} KB"
    if avif:
        ap = path.with_suffix(".avif")
        img.save(ap, "AVIF", quality=avif_q or max(40, quality - 22), speed=4)
        msg += f"  | avif {ap.stat().st_size / 1024:.0f} KB"
    print(msg)
    return img


# ───────────────────────── 宣纸 ─────────────────────────
PAPER_BASE = np.array([0.957, 0.933, 0.880], np.float32)  # #f4eee0


def fibers(S, seed, n_light=1300, n_dark=380, ss=2):
    """纤维：随机游走的细线，画在 2 倍画布上（含上下左右的环绕副本），再盒式缩小得到抗锯齿且无缝。"""
    from PIL import ImageDraw

    rng = np.random.default_rng(seed)
    big = S * ss
    out = []
    for n, (l0, l1), (w0, w1), (v0, v1) in (
        (n_light, (30, 260), (0.7, 2.0), (110, 230)),
        (n_dark, (10, 80), (0.5, 1.2), (80, 190)),
    ):
        img = Image.new("L", (big, big), 0)
        d = ImageDraw.Draw(img)
        for _ in range(n):
            length = rng.uniform(l0, l1) * ss
            width = max(1, int(round(rng.uniform(w0, w1) * ss)))
            val = int(rng.uniform(v0, v1))
            x, y = rng.uniform(0, big, 2)
            ang = rng.uniform(0, 2 * np.pi)
            curv = rng.normal(0, 0.05)
            steps = max(4, int(length / (5 * ss)))
            pts = [(x, y)]
            for _ in range(steps):
                ang += curv + rng.normal(0, 0.1)
                x += math.cos(ang) * length / steps
                y += math.sin(ang) * length / steps
                pts.append((x, y))
            for ox in (-big, 0, big):
                for oy in (-big, 0, big):
                    d.line([(px + ox, py + oy) for px, py in pts], fill=val, width=width, joint="curve")
        arr = np.asarray(img.resize((S, S), Image.BOX), np.float32) / 255.0
        out.append(arr)
    light, dark = out
    return blur_wrap(light, 0.7), blur_wrap(dark, 0.45)


def paper(S=1024, seed=7):
    low = spectral((S, S), 3.3, seed)
    mid = spectral((S, S), 1.9, seed + 1)
    fine = spectral((S, S), 0.25, seed + 2)
    warm = spectral((S, S), 3.5, seed + 3)
    lum = 1.0 + 0.017 * low + 0.0075 * mid + 0.009 * fine
    rgb = PAPER_BASE[None, None, :] * lum[..., None]
    rgb[..., 0] *= 1.0 + 0.005 * warm
    rgb[..., 2] *= 1.0 - 0.011 * warm
    light, dark = fibers(S, seed + 4)
    rgb = rgb + (1.0 - rgb) * (light[..., None] * 0.62)
    rgb = rgb * (1.0 - dark[..., None] * np.array([0.13, 0.15, 0.19], np.float32))
    # 杂质小点：极少、极淡
    rng = np.random.default_rng(seed + 5)
    specks = np.zeros((S, S), np.float32)
    for _ in range(70):
        x, y = rng.integers(0, S, 2)
        r = rng.uniform(0.5, 1.4)
        cv2.circle(specks, (int(x), int(y)), int(math.ceil(r)), float(rng.uniform(0.15, 0.45)), -1, cv2.LINE_AA)
    specks = blur_wrap(specks, 0.6)
    rgb = rgb * (1.0 - specks[..., None] * np.array([0.25, 0.28, 0.32], np.float32))
    return np.clip(rgb, 0, 1)


# ───────────────────────── 洒金 ─────────────────────────
GOLDS = [(0.86, 0.69, 0.36), (0.93, 0.79, 0.47), (0.78, 0.6, 0.29), (0.97, 0.87, 0.6)]


def gold_flecks(S=1024, seed=11, n_big=22, n_small=260, ss=4):
    rng = np.random.default_rng(seed)
    big = S * ss
    col = np.zeros((big, big, 3), np.float32)
    alp = np.zeros((big, big), np.float32)

    def flake(cx, cy, r, alpha, flat):
        k = int(rng.integers(5, 10))
        angs = np.sort(rng.uniform(0, 2 * np.pi, k))
        rad = r * rng.uniform(0.35, 1.0, k)
        rot = rng.uniform(0, np.pi)
        pts = []
        for a, rr in zip(angs, rad):
            px, py = rr * math.cos(a), rr * math.sin(a) * flat
            pts.append((px * math.cos(rot) - py * math.sin(rot), px * math.sin(rot) + py * math.cos(rot)))
        g = np.array(GOLDS[int(rng.integers(0, len(GOLDS)))], np.float32) * rng.uniform(0.94, 1.05)
        pad = int(r) + 3
        size = 2 * pad
        local = np.array([[px + pad, py + pad] for px, py in pts], np.int32)
        m = np.zeros((size, size), np.uint8)
        cv2.fillPoly(m, [local], 255, cv2.LINE_AA)
        mf = m.astype(np.float32) / 255.0 * alpha
        # 金箔有起伏：一侧受光发亮、另一侧偏暗
        la = rng.uniform(0, 2 * np.pi)
        gy, gx = np.mgrid[0:size, 0:size].astype(np.float32) - pad
        shade = np.clip(1.0 + 0.32 * (gx * math.cos(la) + gy * math.sin(la)) / max(r, 1), 0.7, 1.28)
        for ox in (-big, 0, big):
            for oy in (-big, 0, big):
                X0, Y0 = int(cx) - pad + ox, int(cy) - pad + oy
                xa, ya, xb, yb = max(0, X0), max(0, Y0), min(big, X0 + size), min(big, Y0 + size)
                if xa >= xb or ya >= yb:
                    continue
                sub = mf[ya - Y0 : yb - Y0, xa - X0 : xb - X0]
                sh = shade[ya - Y0 : yb - Y0, xa - X0 : xb - X0]
                C = col[ya:yb, xa:xb]
                C[:] = C * (1 - sub[..., None]) + np.clip(g[None, None, :] * sh[..., None], 0, 1) * sub[..., None]
                np.maximum(alp[ya:yb, xa:xb], sub, out=alp[ya:yb, xa:xb])

    for _ in range(n_big):
        flake(rng.uniform(0, big), rng.uniform(0, big), rng.uniform(2.5, 7.5) * ss, rng.uniform(0.55, 0.9), rng.uniform(0.45, 1))
    for _ in range(n_small):
        flake(rng.uniform(0, big), rng.uniform(0, big), rng.uniform(0.5, 1.8) * ss, rng.uniform(0.35, 0.8), rng.uniform(0.5, 1))
    # 4x 盒式缩小（先预乘）
    pre = col * alp[..., None]
    pre = pre.reshape(S, ss, S, ss, 3).mean(axis=(1, 3))
    a = alp.reshape(S, ss, S, ss).mean(axis=(1, 3))
    rgb = np.where(a[..., None] > 1e-4, pre / np.maximum(a[..., None], 1e-4), 0)
    return rgb, a


# ───────────────────────── 飞白 / 印泥遮罩 ─────────────────────────
def ink_grain(S=512, seed=21):
    fine = spectral((S, S), 0.5, seed)
    streak = spectral((S, S), 2.0, seed + 1, aniso=(1.0, 7.0))  # 横向拉长的干笔丝
    patch = spectral((S, S), 3.0, seed + 2)
    dens = spectral((S, S), 2.6, seed + 3)
    holes = smoothstep(1.7, 2.8, fine)
    streaks = smoothstep(0.8, 2.1, streak) * smoothstep(-0.1, 1.2, patch)
    a = 1.0 - 0.8 * holes - 0.6 * streaks
    a *= 0.9 + 0.1 * np.tanh(dens)
    return np.clip(a, 0.12, 1.0)


def seal_grain(S=512, seed=31):
    fine = spectral((S, S), 0.7, seed)
    mid = spectral((S, S), 1.8, seed + 1)
    low = spectral((S, S), 3.2, seed + 2)
    holes = smoothstep(1.2, 2.3, fine + 0.35 * mid)
    blotch = smoothstep(1.4, 2.4, mid) * 0.6
    a = 1.0 - 0.9 * holes - blotch
    a *= 0.86 + 0.14 * np.tanh(low)
    return np.clip(a, 0.0, 1.0)


# ───────────────────────── 朱日 ─────────────────────────
def sun(S=512, seed=41):
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    c = S / 2
    r = np.hypot(xx - c, yy - c) / (S * 0.42)
    edge_noise = spectral((S, S), 2.2, seed) * 0.012
    alpha = 1.0 - smoothstep(0.985, 1.012, r + edge_noise)
    mott = spectral((S, S), 2.4, seed + 1)
    fine = spectral((S, S), 0.6, seed + 2)
    base = np.array([0.79, 0.25, 0.17], np.float32)
    rgb = base[None, None, :] * (1.0 + 0.05 * mott[..., None] + 0.02 * fine[..., None])
    # 边缘颜料堆积略深，中心略亮
    rgb *= (1.0 - 0.09 * smoothstep(0.6, 1.0, r))[..., None]
    rgb *= (1.0 + 0.05 * (1 - smoothstep(0.0, 0.7, r)))[..., None]
    alpha *= 0.94 + 0.06 * np.tanh(mott)
    return np.clip(rgb, 0, 1), np.clip(alpha, 0, 1)


# ───────────────────────── 云雾（横向无缝，做流动动画） ─────────────────────────
def mist_tex(W=2048, H=420, seed=61):
    n1 = spectral((H, W), 3.0, seed, aniso=(1.0, 0.55))
    n2 = spectral((H, W), 1.7, seed + 1)
    Y = np.linspace(-1, 1, H, dtype=np.float32)[:, None]
    env = np.exp(-((Y / 0.42) ** 2))
    dens = smoothstep(-0.5, 1.7, n1 + 0.3 * n2) * env
    a = np.clip(dens * 0.92, 0, 1)
    rgb = np.broadcast_to(np.array([0.972, 0.958, 0.925], np.float32), (H, W, 3)).copy()
    return rgb, a


# ───────────────────────── 山水 ─────────────────────────
@dataclass
class Peak:
    cx: float
    base: float  # 山脚（高度为 0 处）的 y
    h: float
    w: float
    sharp: float = 1.6  # 越大越像平顶陡崖，越小越尖
    skew: float = 0.0  # >0 左坡更缓
    rough: float = 0.05
    shoulders: list = field(default_factory=list)  # [(偏移, 相对高, 宽, 尖度)]
    moss: float = 1.0  # 苔点密度
    pines: int = 0  # 山顶松树数量
    seed: int = 0


@dataclass
class Style:
    ink: tuple  # 墨色
    wash_top: tuple  # 山头淡彩（花青）
    wash_low: tuple  # 山脚淡彩（赭石）
    edge_a: float  # 轮廓线浓度
    edge_w: float  # 轮廓线宽（px）
    body_a: float  # 山体墨浓度
    fall: float  # 墨色往下淡出的长度（相对山高）
    tex: float  # 皴擦纹理强度 0..1
    tex_scale: float  # 纹理粗细
    wash_a: float  # 淡彩浓度
    occl: float  # 前山遮住后山的程度
    moss_r: float  # 苔点大小
    bleed: float  # 洇开（位移噪声幅度 px）
    blur: float
    cun: float = 0.0  # 披麻皴笔数（相对山宽）
    cun_w: float = 1.0  # 皴笔粗细（px）
    trees: bool = False  # 山脊上是否点远树


def peak_height(xs, p: Peak):
    t = xs - p.cx
    wl, wr = p.w * (1 + p.skew), p.w * (1 - p.skew)
    u = np.where(t < 0, t / wl, t / wr)
    prof = np.exp(-np.abs(u) ** p.sharp)
    for off, rh, ww, sh in p.shoulders:
        prof = np.maximum(prof, rh * np.exp(-np.abs((t - off * p.w) / (ww * p.w)) ** sh))
    n = len(xs)
    big = noise1d(n, 2.2, p.seed, hi=0.02)
    small = noise1d(n, 1.2, p.seed + 1, hi=0.2)
    rough = p.rough * p.h * (0.75 * big + 0.25 * small) * np.sqrt(prof)
    return np.maximum(p.h * prof + rough, 0)


class Layer:
    def __init__(self, W, H):
        self.W, self.H = W, H
        self.pre = np.zeros((H, W, 3), np.float32)  # 预乘颜色
        self.a = np.zeros((H, W), np.float32)
        self.dots = np.zeros((H * 2, W * 2), np.uint8)  # 苔点、松树（2 倍画布）

    def over(self, rgb, a, occlusion=None, box=None):
        y0, y1, x0, x1 = box
        P, A = self.pre[y0:y1, x0:x1], self.a[y0:y1, x0:x1]
        if occlusion is not None:
            keep = 1.0 - occlusion
            P *= keep[..., None]
            A *= keep
        P *= (1 - a)[..., None]
        P += rgb * a[..., None]
        A *= 1 - a
        A += a


def render_peak(layer: Layer, p: Peak, st: Style, aniso_noise, rng):
    W, H = layer.W, layer.H
    hgt_all = peak_height(np.arange(W, dtype=np.float32), p)
    idx = np.where(hgt_all > 0.6)[0]
    if len(idx) == 0:
        return
    x0, x1 = max(0, int(idx[0]) - 4), min(W, int(idx[-1]) + 5)
    xs = np.arange(x0, x1, dtype=np.float32)
    hgt = hgt_all[x0:x1]
    valid = hgt > 0.6
    top = p.base - hgt
    foot = 0.22 * p.h + 24  # 山脚以下多长一段淡出
    y0 = max(0, int(top[valid].min()) - 4)
    y1 = min(H, int(p.base + foot * 3.5))
    if y1 <= y0:
        return
    Y = np.arange(y0, y1, dtype=np.float32)[:, None]
    d = Y - top[None, :]
    dpos = np.maximum(d, 0)
    # 山的两侧随高度渐隐、山脚以下淡出：不留竖直或水平的切边
    lat = smoothstep(0.0, 0.22 * p.h, hgt)[None, :]
    below = np.exp(-np.maximum(Y - p.base, 0) / foot)
    inside = np.clip(d + 0.5, 0, 1) * valid[None, :] * lat * below

    # 轮廓：线宽随笔压起伏，偶尔断笔（干笔）；细而浓的笔芯 + 往里化开的墨晕
    n = len(xs)
    press = noise1d(n, 1.6, p.seed + 7, hi=0.05)
    ew = st.edge_w * (0.55 + 0.9 * smoothstep(-1.6, 1.6, press))
    gaps = 0.2 + 0.8 * smoothstep(-1.3, -0.4, noise1d(n, 1.8, p.seed + 8, hi=0.04))
    edge = st.edge_a * (0.65 * np.exp(-((dpos / (ew[None, :] * 0.45)) ** 2)) + 0.45 * np.exp(-dpos / (ew[None, :] * 2.2))) * gaps[None, :]

    # 山体：自山脊往下淡入云雾
    L = st.fall * p.h
    body = np.exp(-dpos / L)

    # 皴擦：沿坡向拉长的纹理，山脊处顺着轮廓、往下渐渐变竖
    s = np.gradient(gaussian_filter1d(top, 6 + p.w * 0.04))
    k = s / (s * s + 0.3)
    Hn, Wn = aniso_noise.shape
    sc = st.tex_scale
    mx = ((xs[None, :] - k[None, :] * dpos * 0.85) / sc + p.seed * 37.0) % Wn
    my = (dpos / sc + p.seed * 11.0) % Hn
    T = cv2.remap(aniso_noise, mx.astype(np.float32), my.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
    strokes = smoothstep(-0.2, 1.6, T)  # 0..1，偏稀疏的笔触
    # 纹理只在山脊下方一段里明显
    tex_zone = np.exp(-dpos / (L * 1.6))
    ink_body = st.body_a * body * (1 - st.tex + st.tex * (0.35 + 1.1 * strokes)) * (0.55 + 0.45 * tex_zone)

    ink_a = np.clip(edge + ink_body, 0, 1) * inside
    wash = st.wash_a * np.exp(-dpos / (L * 2.2)) * inside
    # 淡彩：上段花青、下段赭石
    tmix = smoothstep(0.0, 1.0, dpos / (p.h * 0.7 + 1))[..., None]
    wash_rgb = np.array(st.wash_top, np.float32)[None, None, :] * (1 - tmix) + np.array(st.wash_low, np.float32)[None, None, :] * tmix
    ink_rgb = np.broadcast_to(np.array(st.ink, np.float32)[None, None, :], ink_a.shape + (3,))
    # 合成：淡彩在下、墨在上
    a_tot = 1 - (1 - wash) * (1 - ink_a)
    rgb = (wash_rgb * wash[..., None] * (1 - ink_a[..., None]) + ink_rgb * ink_a[..., None]) / np.maximum(a_tot[..., None], 1e-5)
    layer.over(rgb, a_tot, occlusion=inside * st.occl, box=(y0, y1, x0, x1))

    # 披麻皴：从山脊顺坡往下的长短笔触，越往下越淡
    if st.cun > 0:
        cnt = int(st.cun * p.w * 0.09)
        weights = (hgt / max(hgt.max(), 1)) ** 1.2 * valid
        if weights.sum() > 0:
            weights = weights / weights.sum()
            for c in rng.choice(n, size=cnt, p=weights):
                x = float(xs[c])
                y = float(top[c]) + rng.uniform(1, 6) + (rng.uniform(0, 0.35) * p.h if rng.random() < 0.45 else 0)
                kk = float(k[c])
                length = p.h * rng.uniform(0.08, 0.26)
                steps = 10
                wiggle = rng.uniform(0.4, 1.6)
                val0 = rng.uniform(120, 215)
                wd = st.cun_w * rng.uniform(0.7, 1.4)
                prev = None
                for i in range(steps + 1):
                    t = i / steps
                    yy = y + length * t
                    xx = x + kk * length * t * 0.9 + math.sin(t * 5 + c) * wiggle
                    pt = (int(round(xx * 2)), int(round(yy * 2)))
                    if prev is not None:
                        v = int(val0 * (1 - 0.85 * t))
                        wpx = max(1, int(round(wd * 2 * (1 - 0.6 * t))))
                        cv2.line(layer.dots, prev, pt, v, wpx, cv2.LINE_AA)
                    prev = pt

    # 苔点：山顶与缓坡上的浓墨点
    if p.moss > 0:
        cnt = int(p.moss * p.w * 0.22)
        weights = (hgt / max(hgt.max(), 1)) ** 2.2 * valid / (1 + np.abs(s) * 1.6)
        if weights.sum() > 0:
            weights = weights / weights.sum()
            cols = rng.choice(n, size=cnt, p=weights)
            for c in cols:
                x = xs[c] + rng.normal(0, 2)
                y = top[c] + abs(rng.normal(0, 2.2 + st.moss_r))
                r = st.moss_r * rng.uniform(0.6, 1.5)
                val = int(rng.uniform(150, 245))
                ax = (int(round(x * 2)), int(round(y * 2)))
                if st.trees and rng.random() < 0.55:
                    # 远树：一笔竖点
                    tall = r * rng.uniform(2.2, 4.0)
                    axes = (max(1, int(r * 2 * 0.55)), max(1, int(tall * 2)))
                    ax = (ax[0], int(ax[1] - tall * 2 * 0.8))
                    cv2.ellipse(layer.dots, ax, axes, float(rng.uniform(-8, 8)), 0, 360, val, -1, cv2.LINE_AA)
                else:
                    axes = (max(1, int(r * 2 * rng.uniform(1.0, 1.9))), max(1, int(r * 2 * rng.uniform(0.55, 0.95))))
                    cv2.ellipse(layer.dots, ax, axes, float(rng.uniform(-25, 25)), 0, 360, val, -1, cv2.LINE_AA)
    for i in range(p.pines):
        # 松树长在山顶附近较平的地方
        cand = np.where(valid & (np.abs(s) < 0.9) & (hgt > hgt.max() * 0.72))[0]
        if len(cand) == 0:
            break
        c = int(rng.choice(cand))
        draw_pine(layer.dots, xs[c], top[c] + 2, st.moss_r * rng.uniform(15, 24), rng)


def draw_pine(canvas, x, y, h, rng):
    """画在 2 倍画布上的写意松树：弯曲树干 + 几簇横向松针。"""
    X, Y, Hh = x * 2, y * 2, h * 2
    lean = rng.uniform(-0.25, 0.25)
    pts = []
    for i in range(9):
        t = i / 8
        pts.append((X + lean * Hh * t + math.sin(t * 3.1 + rng.uniform(0, 1)) * Hh * 0.04, Y - Hh * t))
    trunk_w = max(2, int(Hh * 0.045))
    for (a, b) in zip(pts, pts[1:]):
        cv2.line(canvas, (int(a[0]), int(a[1])), (int(b[0]), int(b[1])), 235, trunk_w, cv2.LINE_AA)
    # 松针簇：自下而上渐小，左右交错
    tiers = int(rng.integers(4, 7))
    for j in range(tiers):
        t = 0.35 + 0.65 * j / max(1, tiers - 1)
        cx = X + lean * Hh * t
        cy = Y - Hh * t
        side = -1 if j % 2 else 1
        wdt = Hh * (0.42 - 0.22 * t) * rng.uniform(0.8, 1.2)
        hgt = Hh * 0.075 * rng.uniform(0.8, 1.2)
        ox = side * wdt * rng.uniform(0.15, 0.45)
        cv2.ellipse(canvas, (int(cx + ox), int(cy)), (max(2, int(wdt)), max(2, int(hgt))), float(rng.uniform(-8, 8)), 0, 360, int(rng.uniform(205, 250)), -1, cv2.LINE_AA)
        # 针叶的锯齿边：在椭圆上下缘点一些短竖笔
        for _ in range(int(wdt / 3)):
            px = cx + ox + rng.uniform(-wdt, wdt) * 0.95
            py = cy + rng.choice([-1, 1]) * hgt * rng.uniform(0.6, 1.1)
            cv2.line(canvas, (int(px), int(py)), (int(px + rng.uniform(-2, 2)), int(py + rng.choice([-1, 1]) * hgt * 0.8)), 220, 1, cv2.LINE_AA)


def finish_layer(layer: Layer, st: Style, seed, mist=None):
    H, W = layer.H, layer.W
    # 苔点与松树并入（墨色）
    dots = cv2.resize(layer.dots, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    dots = cv2.GaussianBlur(dots, (0, 0), 0.55)
    ink = np.array(st.ink, np.float32) * 0.85
    a_new = 1 - (1 - layer.a) * (1 - dots)
    pre = layer.pre * (1 - dots[..., None]) + ink[None, None, :] * dots[..., None]
    layer.pre, layer.a = pre, a_new

    # 洇开：小幅噪声位移 + 轻微模糊
    if st.bleed > 0:
        nx = spectral((H, W), 1.1, seed + 101) * st.bleed
        ny = spectral((H, W), 1.1, seed + 102) * st.bleed
        gx, gy = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
        mx, my = gx + nx, gy + ny
        layer.pre = cv2.remap(layer.pre, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        layer.a = cv2.remap(layer.a, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    if st.blur > 0:
        layer.pre = cv2.GaussianBlur(layer.pre, (0, 0), st.blur)
        layer.a = cv2.GaussianBlur(layer.a, (0, 0), st.blur)

    # 宣纸吸墨不匀：细颗粒让墨色有颗粒感
    grain = spectral((H, W), 0.4, seed + 103)
    fac = np.clip(1.0 - 0.07 * smoothstep(0.6, 2.4, grain) - 0.025 * grain, 0.75, 1.05)
    layer.pre *= fac[..., None]
    layer.a *= fac

    # 云雾：横向的雾带让山脚整片消散
    if mist is not None:
        layer.pre *= mist[..., None]
        layer.a *= mist
    a = np.clip(layer.a, 0, 1)
    rgb = np.where(a[..., None] > 1e-4, layer.pre / np.maximum(a[..., None], 1e-4), 0)
    return np.clip(rgb, 0, 1), a


def mist_mask(W, H, bands, seed):
    """bands: [(y中心, 厚度, 浓度)]，雾带处透明度降低；带有横向起伏。"""
    m = np.ones((H, W), np.float32)
    Y = np.arange(H, dtype=np.float32)[:, None]
    for i, (yc, th, k) in enumerate(bands):
        wav = noise1d(W, 2.4, seed + i, hi=0.01) * th * 0.35
        patch = 0.75 + 0.25 * smoothstep(-1.5, 1.5, noise1d(W, 2.0, seed + 50 + i, hi=0.01))
        g = np.exp(-(((Y - yc - wav[None, :]) / th) ** 2))
        m *= 1 - k * patch[None, :] * g
    return m


FAR = Style(ink=(0.42, 0.47, 0.51), wash_top=(0.47, 0.56, 0.62), wash_low=(0.62, 0.58, 0.52), edge_a=0.3, edge_w=2.4, body_a=0.34, fall=0.42, tex=0.3, tex_scale=1.6, wash_a=0.2, occl=0.75, moss_r=1.0, bleed=1.1, blur=1.0)
MID = Style(ink=(0.19, 0.2, 0.21), wash_top=(0.34, 0.45, 0.48), wash_low=(0.66, 0.52, 0.37), edge_a=0.85, edge_w=3.0, body_a=0.46, fall=0.34, tex=0.75, tex_scale=1.25, wash_a=0.3, occl=0.9, moss_r=1.8, bleed=1.0, blur=0.5, cun=1.0, cun_w=1.0, trees=True)
NEAR = Style(ink=(0.09, 0.085, 0.08), wash_top=(0.30, 0.38, 0.38), wash_low=(0.62, 0.47, 0.32), edge_a=0.95, edge_w=3.6, body_a=0.62, fall=0.3, tex=0.85, tex_scale=1.0, wash_a=0.34, occl=0.95, moss_r=2.4, bleed=1.2, blur=0.42, cun=1.4, cun_w=1.5)


def render_layer(W, H, peaks, st, seed, mist=None):
    rng = np.random.default_rng(seed)
    layer = Layer(W, H)
    aniso = spectral((512, 1024), 1.15, seed + 200, aniso=(9.0, 1.0))  # 竖向长、横向密
    for p in peaks:
        render_peak(layer, p, st, aniso, rng)
    return finish_layer(layer, st, seed, mist)


def hero_desktop(W=2400, H=1350):
    s = W / 2400
    P = lambda cx, base, h, w, **kw: Peak(cx * s, base * s, h * s, w * s, **kw)
    far = [
        P(-20, 990, 260, 110, sharp=1.5, seed=1),
        P(190, 975, 330, 80, sharp=1.3, skew=0.25, seed=2, shoulders=[(1.2, 0.55, 0.55, 1.6)]),
        P(420, 955, 230, 95, sharp=1.45, skew=-0.2, seed=3),
        P(640, 935, 160, 120, sharp=1.8, seed=4, shoulders=[(1.1, 0.6, 0.6, 1.8)]),
        P(900, 915, 110, 160, sharp=2.1, seed=5),
        P(1150, 905, 85, 150, sharp=2.2, seed=6),
        P(1390, 912, 105, 140, sharp=2.0, seed=7),
        P(1640, 930, 170, 115, sharp=1.7, seed=8, shoulders=[(-1.1, 0.6, 0.55, 1.7)]),
        P(1880, 955, 260, 90, sharp=1.4, skew=0.2, seed=9),
        P(2110, 975, 350, 85, sharp=1.3, skew=-0.25, seed=10, shoulders=[(-1.2, 0.55, 0.55, 1.6)]),
        P(2400, 990, 270, 115, sharp=1.5, seed=11),
    ]
    mid = [
        P(200, 1140, 640, 120, sharp=1.22, skew=0.18, seed=12, rough=0.06,
          shoulders=[(0.95, 0.6, 0.42, 1.5), (1.9, 0.38, 0.5, 1.8), (-0.85, 0.48, 0.42, 1.6)], moss=1.2),
        P(500, 1120, 420, 92, sharp=1.45, skew=-0.32, seed=13, shoulders=[(0.85, 0.58, 0.4, 1.7)], moss=1.1),
        P(730, 1105, 230, 115, sharp=1.9, seed=14, shoulders=[(-0.9, 0.7, 0.5, 2.0)], moss=0.9),
        P(1690, 1105, 250, 115, sharp=1.9, seed=15, shoulders=[(0.9, 0.7, 0.5, 2.0)], moss=0.9),
        P(1930, 1120, 450, 95, sharp=1.45, skew=0.32, seed=16, shoulders=[(-0.85, 0.58, 0.4, 1.7)], moss=1.1),
        P(2220, 1140, 670, 125, sharp=1.22, skew=-0.18, seed=17, rough=0.06,
          shoulders=[(-0.95, 0.6, 0.42, 1.5), (-1.9, 0.38, 0.5, 1.8), (0.85, 0.48, 0.42, 1.6)], moss=1.2),
    ]
    near = [
        P(60, 1460, 540, 165, sharp=3.0, skew=-0.35, seed=21, rough=0.08, shoulders=[(0.9, 0.72, 0.48, 2.6)], moss=1.5, pines=4),
        P(440, 1450, 250, 125, sharp=2.4, seed=22, rough=0.08, moss=1.2, pines=1),
        P(1970, 1450, 230, 125, sharp=2.4, seed=23, rough=0.08, moss=1.2, pines=1),
        P(2360, 1460, 500, 155, sharp=3.0, skew=0.35, seed=24, rough=0.08, shoulders=[(-0.9, 0.7, 0.48, 2.6)], moss=1.5, pines=3),
    ]
    mist_far = mist_mask(W, H, [(965 * s, 75 * s, 0.85)], 300)
    mist_mid = mist_mask(W, H, [(1115 * s, 90 * s, 0.9), (930 * s, 60 * s, 0.35)], 310)
    mist_near = mist_mask(W, H, [(1350 * s, 95 * s, 0.75)], 320)
    return (
        render_layer(W, H, far, FAR, 1000, mist_far),
        render_layer(W, H, mid, MID, 2000, mist_mid),
        render_layer(W, H, near, NEAR, 3000, mist_near),
    )


def hero_mobile(W=1200, H=2400):
    s = W / 1200
    P = lambda cx, base, h, w, **kw: Peak(cx * s, base * s, h * s, w * s, **kw)
    far = [
        P(-40, 1830, 400, 110, sharp=1.4, seed=31),
        P(210, 1805, 320, 85, sharp=1.3, skew=0.2, seed=32, shoulders=[(1.2, 0.55, 0.55, 1.6)]),
        P(470, 1780, 170, 115, sharp=1.9, seed=33),
        P(730, 1785, 200, 100, sharp=1.7, seed=34, shoulders=[(-1.1, 0.6, 0.55, 1.6)]),
        P(990, 1810, 360, 90, sharp=1.3, skew=-0.2, seed=35),
        P(1260, 1830, 420, 115, sharp=1.4, seed=36),
    ]
    mid = [
        P(90, 2060, 780, 140, sharp=1.22, skew=0.15, seed=41, rough=0.06,
          shoulders=[(0.95, 0.6, 0.42, 1.5), (1.8, 0.36, 0.5, 1.8)], moss=1.2),
        P(400, 2030, 380, 100, sharp=1.5, skew=-0.3, seed=42, moss=1.0),
        P(820, 2030, 400, 100, sharp=1.5, skew=0.3, seed=43, moss=1.0),
        P(1120, 2060, 830, 145, sharp=1.22, skew=-0.15, seed=44, rough=0.06,
          shoulders=[(-0.95, 0.6, 0.42, 1.5), (-1.8, 0.36, 0.5, 1.8)], moss=1.2),
    ]
    near = [
        P(20, 2540, 580, 230, sharp=3.0, skew=-0.3, seed=51, rough=0.08, shoulders=[(0.9, 0.68, 0.45, 2.6)], moss=1.5, pines=4),
        P(1190, 2540, 540, 220, sharp=3.0, skew=0.3, seed=52, rough=0.08, shoulders=[(-0.9, 0.68, 0.45, 2.6)], moss=1.5, pines=3),
    ]
    mist_far = mist_mask(W, H, [(1810 * s, 85 * s, 0.85)], 400)
    mist_mid = mist_mask(W, H, [(2040 * s, 100 * s, 0.9), (1790 * s, 70 * s, 0.35)], 410)
    mist_near = mist_mask(W, H, [(2420 * s, 120 * s, 0.7)], 420)
    return (
        render_layer(W, H, far, FAR, 1100, mist_far),
        render_layer(W, H, mid, MID, 2100, mist_mid),
        render_layer(W, H, near, NEAR, 3100, mist_near),
    )


def composite_preview(layers, W, H, path: Path, sun_img=None, sun_pos=None):
    tile = np.asarray(Image.open(OUT / "paper.webp").convert("RGB"), np.float32) / 255.0
    reps = (H // tile.shape[0] + 1, W // tile.shape[1] + 1)
    bg = np.tile(tile, (reps[0], reps[1], 1))[:H, :W]
    out = bg.copy()
    if sun_img is not None:
        srgb, sa = sun_img
        sx, sy, ssz = sun_pos
        sr = cv2.resize(srgb, (ssz, ssz), interpolation=cv2.INTER_AREA)
        sal = cv2.resize(sa, (ssz, ssz), interpolation=cv2.INTER_AREA)
        reg = out[sy : sy + ssz, sx : sx + ssz]
        reg[:] = reg * (1 - sal[..., None]) + (sr * reg) ** 0.85 * sal[..., None]
    for rgb, a in layers:
        out = out * (1 - a[..., None]) + rgb * a[..., None]
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.clip(out * 255, 0, 255).astype(np.uint8)).save(path)
    print("preview", path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("what", nargs="*", default=["all"])
    ap.add_argument("--preview", default=None)
    args = ap.parse_args()
    want = set(args.what)
    every = "all" in want
    prev = Path(args.preview) if args.preview else None

    if every or "paper" in want:
        save_rgba(OUT / "paper.webp", paper(), quality=90)
    if every or "gold" in want:
        rgb, a = gold_flecks()
        save_rgba(OUT / "gold.webp", rgb, a, quality=85)
    if every or "grain" in want:
        g = ink_grain()
        save_rgba(OUT / "ink-grain.webp", np.zeros(g.shape + (3,), np.float32), g, quality=80)
        sg = seal_grain()
        save_rgba(OUT / "seal-grain.webp", np.zeros(sg.shape + (3,), np.float32), sg, quality=80)
    sun_img = None
    if every or "sun" in want or "hero" in want:
        sun_img = sun()
        if every or "sun" in want:
            save_rgba(OUT / "sun.webp", *sun_img, quality=85)
    if every or "mist" in want:
        save_rgba(OUT / "mist.webp", *mist_tex(), quality=70, avif=True, avif_q=60)
    if every or "hero" in want:
        for name, fn, (W, H), sun_pos in (
            ("d", hero_desktop, (2400, 1350), (1830, 150, 250)),
            ("m", hero_mobile, (1200, 2400), (820, 260, 220)),
        ):
            layers = fn(W, H)
            for lname, (rgb, a) in zip(("far", "mid", "near"), layers):
                save_rgba(OUT / f"hero-{name}-{lname}.webp", rgb, a, quality=72, avif=True, avif_q=62)
            if prev:
                composite_preview(layers, W, H, prev / f"hero-{name}.png", sun_img, sun_pos)


if __name__ == "__main__":
    main()
