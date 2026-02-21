#!/usr/bin/env python3
"""
gen_cover_images.py — 依文章 title/category 生成賽博朋克風格封面圖

用法：
    python3 scripts/gen_cover_images.py \
        --api http://localhost:5266 \
        --out /Users/paul_huang/paul-test-gcp-vm/ai-images \
        [--ids 1,2,3]        # 只生成指定 id（不指定則全部）
        [--skip-existing]    # 跳過已存在的圖片（預設覆蓋）
"""

import argparse
import json
import math
import os
import random
import re
import sys
import textwrap
import urllib.request

from PIL import Image, ImageDraw, ImageFont

# ── 色彩設定（對應網站 Cyberpunk 主題）────────────────────────
BG_COLOR      = (10, 10, 15)        # #0A0A0F
SURFACE_COLOR = (26, 26, 46)        # #1A1A2E
PRIMARY       = (0, 212, 255)       # #00D4FF（霓虹青）
SECONDARY     = (124, 58, 237)      # #7C3AED（神秘紫）
ACCENT        = (255, 0, 110)       # #FF006E（霓虹粉）
TEXT_WHITE    = (228, 228, 231)     # #E4E4E7
TEXT_MUTED    = (113, 113, 122)     # #71717A

# 圖片尺寸（16:9）
IMG_W, IMG_H = 1200, 630

# 字體路徑（macOS）
FONT_PATHS = [
    "/System/Library/Fonts/STHeiti Medium.ttc",          # 中文黑體
    "/System/Library/Fonts/Hiragino Sans GB.ttc",        # 中文 Hiragino
    "/System/Library/Fonts/HelveticaNeue.ttc",           # 英文備用
]


def load_font(size: int, bold: bool = False):
    for path in FONT_PATHS:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def hex_to_rgb(h: str):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def draw_glow_rect(draw, xy, color, alpha=60, blur_steps=4):
    """模擬霓虹光暈效果（多層半透明矩形）"""
    x1, y1, x2, y2 = xy
    for i in range(blur_steps, 0, -1):
        expand = i * 3
        a = alpha // blur_steps * i
        r, g, b = color
        draw.rectangle(
            [x1 - expand, y1 - expand, x2 + expand, y2 + expand],
            outline=(r, g, b, a),
            width=1,
        )


def draw_grid(draw, w, h, color=(0, 212, 255), alpha=15):
    """背景格子線"""
    step = 60
    for x in range(0, w, step):
        draw.line([(x, 0), (x, h)], fill=(*color, alpha), width=1)
    for y in range(0, h, step):
        draw.line([(0, y), (w, y)], fill=(*color, alpha), width=1)


def draw_diagonal_lines(draw, w, h, color=(124, 58, 237), alpha=20):
    """斜線裝飾"""
    for i in range(-h, w + h, 80):
        draw.line([(i, 0), (i + h, h)], fill=(*color, alpha), width=2)


def category_color(cat_name: str):
    """依分類名稱決定強調色"""
    mapping = {
        'AI': ACCENT,
        'Agile': PRIMARY,
        'Azure': (0, 120, 215),
        'Azure Functions': (0, 120, 215),
        'Docker': (13, 183, 237),
        'Python': (255, 222, 89),
        'Go': (0, 173, 216),
        'React': (97, 218, 251),
        '技術': PRIMARY,
        '生活': (100, 200, 100),
        '旅遊': (255, 150, 50),
        '閱讀': SECONDARY,
    }
    for k, v in mapping.items():
        if k in cat_name:
            return v
    return PRIMARY


def wrap_text(text: str, font, max_width: int, draw) -> list:
    """自動換行（依像素寬度）"""
    words = list(text)
    lines = []
    current = ''
    for ch in text:
        test = current + ch
        bbox = draw.textbbox((0, 0), test, font=font)
        w = bbox[2] - bbox[0]
        if w > max_width and current:
            lines.append(current)
            current = ch
        else:
            current = test
    if current:
        lines.append(current)
    return lines


def generate_image(article_id: int, title: str, category: str, out_dir: str):
    """生成單張封面圖"""
    img = Image.new('RGBA', (IMG_W, IMG_H), BG_COLOR + (255,))
    draw = ImageDraw.Draw(img, 'RGBA')

    # ── 背景層 ───────────────────────────────────────────────
    draw_grid(draw, IMG_W, IMG_H)
    draw_diagonal_lines(draw, IMG_W, IMG_H)

    # 左側光暈塊
    acc = category_color(category)
    for i in range(5):
        alpha = 30 - i * 5
        draw.rectangle(
            [0, IMG_H // 3 - i * 10, 8 + i * 4, IMG_H * 2 // 3 + i * 10],
            fill=(*acc, alpha)
        )

    # 右下角裝飾三角
    pts = [(IMG_W - 200, IMG_H), (IMG_W, IMG_H - 200), (IMG_W, IMG_H)]
    draw.polygon(pts, fill=(*SECONDARY, 30))

    # ── 分類標籤 ─────────────────────────────────────────────
    font_cat = load_font(22)
    cat_text = category if category else 'Blog'
    cat_bbox = draw.textbbox((0, 0), cat_text, font=font_cat)
    cat_w = cat_bbox[2] - cat_bbox[0]
    pad_x, pad_y = 16, 8

    cat_x, cat_y = 80, 80
    # 背景框
    draw.rectangle(
        [cat_x - pad_x, cat_y - pad_y,
         cat_x + cat_w + pad_x, cat_y + (cat_bbox[3] - cat_bbox[1]) + pad_y],
        fill=(*acc, 40),
        outline=(*acc, 180),
        width=1,
    )
    draw.text((cat_x, cat_y), cat_text, font=font_cat, fill=(*acc, 255))

    # ── 主標題 ───────────────────────────────────────────────
    font_title_big = load_font(64)
    font_title_mid = load_font(48)
    font_title_sm  = load_font(36)

    max_title_w = IMG_W - 160

    # 選字體大小（依標題長度）
    for font_t in [font_title_big, font_title_mid, font_title_sm]:
        lines = wrap_text(title, font_t, max_title_w, draw)
        if len(lines) <= 3:
            break

    # 垂直置中（偏上方）
    line_h = draw.textbbox((0, 0), '測', font=font_t)[3] + 12
    total_h = line_h * len(lines)
    start_y = (IMG_H - total_h) // 2 - 20

    for i, line in enumerate(lines):
        y = start_y + i * line_h
        # 陰影
        draw.text((82, y + 3), line, font=font_t, fill=(0, 0, 0, 120))
        # 主文字
        draw.text((80, y), line, font=font_t, fill=TEXT_WHITE)

    # ── 底部資訊列 ───────────────────────────────────────────
    draw.rectangle([0, IMG_H - 60, IMG_W, IMG_H], fill=(*SURFACE_COLOR, 200))
    draw.line([(0, IMG_H - 60), (IMG_W, IMG_H - 60)], fill=(*acc, 100), width=1)

    font_info = load_font(20)
    draw.text((80, IMG_H - 42), 'PaulFun Blog', font=font_info, fill=(*acc, 220))

    # ID 標記
    id_text = 'Article #{}'.format(article_id)
    id_bbox = draw.textbbox((0, 0), id_text, font=font_info)
    draw.text(
        (IMG_W - 80 - (id_bbox[2] - id_bbox[0]), IMG_H - 42),
        id_text, font=font_info, fill=(*TEXT_MUTED, 180)
    )

    # ── 存檔 ─────────────────────────────────────────────────
    out_path = os.path.join(out_dir, '{}.png'.format(article_id))
    img.convert('RGB').save(out_path, 'PNG', quality=95)
    return out_path


# ── API 取文章列表 ───────────────────────────────────────────

def fetch_articles(api_base: str, page: int = 1, page_size: int = 100):
    url = '{}/api/articles?page={}&pageSize={}'.format(api_base.rstrip('/'), page, page_size)
    with urllib.request.urlopen(url, timeout=15) as r:
        return json.loads(r.read())


def get_all_articles(api_base: str):
    articles = []
    page = 1
    while True:
        data = fetch_articles(api_base, page=page, page_size=100)
        items = data.get('data', {}).get('items', [])
        articles.extend(items)
        total_pages = data.get('data', {}).get('totalPages', 1)
        if page >= total_pages:
            break
        page += 1
    return articles


# ── 主程式 ───────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='生成文章封面圖')
    parser.add_argument('--api', default='http://localhost:5266', help='Go API URL')
    parser.add_argument('--out', default='/Users/paul_huang/paul-test-gcp-vm/ai-images',
                        help='輸出目錄')
    parser.add_argument('--ids', default='', help='只生成指定 id（逗號分隔），不指定則全部')
    parser.add_argument('--skip-existing', action='store_true', help='跳過已存在的圖片')
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)

    print('[INFO] 從 API 取得文章列表...')
    all_articles = get_all_articles(args.api)
    print('[INFO] 共 {} 篇文章'.format(len(all_articles)))

    # 過濾 id
    if args.ids.strip():
        target_ids = set(int(x.strip()) for x in args.ids.split(','))
        all_articles = [a for a in all_articles if a['id'] in target_ids]
        print('[INFO] 篩選後 {} 篇'.format(len(all_articles)))

    success = 0
    skip = 0
    for a in all_articles:
        aid = a['id']
        out_path = os.path.join(args.out, '{}.png'.format(aid))

        if args.skip_existing and os.path.exists(out_path):
            skip += 1
            continue

        title    = a.get('title', 'Untitled')
        category = (a.get('category') or {}).get('name', '')

        try:
            path = generate_image(aid, title, category, args.out)
            print('[OK] id={:>4}  {}'.format(aid, os.path.basename(path)))
            success += 1
        except Exception as e:
            print('[ERR] id={} {}'.format(aid, e))

    print('\n生成完成：{} 張，跳過：{} 張'.format(success, skip))
    print('輸出目錄：{}'.format(args.out))


if __name__ == '__main__':
    main()
