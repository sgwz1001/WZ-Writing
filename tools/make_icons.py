# -*- coding: utf-8 -*-
"""生成「文载」应用图标。

设计意图：一枚竖长的朱印。深空底子上压一个金色的「文」字，
边缘留一圈细金线 —— 取「文以载道」的印信之意。

小尺寸（≤48px）单独换黑体渲染：楷体的撇捺在 16 像素下会糊成一团，
好看要让位于认得出。
"""
from __future__ import annotations

import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src-tauri", "icons")
os.makedirs(OUT, exist_ok=True)

FONT_ELEGANT = "C:/Windows/Fonts/simkai.ttf"   # 楷体，大尺寸用
FONT_STURDY = "C:/Windows/Fonts/simhei.ttf"    # 黑体，小尺寸用

BG_TOP = (24, 26, 40)
BG_BOTTOM = (13, 14, 22)
GOLD = (206, 172, 106)
GOLD_BRIGHT = (232, 205, 152)


def rounded_mask(size: int, radius_ratio: float = 0.22) -> Image.Image:
    m = Image.new("L", (size * 4, size * 4), 0)
    d = ImageDraw.Draw(m)
    r = int(size * 4 * radius_ratio)
    d.rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=r, fill=255)
    return m.resize((size, size), Image.LANCZOS)


def vertical_gradient(size: int) -> Image.Image:
    g = Image.new("RGB", (1, size))
    for y in range(size):
        t = y / max(size - 1, 1)
        g.putpixel(
            (0, y),
            tuple(int(BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * t) for i in range(3)),
        )
    return g.resize((size, size), Image.BICUBIC)


def make_icon(size: int) -> Image.Image:
    ss = 4 if size <= 64 else 2          # 超采样倍率
    w = size * ss

    base = vertical_gradient(w).convert("RGBA")
    d = ImageDraw.Draw(base)

    # 内描边：一圈细金线，模仿印章的边框
    if size >= 32:
        inset = max(int(w * 0.055), 2)
        line = max(int(w * 0.016), 1)
        d.rounded_rectangle(
            [inset, inset, w - inset - 1, w - inset - 1],
            radius=int(w * 0.16),
            outline=GOLD + (150,),
            width=line,
        )

    # 「文」字
    font_path = FONT_ELEGANT if size >= 64 else FONT_STURDY
    ratio = 0.66 if size >= 64 else 0.72
    font = ImageFont.truetype(font_path, int(w * ratio))

    bbox = d.textbbox((0, 0), "文", font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (w - tw) / 2 - bbox[0]
    y = (w - th) / 2 - bbox[1]

    # 极淡的一层描边，把字从深底上托起来
    if size >= 64:
        d.text((x, y), "文", font=font, fill=(0, 0, 0, 90),
               stroke_width=max(int(w * 0.012), 1), stroke_fill=(0, 0, 0, 70))
    d.text((x, y), "文", font=font, fill=GOLD_BRIGHT)

    img = base.resize((size, size), Image.LANCZOS)
    img.putalpha(rounded_mask(size))
    return img


def main() -> None:
    for name, size in [
        ("32x32.png", 32),
        ("128x128.png", 128),
        ("128x128@2x.png", 256),
        ("icon.png", 512),
        ("Square30x30Logo.png", 30),
        ("Square44x44Logo.png", 44),
        ("Square71x71Logo.png", 71),
        ("Square89x89Logo.png", 89),
        ("Square107x107Logo.png", 107),
        ("Square142x142Logo.png", 142),
        ("Square150x150Logo.png", 150),
        ("Square284x284Logo.png", 284),
        ("Square310x310Logo.png", 310),
        ("StoreLogo.png", 50),
    ]:
        make_icon(size).save(os.path.join(OUT, name))

    ico_sizes = [16, 24, 32, 48, 64, 128, 256]
    frames = [make_icon(s) for s in ico_sizes]
    frames[-1].save(
        os.path.join(OUT, "icon.ico"),
        format="ICO",
        sizes=[(s, s) for s in ico_sizes],
        append_images=frames[:-1],
    )

    print("图标已生成 ->", os.path.abspath(OUT))


if __name__ == "__main__":
    main()
