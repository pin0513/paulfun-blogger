#!/usr/bin/env python3
"""
WordPress → PaulFun Blogger 批量匯入腳本

用法：
    python3 scripts/import_wordpress.py \
        --dir /path/to/wordpress_export \
        --api http://localhost:5266 \
        --email pin0513@gmail.com \
        --password Test1234

功能：
  1. 解析 markdown 檔案的 YAML front matter（title / date / categories / tags）
  2. 自動建立分類與標籤（slug 去重，已存在則略過）
  3. 批量匯入文章，並以 publishedAt 設定原始發佈日期
  4. 統計匯入結果（created / skipped / failed）

前置條件：
  - Go API server 正在執行（預設 http://localhost:5266）
  - pip install requests pyyaml （若無 pyyaml，腳本會用 re 解析）
"""

import argparse
import json
import os
import re
import sys
import glob

# ── 選用依賴 ──────────────────────────────────────────────────────────────────
try:
    import requests
except ImportError:
    print("[ERROR] 請安裝 requests：pip install requests")
    sys.exit(1)

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False
    print("[WARN] pyyaml 未安裝，使用 regex 解析 front matter（pip install pyyaml 可提升可靠性）")


# ── Front matter 解析 ─────────────────────────────────────────────────────────

def parse_front_matter(content: str):
    """解析 YAML front matter，回傳 (meta_dict, body_str)"""
    if not content.startswith("---"):
        return {}, content

    end = content.find("\n---", 3)
    if end == -1:
        return {}, content

    raw_yaml = content[3:end].strip()
    body = content[end + 4:].strip()

    if HAS_YAML:
        try:
            meta = yaml.safe_load(raw_yaml) or {}
        except Exception:
            meta = _parse_yaml_regex(raw_yaml)
    else:
        meta = _parse_yaml_regex(raw_yaml)

    return meta, body


def _parse_yaml_regex(raw: str) -> dict:
    """不依賴 pyyaml 的基本 key: value 解析"""
    meta = {}
    for line in raw.splitlines():
        m = re.match(r'^(\w+):\s*(.*)', line)
        if not m:
            continue
        key, val = m.group(1), m.group(2).strip()
        # 解析陣列 ["a", "b"]
        if val.startswith("["):
            items = re.findall(r'"([^"]*)"', val)
            meta[key] = items
        else:
            meta[key] = val.strip('"').strip("'")
    return meta


# ── 內容清理 ──────────────────────────────────────────────────────────────────

def clean_content(body: str) -> str:
    """
    將 WordPress 匯出的混合格式轉為較乾淨的 markdown。
    主要處理：
      - 字串 '\\n' → 實際換行
      - 多餘空白行壓縮
      - 表格列頭的 | \\n 移除
    """
    # 字串 \n 轉真正換行
    text = body.replace("\\n", "\n")

    # 移除行首行尾多餘空白（但保留縮排）
    lines = [l.rstrip() for l in text.splitlines()]

    # 壓縮連續空行（最多保留 2 個）
    cleaned = []
    blank = 0
    for line in lines:
        if line.strip() == "":
            blank += 1
            if blank <= 2:
                cleaned.append("")
        else:
            blank = 0
            cleaned.append(line)

    return "\n".join(cleaned).strip()


def extract_summary(body: str, max_len: int = 200) -> str:
    """從內文提取前幾句作為摘要"""
    # 移除 markdown 標記
    text = re.sub(r'#+\s+', '', body)         # 標題
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)  # bold
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)  # links
    text = re.sub(r'!\[[^\]]*\]\([^\)]+\)', '', text)       # images
    text = re.sub(r'`[^`]+`', '', text)        # inline code
    text = re.sub(r'\n+', ' ', text).strip()

    if len(text) <= max_len:
        return text
    # 在字元 max_len 附近找句尾
    cut = text.rfind('。', 0, max_len)
    if cut == -1:
        cut = text.rfind(' ', 0, max_len)
    if cut == -1:
        cut = max_len
    return text[:cut + 1].strip() + "..."


# ── slug 生成（與 Go 後端一致）──────────────────────────────────────────────

def to_slug(text: str) -> str:
    """生成 URL-friendly slug"""
    s = text.lower().strip()
    s = re.sub(r'[^\w\u4e00-\u9fff\s-]', '', s)
    s = re.sub(r'\s+', '-', s)
    s = re.sub(r'-+', '-', s)
    s = s.strip('-')
    # 只保留字母/數字/中文/連字號
    s = re.sub(r'[^a-z0-9\u4e00-\u9fff-]', '', s)
    return s or str(hash(text) & 0xffffff)


# ── API Client ───────────────────────────────────────────────────────────────

class BlogApiClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.token = None
        self.session = requests.Session()

    def login(self, email: str, password: str) -> bool:
        resp = self.session.post(
            f"{self.base_url}/api/auth/login",
            json={"email": email, "password": password},
            timeout=10,
        )
        data = resp.json()
        if not data.get("success"):
            print(f"[ERROR] 登入失敗: {data.get('message', resp.text)}")
            return False
        self.token = data["data"].get("accessToken") or data["data"].get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        print(f"[OK] 登入成功（{email}）")
        return True

    def import_categories(self, categories: list) -> dict:
        resp = self.session.post(
            f"{self.base_url}/api/admin/import/categories",
            json={"categories": categories},
            timeout=30,
        )
        return resp.json()

    def import_tags(self, tags: list) -> dict:
        resp = self.session.post(
            f"{self.base_url}/api/admin/import/tags",
            json={"tags": tags},
            timeout=30,
        )
        return resp.json()

    def import_articles(self, articles: list) -> dict:
        resp = self.session.post(
            f"{self.base_url}/api/admin/import/articles",
            json={"articles": articles},
            timeout=120,
        )
        return resp.json()


# ── 主程式 ───────────────────────────────────────────────────────────────────

def collect_articles(export_dir: str):
    """掃描 wordpress_export 目錄，回傳所有 .md 資料"""
    pattern = os.path.join(export_dir, "**", "*.md")
    files = sorted(glob.glob(pattern, recursive=True))
    print(f"[INFO] 找到 {len(files)} 篇文章")
    return files


def parse_article_file(filepath: str):
    """解析單篇文章檔案，回傳結構化資料"""
    with open(filepath, encoding="utf-8") as f:
        raw = f.read()

    meta, body = parse_front_matter(raw)

    # 標題：優先 front matter，fallback filename
    title = meta.get("title", "")
    if not title:
        basename = os.path.basename(filepath)
        # YYYY-MM-DD-Title.md → Title（還原連字號為空格）
        name_part = re.sub(r'^\d{4}-\d{2}-\d{2}-', '', basename.replace('.md', ''))
        title = name_part.replace('-', ' ').strip()

    # 發佈日期（ISO 格式）
    pub_date = str(meta.get("date", "")).strip()
    if pub_date and len(pub_date) == 10:
        pub_date = pub_date + "T00:00:00Z"
    elif not pub_date:
        # 從目錄名稱取日期
        dirname = os.path.basename(os.path.dirname(filepath))
        if re.match(r'\d{4}-\d{2}-\d{2}', dirname):
            pub_date = dirname + "T00:00:00Z"

    # 分類
    categories = meta.get("categories", [])
    if isinstance(categories, str):
        categories = [categories]
    categories = [c for c in categories if c and c != "未分類"]

    # 標籤
    tags = meta.get("tags", [])
    if isinstance(tags, str):
        tags = [tags] if tags else []
    tags = [t for t in tags if t]

    # 內容清理
    content = clean_content(body)

    # 摘要
    summary = extract_summary(content)

    return {
        "title": title,
        "publishedAt": pub_date,
        "categories": categories,
        "tags": tags,
        "content": content,
        "summary": summary,
    }


def run(args):
    client = BlogApiClient(args.api)
    if not client.login(args.email, args.password):
        sys.exit(1)

    # ── Step 1: 收集所有文章 ─────────────────────────────────────────────────
    files = collect_articles(args.dir)
    parsed = [parse_article_file(f) for f in files]

    # ── Step 2: 匯入分類 ─────────────────────────────────────────────────────
    all_cats = sorted({c for p in parsed for c in p["categories"]})
    if all_cats:
        cat_items = [{"name": c, "slug": to_slug(c)} for c in all_cats]
        print(f"\n[Step 1/3] 匯入 {len(cat_items)} 個分類...")
        result = client.import_categories(cat_items)
        if result.get("success"):
            d = result["data"]
            print(f"  → 新建: {d['created']}, 跳過(已存在): {d['skipped']}")
            # 建立名稱→slug map
            cat_slug_map = {item["name"]: item["slug"] for item in d["items"]}
        else:
            print(f"  [WARN] 分類匯入失敗: {result.get('message')}")
            cat_slug_map = {c: to_slug(c) for c in all_cats}
    else:
        cat_slug_map = {}
        print("[Step 1/3] 無分類需匯入，跳過")

    # ── Step 3: 匯入標籤 ─────────────────────────────────────────────────────
    all_tags = sorted({t for p in parsed for t in p["tags"]})
    if all_tags:
        tag_items = [{"name": t, "slug": to_slug(t)} for t in all_tags]
        print(f"\n[Step 2/3] 匯入 {len(tag_items)} 個標籤...")
        result = client.import_tags(tag_items)
        if result.get("success"):
            d = result["data"]
            print(f"  → 新建: {d['created']}, 跳過(已存在): {d['skipped']}")
            tag_slug_map = {item["name"]: item["slug"] for item in d["items"]}
        else:
            print(f"  [WARN] 標籤匯入失敗: {result.get('message')}")
            tag_slug_map = {t: to_slug(t) for t in all_tags}
    else:
        tag_slug_map = {}
        print("[Step 2/3] 無標籤需匯入，跳過")

    # ── Step 4: 批量匯入文章 ─────────────────────────────────────────────────
    print(f"\n[Step 3/3] 匯入 {len(parsed)} 篇文章（批次大小: {args.batch}）...")

    articles_payload = []
    for p in parsed:
        # 取第一個分類的 slug
        cat_slug = ""
        if p["categories"]:
            cat_name = p["categories"][0]
            cat_slug = cat_slug_map.get(cat_name, to_slug(cat_name))

        # 所有標籤的 slug list
        tag_slugs = [tag_slug_map.get(t, to_slug(t)) for t in p["tags"]]

        article = {
            "title": p["title"],
            "summary": p["summary"] or None,
            "content": p["content"] or None,
            "categorySlug": cat_slug,
            "tagSlugs": tag_slugs,
            "publish": True,
            "publishedAt": p["publishedAt"] or None,
        }
        articles_payload.append(article)

    # 分批匯入
    total_created = 0
    total_skipped = 0
    total_failed = 0

    for i in range(0, len(articles_payload), args.batch):
        batch = articles_payload[i:i + args.batch]
        batch_num = i // args.batch + 1
        print(f"  批次 {batch_num}: 匯入第 {i+1}~{min(i+len(batch), len(articles_payload))} 篇...")

        result = client.import_articles(batch)
        if result.get("success"):
            d = result["data"]
            total_created += d.get("created", 0)
            total_skipped += d.get("skipped", 0)
            total_failed += d.get("failed", 0)

            # 顯示失敗項目
            for item in d.get("items", []):
                if item.get("error"):
                    print(f"    [FAIL] {item['title']}: {item['error']}")
        else:
            print(f"  [ERROR] 批次失敗: {result.get('message')}")
            total_failed += len(batch)

    # ── 結果摘要 ──────────────────────────────────────────────────────────────
    print(f"""
╔══════════════════════════════════════╗
║          匯入完成！結果摘要           ║
╠══════════════════════════════════════╣
║  分類: {len(all_cats)} 個（新建 / 已存在）          ║
║  標籤: {len(all_tags)} 個（新建 / 已存在）         ║
║  文章:                               ║
║    ✓ 新建: {total_created:>3} 篇               ║
║    ○ 跳過: {total_skipped:>3} 篇（slug 已存在）   ║
║    ✗ 失敗: {total_failed:>3} 篇               ║
╚══════════════════════════════════════╝
""")

    if total_failed > 0:
        print(f"[WARN] {total_failed} 篇文章匯入失敗，請檢查以上錯誤訊息")
        sys.exit(1)


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="WordPress → PaulFun Blogger 批量匯入腳本")
    parser.add_argument(
        "--dir",
        default=os.path.expanduser("~/paul-test-gcp-vm/wordpress_full_export/wordpress_export"),
        help="wordpress_export 目錄路徑（預設：~/paul-test-gcp-vm/wordpress_full_export/wordpress_export）",
    )
    parser.add_argument(
        "--api",
        default="http://localhost:5266",
        help="Go API server URL（預設：http://localhost:5266）",
    )
    parser.add_argument("--email", default="pin0513@gmail.com", help="管理員 email")
    parser.add_argument("--password", default="Test1234", help="管理員密碼")
    parser.add_argument("--batch", type=int, default=20, help="每批文章數量（預設 20）")

    args = parser.parse_args()

    if not os.path.isdir(args.dir):
        # 嘗試從壓縮檔解壓
        tar_path = os.path.expanduser("~/paul-test-gcp-vm/wordpress_full_export.tar.gz")
        if os.path.exists(tar_path):
            import tarfile
            extract_dir = os.path.dirname(args.dir)
            print(f"[INFO] 解壓縮 {tar_path} → {extract_dir} ...")
            with tarfile.open(tar_path, "r:gz") as tar:
                tar.extractall(extract_dir)
            print("[OK] 解壓縮完成")
        else:
            print(f"[ERROR] 找不到 wordpress_export 目錄：{args.dir}")
            print("  請確認 --dir 參數或確保 ~/paul-test-gcp-vm/wordpress_full_export.tar.gz 存在")
            sys.exit(1)

    run(args)


if __name__ == "__main__":
    main()
