# CI/CD 自動部署設計紀錄（2026-07-02 落地）

## 背景

原部署 SOP 為手動四步驟（本機 build → save → scp → VM load + compose up）。本次以「低風險」為第一原則，把同一流程搬進 GitHub Actions，達成 push 到 main 即自動部署。

覆盤發現：同 GCP 專案（paul-test-174403）先前已為 `investment-platform-v2`、resume 等 repo 建過 WIF + deployer SA，但 paulfun-blogger 從未接上——本次補齊，且**不動既有 repo 的 provider / SA**。

## 方案評估（Decision）

| 方案 | 風險 | 結論 |
|---|---|---|
| A. GitHub Actions 複製現行 scp+load 流程 | 低：與手動 SOP 一致，VM 端零改動 | ✅ 採用 |
| B. 推 Artifact Registry，VM 拉 image | 中：VM 端要改 auth/compose、多計費元件 | 未來多 VM 再考慮 |
| C. VM 裝 watchtower / self-hosted runner | 高：EOL OS（Ubuntu 17.04）裝新常駐軟體 | 排除 |

## 架構

```
push main (frontend/** 或 backend-go/** 變更)
  └→ GitHub Actions runner（原生 amd64，不需交叉編譯）
       ├→ WIF keyless 認證（無 long-lived key）
       ├→ docker build → save tar.gz
       ├→ gcloud compute scp → VM:/tmp/
       └→ gcloud compute ssh：
            docker tag <image>:prod <image>:rollback   # 保留上一版
            docker load < /tmp/<image>.tar.gz
            docker-compose up -d --no-deps --force-recreate <service>
       └→ health check（fail → job 紅 + 印回退指令）
```

## GCP 設定值（一次性，已完成）

| 項目 | 值 |
|---|---|
| Service Account | `github-deployer@paul-test-174403.iam.gserviceaccount.com` |
| SA roles | `roles/compute.instanceAdmin.v1` + `roles/iam.serviceAccountUser` |
| WIF pool | `projects/329908581117/locations/global/workloadIdentityPools/github-pool`（沿用既有） |
| WIF provider | `paulfun-provider`，attribute-condition 鎖 `assertion.repository=='pin0513/paulfun-blogger'` |
| workloadIdentityUser binding | `principalSet://.../attribute.repository/pin0513/paulfun-blogger` |
| GitHub repo variables | `WIF_PROVIDER`、`WIF_SERVICE_ACCOUNT`（非機密，用 variable 不用 secret） |

## 低風險護欄

1. **concurrency: deploy-prod** — VM 只有 1.7G RAM 無 swap，同時只跑一條部署
2. **frontend / backend job 串行**（needs），不並行重建容器
3. **rollback tag** — load 前先把現行 prod retag 成 `:rollback`，一行指令可回退（runbook 見 CLAUDE.md，已實測）
4. **health check** — frontend curl 首頁、backend curl `/api/articles?pageSize=1` 驗 `success:true`，3 次 retry 失敗即標紅
5. **dark-commitment 分兩階段**：Phase 1 只有 workflow_dispatch（手動觸發驗證 pipeline）→ Phase 2 才開 push 自動觸發

## 踩坑紀錄

- CI 以 `runner` 使用者 SSH 進 VM（gcloud 以本機 username 建帳號），**沒有權限寫 `/home/paul_huang/`** → scp 目的地改 `/tmp/`、compose 檔用絕對路徑 `/home/paul_huang/paulfun-blogger/docker-compose.prod.yml`
- IAM 資源建立後有數秒 propagation delay，describe 要 retry

## 驗證紀錄（2026-07-03）

| 驗證 | 結果 |
|---|---|
| dispatch frontend | ✅ 2m41s 綠燈，網站 200，rollback tag 保留 |
| dispatch backend | ✅ 1m36s 綠燈，API success:true |
| 回退演練 | ✅ retag rollback → up -d → 網站 200 → 再 dispatch 復原成功 |
| Phase 2 push 觸發 | 見 workflow 檔 push trigger 啟用 commit |
