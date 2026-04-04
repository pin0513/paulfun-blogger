#!/usr/bin/env bash
# 使用 wrangler r2 object put 批次上傳圖片到 R2
set -euo pipefail

BUCKET="paulfun-images"
BASE_DIR="/Users/paul_huang/DEV/projects/paulfun-blogger"
SUCCESS=0
FAIL=0

upload_file() {
  local local_path="$1"
  local r2_key="$2"

  # 偵測 content-type
  local ct
  local lp
  lp=$(echo "$local_path" | tr '[:upper:]' '[:lower:]')
  case "$lp" in
    *.jpg|*.jpeg) ct="image/jpeg" ;;
    *.png) ct="image/png" ;;
    *.gif) ct="image/gif" ;;
    *.webp) ct="image/webp" ;;
    *.svg) ct="image/svg+xml" ;;
    *) ct="application/octet-stream" ;;
  esac

  if wrangler r2 object put "${BUCKET}/${r2_key}" --file="$local_path" --content-type="$ct" --remote > /dev/null 2>&1; then
    echo "  ✅ ${r2_key}"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "  ❌ ${r2_key}"
    FAIL=$((FAIL + 1))
  fi
}

echo "========================================="
echo "  上傳圖片到 Cloudflare R2"
echo "========================================="
echo ""

# Step 1: 靜態圖片 → static/
echo ">>> Step 1: 靜態圖片 (frontend/public/images/ → static/)"
for f in "$BASE_DIR"/frontend/public/images/*; do
  [ -f "$f" ] || continue
  filename=$(basename "$f")
  upload_file "$f" "static/${filename}"
done
echo ""

# Step 2: 封面圖 → covers/
echo ">>> Step 2: 封面圖 (covers/ → covers/)"
for f in "$BASE_DIR"/covers/*; do
  [ -f "$f" ] || continue
  filename=$(basename "$f")
  upload_file "$f" "covers/${filename}"
done
echo ""

# Step 3: 使用者上傳 → uploads/
echo ">>> Step 3: 使用者上傳 (backend-go/uploads/ → uploads/)"
find "$BASE_DIR/backend-go/uploads" -type f | while read -r f; do
  # 取得相對於 uploads/ 的路徑
  rel_path="${f#$BASE_DIR/backend-go/uploads/}"
  upload_file "$f" "uploads/${rel_path}"
done
echo ""

echo "========================================="
echo "  完成！成功: ${SUCCESS}, 失敗: ${FAIL}"
echo "========================================="
