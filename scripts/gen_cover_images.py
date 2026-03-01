#!/usr/bin/env python3
"""
gen_cover_images.py — 依文章 title/category 生成扁平插畫風格封面圖

用法：
    python3 scripts/gen_cover_images.py \
        --api http://localhost:5266 \
        --out ./covers \
        [--uploads-dir /path/to/backend-go/uploads/covers]  # 同時輸出到 Go server uploads
        [--ids 1,2,3]        # 只生成指定 id（不指定則全部）
        [--skip-existing]    # 跳過已存在的圖片
        [--update-db]        # 產圖後更新 DB 的 coverImage 欄位
        [--token TOKEN]      # Bearer token（update-db 需要）
"""

import argparse
import json
import math
import os
import random
import shutil
import sys
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
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/System/Library/Fonts/HelveticaNeue.ttc",
]


def load_font(size: int):
    for path in FONT_PATHS:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


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


def draw_flat_shapes(draw, w, h, accent):
    """扁平幾何圖形裝飾（取代 grid + diagonal）"""
    random.seed(42)  # 固定種子讓每次結果一致

    # 圓形裝飾
    for _ in range(6):
        cx = random.randint(0, w)
        cy = random.randint(0, h)
        r = random.randint(20, 80)
        alpha = random.randint(15, 35)
        color = random.choice([PRIMARY, SECONDARY, accent])
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color, alpha))

    # 矩形裝飾
    for _ in range(4):
        x1 = random.randint(0, w - 100)
        y1 = random.randint(0, h - 60)
        rw = random.randint(40, 120)
        rh = random.randint(20, 60)
        alpha = random.randint(10, 25)
        color = random.choice([PRIMARY, SECONDARY])
        draw.rectangle([x1, y1, x1 + rw, y1 + rh], fill=(*color, alpha))

    # 角落裝飾圓弧
    draw.ellipse([-60, -60, 120, 120], fill=(*accent, 20))
    draw.ellipse([w - 100, h - 100, w + 60, h + 60], fill=(*SECONDARY, 20))


def generate_image(article_id: int, title: str, category: str, out_dir: str):
    """生成單張封面圖"""
    img = Image.new('RGBA', (IMG_W, IMG_H), BG_COLOR + (255,))
    draw = ImageDraw.Draw(img, 'RGBA')

    acc = category_color(category)

    # ── 背景層：扁平幾何圖形 ─────────────────────────────────
    draw_flat_shapes(draw, IMG_W, IMG_H, acc)

    # 左側色帶
    draw.rectangle([0, 0, 6, IMG_H], fill=(*acc, 180))

    # ── 分類標籤 ─────────────────────────────────────────────
    font_cat = load_font(22)
    cat_text = category if category else 'Blog'
    cat_bbox = draw.textbbox((0, 0), cat_text, font=font_cat)
    cat_w = cat_bbox[2] - cat_bbox[0]
    pad_x, pad_y = 16, 8

    cat_x, cat_y = 80, 80
    draw.rounded_rectangle(
        [cat_x - pad_x, cat_y - pad_y,
         cat_x + cat_w + pad_x, cat_y + (cat_bbox[3] - cat_bbox[1]) + pad_y],
        radius=6,
        fill=(*acc, 40),
        outline=(*acc, 120),
        width=1,
    )
    draw.text((cat_x, cat_y), cat_text, font=font_cat, fill=(*acc, 255))

    # ── 主標題 ───────────────────────────────────────────────
    font_title_big = load_font(64)
    font_title_mid = load_font(48)
    font_title_sm  = load_font(36)

    max_title_w = IMG_W - 160

    for font_t in [font_title_big, font_title_mid, font_title_sm]:
        lines = wrap_text(title, font_t, max_title_w, draw)
        if len(lines) <= 3:
            break

    line_h = draw.textbbox((0, 0), '測', font=font_t)[3] + 12
    total_h = line_h * len(lines)
    start_y = (IMG_H - total_h) // 2 - 20

    for i, line in enumerate(lines):
        y = start_y + i * line_h
        draw.text((82, y + 2), line, font=font_t, fill=(0, 0, 0, 80))
        draw.text((80, y), line, font=font_t, fill=TEXT_WHITE)

    # ── 底部資訊列 ───────────────────────────────────────────
    draw.rounded_rectangle([0, IMG_H - 56, IMG_W, IMG_H], radius=0,
                            fill=(*SURFACE_COLOR, 220))
    draw.line([(0, IMG_H - 56), (IMG_W, IMG_H - 56)], fill=(*acc, 80), width=2)

    font_info = load_font(20)
    draw.text((80, IMG_H - 40), 'PaulFun Blog', font=font_info, fill=(*acc, 220))

    id_text = f'#{article_id}'
    id_bbox = draw.textbbox((0, 0), id_text, font=font_info)
    draw.text(
        (IMG_W - 80 - (id_bbox[2] - id_bbox[0]), IMG_H - 40),
        id_text, font=font_info, fill=(*TEXT_MUTED, 180)
    )

    # ── 存檔 ─────────────────────────────────────────────────
    out_path = os.path.join(out_dir, f'{article_id}.png')
    img.convert('RGB').save(out_path, 'PNG', quality=95)
    return out_path


# ── API ──────────────────────────────────────────────────────

def fetch_articles(api_base: str, page: int = 1, page_size: int = 100):
    url = f'{api_base.rstrip("/")}/api/articles?page={page}&pageSize={page_size}'
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


def fetch_article_detail(api_base: str, token: str, article_id: int):
    """GET /api/admin/articles/{id} 取得完整文章資料"""
    url = f'{api_base.rstrip("/")}/api/admin/articles/{article_id}'
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def update_article_cover(api_base: str, token: str, article_id: int, cover_path: str):
    """先 GET 完整文章，再 PUT 回去只改 coverImage"""
    try:
        resp = fetch_article_detail(api_base, token, article_id)
        article = resp.get('data', {})
        # 組裝 update payload — 保留必填欄位
        payload = {
            'title': article.get('title', ''),
            'content': article.get('content', ''),
            'summary': article.get('summary', ''),
            'categoryId': article.get('category', {}).get('id') if article.get('category') else None,
            'tagIds': [t['id'] for t in article.get('tags', [])],
            'status': article.get('status', 'published'),
            'coverImage': cover_path,
        }
        url = f'{api_base.rstrip("/")}/api/admin/articles/{article_id}'
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url, data=data, method='PUT',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {token}',
            },
        )
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status == 200
    except Exception as e:
        print(f'  [WARN] 更新 DB 失敗 id={article_id}: {e}')
        return False


# ── 主程式 ───────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='生成文章封面圖（扁平插畫風格）')
    parser.add_argument('--api', default='http://localhost:5266', help='Go API URL')
    parser.add_argument('--out', default='./covers', help='輸出目錄')
    parser.add_argument('--uploads-dir', default='', help='同時複製到 Go server uploads 目錄')
    parser.add_argument('--ids', default='', help='只生成指定 id（逗號分隔）')
    parser.add_argument('--skip-existing', action='store_true', help='跳過已存在的圖片')
    parser.add_argument('--update-db', action='store_true', help='產圖後更新 DB coverImage')
    parser.add_argument('--token', default='', help='Bearer token（update-db 需要）')
    args = parser.parse_args()

    if args.update_db and not args.token:
        print('ERROR: --update-db 需要 --token')
        sys.exit(1)

    os.makedirs(args.out, exist_ok=True)
    if args.uploads_dir:
        os.makedirs(args.uploads_dir, exist_ok=True)

    print('[INFO] 從 API 取得文章列表...')
    all_articles = get_all_articles(args.api)
    print(f'[INFO] 共 {len(all_articles)} 篇文章')

    if args.ids.strip():
        target_ids = set(int(x.strip()) for x in args.ids.split(','))
        all_articles = [a for a in all_articles if a['id'] in target_ids]
        print(f'[INFO] 篩選後 {len(all_articles)} 篇')

    success = 0
    skip = 0
    db_updated = 0

    for a in all_articles:
        aid = a['id']
        out_path = os.path.join(args.out, f'{aid}.png')

        title    = a.get('title', 'Untitled')
        category = (a.get('category') or {}).get('name', '')

        if args.skip_existing and os.path.exists(out_path):
            skip += 1
        else:
            try:
                path = generate_image(aid, title, category, args.out)
                print(f'[OK] id={aid:>4}  {os.path.basename(path)}')
                success += 1

                # 複製到 uploads 目錄
                if args.uploads_dir:
                    dst = os.path.join(args.uploads_dir, f'{aid}.png')
                    shutil.copy2(path, dst)

            except Exception as e:
                print(f'[ERR] id={aid} {e}')
                continue

        # 更新 DB（不論圖片是新產或已存在）
        if args.update_db:
            cover_url = f'/uploads/covers/{aid}.png'
            if update_article_cover(args.api, args.token, aid, cover_url):
                db_updated += 1

    print(f'\n生成完成：{success} 張，跳過：{skip} 張')
    if args.update_db:
        print(f'DB 更新：{db_updated} 筆')
    print(f'輸出目錄：{args.out}')
    if args.uploads_dir:
        print(f'Uploads 目錄：{args.uploads_dir}')


if __name__ == '__main__':
    main()
