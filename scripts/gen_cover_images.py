#!/usr/bin/env python3
"""
gen_cover_images.py — 用 Gemini AI 依分類生成封面圖，每個分類一張

用法：
    GEMINI_API_KEY=xxx python3 scripts/gen_cover_images.py \
        --api http://localhost:5266 \
        --out ./covers \
        [--uploads-dir /path/to/backend-go/uploads/covers]
        [--skip-existing]    # 跳過已存在的分類圖
        [--update-db]        # 更新所有文章的 coverImage
        [--token TOKEN]      # Bearer token（update-db 需要）

Dependencies:
    pip install google-genai Pillow
"""

import argparse
import io
import json
import os
import shutil
import sys
import urllib.request

from google import genai
from google.genai import types
from PIL import Image

IMG_W, IMG_H = 1200, 630

# 分類 → 視覺描述（純圖示，不含文字）
CATEGORY_STYLE = {
    '我的python食譜': 'a coiled snake icon, data chart shapes, flask icon, code brackets',
    '我的安裝食譜': 'a whale icon carrying boxes, gear icons, wrench tool, download arrows',
    '我的待閱讀': 'open book icon, bookmark shape, lightbulb, stack of books silhouette',
    '我的測試食譜': 'checklist icon, bug silhouette, magnifying glass, green checkmark',
    '我的除錯食譜': 'bug icon with crosshair, warning triangle, terminal cursor, wrench',
}

DEFAULT_STYLE = 'monitor icon with code brackets, gear icons, terminal cursor, circuit lines'


def generate_cover(client: genai.Client, category: str) -> bytes:
    """用 Gemini 依分類生成封面圖，回傳 PNG bytes"""
    style_hint = CATEGORY_STYLE.get(category, DEFAULT_STYLE)

    prompt = (
        f"Flat vector icon illustration: {style_hint}. "
        f"Simple geometric shapes on dark background (#0A0A0F). "
        f"Neon cyan (#00D4FF) and purple (#7C3AED) glow accents. "
        f"Absolutely no text, no letters, no characters, no writing, no words, no numbers anywhere. "
        f"Only simple flat icons and abstract shapes. Wide landscape."
    )

    response = client.models.generate_content(
        model="gemini-2.0-flash-exp-image-generation",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
        ),
    )

    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            img = Image.open(io.BytesIO(part.inline_data.data))
            img = img.resize((IMG_W, IMG_H), Image.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format="PNG", quality=95)
            return buf.getvalue()

    raise RuntimeError("Gemini 未回傳圖片")


# ── API ──────────────────────────────────────────────────────

def fetch_articles(api_base: str, page: int = 1, page_size: int = 200):
    url = f'{api_base.rstrip("/")}/api/articles?page={page}&pageSize={page_size}'
    with urllib.request.urlopen(url, timeout=15) as r:
        return json.loads(r.read())


def get_all_articles(api_base: str):
    articles = []
    page = 1
    while True:
        data = fetch_articles(api_base, page=page, page_size=200)
        items = data.get('data', {}).get('items', [])
        articles.extend(items)
        total_pages = data.get('data', {}).get('totalPages', 1)
        if page >= total_pages:
            break
        page += 1
    return articles


def fetch_article_detail(api_base: str, token: str, article_id: int):
    url = f'{api_base.rstrip("/")}/api/admin/articles/{article_id}'
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def update_article_cover(api_base: str, token: str, article_id: int, cover_path: str):
    try:
        resp = fetch_article_detail(api_base, token, article_id)
        article = resp.get('data', {})
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


def safe_filename(name: str) -> str:
    """分類名轉安全檔名"""
    return name.replace(' ', '_').replace('/', '_')


# ── 主程式 ───────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='用 Gemini AI 依分類生成封面圖')
    parser.add_argument('--api', default='http://localhost:5266', help='Go API URL')
    parser.add_argument('--out', default='./covers', help='輸出目錄')
    parser.add_argument('--uploads-dir', default='', help='同時複製到 Go server uploads 目錄')
    parser.add_argument('--skip-existing', action='store_true', help='跳過已存在的分類圖')
    parser.add_argument('--update-db', action='store_true', help='更新所有文章的 coverImage')
    parser.add_argument('--token', default='', help='Bearer token（update-db 需要）')
    args = parser.parse_args()

    api_key = os.environ.get('GEMINI_API_KEY')
    if not api_key:
        print('ERROR: 請設定 GEMINI_API_KEY 環境變數')
        sys.exit(1)

    if args.update_db and not args.token:
        print('ERROR: --update-db 需要 --token')
        sys.exit(1)

    client = genai.Client(api_key=api_key)
    os.makedirs(args.out, exist_ok=True)
    if args.uploads_dir:
        os.makedirs(args.uploads_dir, exist_ok=True)

    # 1. 取得所有文章，歸類
    print('[INFO] 從 API 取得文章列表...')
    all_articles = get_all_articles(args.api)
    print(f'[INFO] 共 {len(all_articles)} 篇文章')

    # 歸類：category_name → [article_ids]
    cat_articles = {}
    for a in all_articles:
        cat = (a.get('category') or {}).get('name', 'default')
        cat_articles.setdefault(cat, []).append(a['id'])

    print(f'[INFO] 共 {len(cat_articles)} 個分類：')
    for cat, ids in cat_articles.items():
        print(f'  {cat} ({len(ids)} 篇)')

    # 2. 每個分類產一張圖
    success = 0
    skip = 0
    for cat in cat_articles:
        filename = f'{safe_filename(cat)}.png'
        out_path = os.path.join(args.out, filename)

        if args.skip_existing and os.path.exists(out_path):
            print(f'[SKIP] {cat} → {filename}')
            skip += 1
        else:
            try:
                png_data = generate_cover(client, cat)
                with open(out_path, 'wb') as f:
                    f.write(png_data)
                size_kb = len(png_data) / 1024
                print(f'[OK] {cat} → {filename} ({size_kb:.0f} KB)')
                success += 1
            except Exception as e:
                print(f'[ERR] {cat}: {e}')
                continue

        # 複製到 uploads
        if args.uploads_dir and os.path.exists(out_path):
            dst = os.path.join(args.uploads_dir, filename)
            shutil.copy2(out_path, dst)

    print(f'\n產圖完成：{success} 張，跳過：{skip} 張')

    # 3. 更新 DB：每篇文章的 coverImage 指向分類圖
    if args.update_db:
        db_updated = 0
        for cat, ids in cat_articles.items():
            filename = f'{safe_filename(cat)}.png'
            cover_url = f'/uploads/covers/{filename}'
            for aid in ids:
                if update_article_cover(args.api, args.token, aid, cover_url):
                    db_updated += 1
        print(f'DB 更新：{db_updated} 筆')

    print(f'輸出目錄：{args.out}')


if __name__ == '__main__':
    main()
