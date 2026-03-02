#!/usr/bin/env bash
#
# 一次性遷移腳本：將現有圖片上傳到 Cloudflare R2 並更新 DB URL
#
# 使用前請確認：
# 1. 已安裝 AWS CLI v2 (brew install awscli)
# 2. 已設定以下環境變數（或寫入 .env）
# 3. 可連線到 PostgreSQL
#
# 用法:
#   export R2_ACCOUNT_ID=xxx
#   export R2_ACCESS_KEY_ID=xxx
#   export R2_SECRET_ACCESS_KEY=xxx
#   export R2_BUCKET=paulfun-images
#   export R2_PUBLIC_URL=https://img.paulfun.net
#   export DB_HOST=localhost DB_PORT=5433 DB_USER=postgres DB_PASSWORD=xxx DB_NAME=paulfun_blogger
#   bash scripts/migrate-to-r2.sh

set -euo pipefail

# ── 設定 ──────────────────────────────────────────────────────────────────

R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
BUCKET="${R2_BUCKET:-paulfun-images}"
PUBLIC_URL="${R2_PUBLIC_URL:-https://img.paulfun.net}"

# AWS CLI profile for R2
export AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}"
export AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}"
export AWS_DEFAULT_REGION="auto"

PSQL="psql -h ${DB_HOST:-localhost} -p ${DB_PORT:-5433} -U ${DB_USER:-postgres} -d ${DB_NAME:-paulfun_blogger}"

echo "========================================="
echo "  Cloudflare R2 圖片遷移腳本"
echo "========================================="
echo "R2 Endpoint: ${R2_ENDPOINT}"
echo "Bucket: ${BUCKET}"
echo "Public URL: ${PUBLIC_URL}"
echo ""

# ── Step 1: 上傳站內靜態圖片 ──────────────────────────────────────────────

STATIC_DIR="frontend/public/images"
if [ -d "$STATIC_DIR" ]; then
  echo ">>> Step 1: 上傳站內靜態圖片 ($STATIC_DIR → static/)"
  aws s3 sync "$STATIC_DIR" "s3://${BUCKET}/static/" \
    --endpoint-url "${R2_ENDPOINT}" \
    --no-progress
  echo "    完成！"
else
  echo ">>> Step 1: 跳過（$STATIC_DIR 不存在）"
fi
echo ""

# ── Step 2: 上傳文章封面 ──────────────────────────────────────────────────

COVERS_DIR="covers"
if [ -d "$COVERS_DIR" ]; then
  echo ">>> Step 2: 上傳文章封面 ($COVERS_DIR → covers/)"
  aws s3 sync "$COVERS_DIR" "s3://${BUCKET}/covers/" \
    --endpoint-url "${R2_ENDPOINT}" \
    --no-progress
  echo "    完成！"
else
  echo ">>> Step 2: 跳過（$COVERS_DIR 不存在）"
fi
echo ""

# ── Step 3: 上傳使用者上傳的媒體檔案 ──────────────────────────────────────

UPLOADS_DIR="backend-go/uploads"
if [ -d "$UPLOADS_DIR" ]; then
  echo ">>> Step 3: 上傳使用者媒體 ($UPLOADS_DIR → uploads/)"
  aws s3 sync "$UPLOADS_DIR" "s3://${BUCKET}/uploads/" \
    --endpoint-url "${R2_ENDPOINT}" \
    --no-progress
  echo "    完成！"
else
  echo ">>> Step 3: 跳過（$UPLOADS_DIR 不存在）"
fi
echo ""

# ── Step 4: 更新 DB 中的 file_path（media 表）──────────────────────────────

echo ">>> Step 4: 更新 DB — media.file_path"
echo "    舊格式: uploads/2026/03/file.jpg"
echo "    新格式: uploads/2026/03/file.jpg (保持不變，URL 由 Storage.URL() 生成)"
echo "    → media 表的 file_path 不需要改變（key 格式不變）"
echo ""

# ── Step 5: 更新 DB — article.cover_image（如果是相對路徑）────────────────

echo ">>> Step 5: 更新 DB — article.cover_image"
COUNT=$($PSQL -t -c "SELECT COUNT(*) FROM articles WHERE cover_image IS NOT NULL AND cover_image != '' AND cover_image NOT LIKE 'http%';" 2>/dev/null || echo "0")
COUNT=$(echo "$COUNT" | tr -d ' ')

if [ "$COUNT" -gt "0" ]; then
  echo "    找到 $COUNT 筆需要更新的封面圖片"
  $PSQL -c "
    UPDATE articles
    SET cover_image = '${PUBLIC_URL}/' || cover_image
    WHERE cover_image IS NOT NULL
      AND cover_image != ''
      AND cover_image NOT LIKE 'http%';
  "
  echo "    完成！"
else
  echo "    無需更新（所有 cover_image 已是完整 URL 或為空）"
fi
echo ""

# ── 驗證 ──────────────────────────────────────────────────────────────────

echo ">>> 驗證：列出 R2 bucket 中的物件數量"
TOTAL=$(aws s3 ls "s3://${BUCKET}/" --endpoint-url "${R2_ENDPOINT}" --recursive --summarize 2>/dev/null | grep "Total Objects" || echo "無法取得")
echo "    ${TOTAL}"
echo ""

echo "========================================="
echo "  遷移完成！"
echo ""
echo "  下一步："
echo "  1. 測試：curl ${PUBLIC_URL}/static/avatar-paul.jpg"
echo "  2. 設定 GCP .env: STORAGE_TYPE=r2"
echo "  3. 重新部署：docker compose -f docker-compose.prod.yml up -d"
echo "========================================="
