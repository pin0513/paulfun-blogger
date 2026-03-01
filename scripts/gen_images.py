#!/usr/bin/env python3
"""
gen_images.py — 用 Gemini API 產生部落格靜態圖片

產出：
  - frontend/public/images/hero.png      (1920x600)
  - frontend/public/images/avatar.png    (400x400)
  - frontend/public/images/default-cover.png (1200x630)

用法：
    GEMINI_API_KEY=xxx python3 scripts/gen_images.py

Dependencies:
    pip install google-genai Pillow
"""

import os
import sys
from pathlib import Path

from google import genai
from google.genai import types
from PIL import Image
import io

# ── 設定 ──────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = PROJECT_ROOT / "frontend" / "public" / "images"

IMAGES = [
    {
        "name": "hero.png",
        "width": 1920,
        "height": 600,
        "prompt": (
            "A wide panoramic illustration in flat minimalist style for a tech blog hero banner. "
            "Dark background (#0A0A0F). Abstract geometric shapes, floating code brackets, "
            "circuit board patterns, and subtle glowing nodes. "
            "Use neon cyan (#00D4FF), purple (#7C3AED), and pink (#FF006E) accents. "
            "Clean, modern, no text, no people. Aspect ratio 3.2:1."
        ),
    },
    {
        "name": "avatar.png",
        "width": 400,
        "height": 400,
        "prompt": (
            "A flat minimalist avatar illustration of a friendly male developer character. "
            "Simple geometric style, dark background. "
            "The character has short dark hair, glasses, and a slight smile. "
            "Wearing a hoodie. Neon cyan (#00D4FF) and purple (#7C3AED) color accents. "
            "Clean vector art style, no text. Square format."
        ),
    },
    {
        "name": "default-cover.png",
        "width": 1200,
        "height": 630,
        "prompt": (
            "A flat minimalist illustration for a default blog post cover image. "
            "Dark background (#0A0A0F). Abstract tech elements: floating code symbols "
            "like angle brackets, curly braces, semicolons arranged artistically. "
            "Subtle grid pattern. Neon cyan (#00D4FF) and purple (#7C3AED) glowing accents. "
            "Clean, modern, no text, no people. Aspect ratio 1.9:1."
        ),
    },
]


def generate_image(client: genai.Client, image_config: dict) -> bytes:
    """用 Gemini 產生單張圖片，回傳 PNG bytes"""
    prompt = image_config["prompt"]
    w, h = image_config["width"], image_config["height"]

    print(f"[GEN] {image_config['name']} ({w}x{h})...")

    response = client.models.generate_content(
        model="gemini-2.0-flash-exp-image-generation",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
        ),
    )

    # 從 response 中取出圖片
    for part in response.candidates[0].content.parts:
        if part.inline_data is not None:
            raw_bytes = part.inline_data.data
            # 用 Pillow 調整到指定尺寸
            img = Image.open(io.BytesIO(raw_bytes))
            img = img.resize((w, h), Image.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format="PNG", quality=95)
            return buf.getvalue()

    raise RuntimeError(f"Gemini 未回傳圖片 for {image_config['name']}")


def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: 請設定 GEMINI_API_KEY 環境變數")
        print("用法: GEMINI_API_KEY=xxx python3 scripts/gen_images.py")
        sys.exit(1)

    client = genai.Client(api_key=api_key)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    success = 0
    for img_cfg in IMAGES:
        out_path = OUT_DIR / img_cfg["name"]
        try:
            png_data = generate_image(client, img_cfg)
            out_path.write_bytes(png_data)
            size_kb = len(png_data) / 1024
            print(f"[OK]  {out_path.relative_to(PROJECT_ROOT)}  ({size_kb:.0f} KB)")
            success += 1
        except Exception as e:
            print(f"[ERR] {img_cfg['name']}: {e}")

    print(f"\n完成：{success}/{len(IMAGES)} 張圖片")
    print(f"輸出目錄：{OUT_DIR}")


if __name__ == "__main__":
    main()
