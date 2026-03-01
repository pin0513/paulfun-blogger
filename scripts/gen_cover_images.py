#!/usr/bin/env python3
"""
gen_cover_images.py — 用 Gemini AI 依文章標題生成封面圖

用法：
    GEMINI_API_KEY=xxx python3 scripts/gen_cover_images.py \
        --api http://localhost:5266 \
        --out ./covers \
        [--uploads-dir /path/to/backend-go/uploads/covers]
        [--ids 1,2,3]        # 只生成指定 id
        [--skip-existing]    # 跳過已存在的圖片
        [--update-db]        # 產圖後更新 DB coverImage
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

# 圖片尺寸
IMG_W, IMG_H = 1200, 630

# 分類對應的視覺風格提示
CATEGORY_STYLE = {
    'AI': 'neural networks, brain circuits, glowing nodes',
    'Docker': 'shipping containers, whale, cloud infrastructure',
    'Python': 'snake patterns, data visualization, scientific computing',
    'Go': 'gopher mascot, concurrent pipelines, speed',
    'React': 'component trees, UI elements, atomic design',
    'Azure': 'cloud computing, blue sky, server racks',
    'Agile': 'kanban board, sprints, teamwork',
    '技術': 'code editor, terminal, algorithms',
    '生活': 'daily life, nature, warm atmosphere',
    '旅遊': 'landscapes, travel, adventure',
    '閱讀': 'books, library, knowledge',
}


def get_style_hint(category: str) -> str:
    for k, v in CATEGORY_STYLE.items():
        if k in category:
            return v
    return 'technology, code, digital'


def generate_cover(client: genai.Client, title: str, category: str) -> bytes:
    """用 Gemini 依標題生成封面圖，回傳 PNG bytes"""
    style_hint = get_style_hint(category)

    prompt = (
        f"Create a flat minimalist illustration for a blog post titled: \"{title}\". "
        f"Visual theme: {style_hint}. "
        f"Style: clean flat illustration, simple geometric shapes, modern tech aesthetic. "
        f"Color palette: dark background (#0A0A0F), with neon cyan (#00D4FF), "
        f"purple (#7C3AED), and pink (#FF006E) accents. "
        f"No text, no words, no letters in the image. "
        f"Aspect ratio approximately 1.9:1 (wide landscape)."
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
    url = f'{api_base.rstrip("/")}/api/admin/articles/{article_id}'
    req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def update_article_cover(api_base: str, token: str, article_id: int, cover_path: str):
    """先 GET 完整文章，再 PUT 回去只改 coverImage"""
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


# ── 主程式 ───────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='用 Gemini AI 生成文章封面圖')
    parser.add_argument('--api', default='http://localhost:5266', help='Go API URL')
    parser.add_argument('--out', default='./covers', help='輸出目錄')
    parser.add_argument('--uploads-dir', default='', help='同時複製到 Go server uploads 目錄')
    parser.add_argument('--ids', default='', help='只生成指定 id（逗號分隔）')
    parser.add_argument('--skip-existing', action='store_true', help='跳過已存在的圖片')
    parser.add_argument('--update-db', action='store_true', help='產圖後更新 DB coverImage')
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

    print('[INFO] 從 API 取得文章列表...')
    all_articles = get_all_articles(args.api)
    print(f'[INFO] 共 {len(all_articles)} 篇文章')

    if args.ids.strip():
        target_ids = set(int(x.strip()) for x in args.ids.split(','))
        all_articles = [a for a in all_articles if a['id'] in target_ids]
        print(f'[INFO] 篩選後 {len(all_articles)} 篇')

    success = 0
    skip = 0
    fail = 0
    db_updated = 0

    for a in all_articles:
        aid = a['id']
        out_path = os.path.join(args.out, f'{aid}.png')
        title = a.get('title', 'Untitled')
        category = (a.get('category') or {}).get('name', '')

        if args.skip_existing and os.path.exists(out_path):
            skip += 1
        else:
            try:
                png_data = generate_cover(client, title, category)
                with open(out_path, 'wb') as f:
                    f.write(png_data)
                size_kb = len(png_data) / 1024
                print(f'[OK] id={aid:>4}  "{title[:30]}"  ({size_kb:.0f} KB)')
                success += 1

                if args.uploads_dir:
                    dst = os.path.join(args.uploads_dir, f'{aid}.png')
                    shutil.copy2(out_path, dst)

            except Exception as e:
                print(f'[ERR] id={aid} {e}')
                fail += 1
                continue

        if args.update_db:
            cover_url = f'/uploads/covers/{aid}.png'
            if update_article_cover(args.api, args.token, aid, cover_url):
                db_updated += 1

    print(f'\n生成完成：{success} 張，跳過：{skip} 張，失敗：{fail} 張')
    if args.update_db:
        print(f'DB 更新：{db_updated} 筆')
    print(f'輸出目錄：{args.out}')


if __name__ == '__main__':
    main()
