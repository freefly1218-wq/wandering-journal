# 完整備份與還原計畫

狀態：原始碼備份已在本機製作並通過 `git bundle verify`；使用者資料備份尚未執行。公開 GitHub 只放程式、文件及合成測試資料，不放日記、位置、帳號、ZIP、JSON 備份或雲端憑證。

## 立即保全既有資料

1. 列出每台裝置使用的網址、瀏覽器及 PWA。保留現有 app，不清除網站資料、不移除 PWA、不改正式 origin。備份前關閉其他頁籤、停止編輯與附件上傳，重開唯一一頁，等各區載入完成；這只是降低目前匯出不一致風險，不能代替新版快照。
2. 在「花費 → 匯入／匯出內容」選「匯出備份檔」。每台裝置分別存檔，檔名附裝置代號及時間，避免把尚未同步的不同內容相互覆蓋。用 Files/Finder 確認檔案實際存在；下載成功訊息不等於保存已驗證。
3. 若只見「匯出內容檔」，可能是 Claude 模式：現有檔案不含完整私人清單、筆記或附件。先保存內容檔，再規劃平台能力內的逐筆文件及附件匯出；無權讀取他人私人資料時明列未涵蓋項目，不宣稱完整。
4. 用唯讀檢查器檢查本機 v1 備份：`python3 scripts/verify_legacy_backup.py /absolute/path/to/trip-backup.json`。輸出只有數量、雜湊與問題代碼，沒有日記文字或檔內路徑。它驗證結構、base64 及已知引用，不能證明匯出時捕捉全部裝置資料，也不會下載遠端附件。
5. 對照原 app 各區筆數及附件數。另保存無法攜出的 PDF／遠端附件原檔，列出缺少項目；已被縮圖的照片若需要原圖，另備份手機原檔。
6. 以作業系統加密儲存或可信任的加密備份工具保留：本機工作副本＋另一媒介副本＋一份加密異地副本。密碼／復原金鑰分開保管；不以公開 repo、issue 或 PR 上傳私人備份。
7. 在獨立 origin／乾淨瀏覽器 profile 還原演練，核對筆記日期／文字、清單勾選、花費、照片、收據、PDF 及地圖方案。現有匯入對 local.docs/assets 是合併，請只在空白測試空間演練，不能測在正式資料上。

## 新版完整備份規格（提案，尚未實作）

使用 `wandering-journal-backup` v2 ZIP，避免所有附件轉 base64 帶來額外記憶體壓力。舊 `trip-content` v1 走相容轉換器，原檔永不覆寫。

```text
manifest.json                 # format, version, appVersion, schemaVersion, createdAt
                              # snapshotId, coverage, counts, per-file byteLength + sha256
records.jsonl                 # 每行含 kind, id, legacyPath, payload, revision, deletedAt
assets/<asset-id>/original     # 已儲存的原始 bytes，不儲存臨時 blob/signed URL
state.json                    # mapping、import batches、conflicts、pending operations
                              # 同步游標僅診斷；還原時必須重新完整對帳
```

`coverage` 必須明列每個裝置／資料來源與遺漏範圍。JSONL 保留未知欄位；Blob 以穩定 asset ID 引用，manifest 記 MIME／bytes／checksum／引用文件。備份包含所有 docs、資產（含尚未關聯的資產）、衝突副本、tombstones、尚未同步的 outbox 與 import staging；不包含 access/refresh token、密碼、service role key。manifest 不暴露不必要的姓名／精確位置。

### 一致快照與驗證

- 透過全 app 寫入鎖，暫停同步及其他頁籤寫入；排空附件工作。以同一 IndexedDB readonly transaction 讀取 docs、assets、outbox、conflicts、imports。先讀完全部 raw values，再在 transaction 外做 Blob 編碼與雜湊；不能 await 編碼後才繼續讀 transaction。
- 匯出器包含檔案總數／總 bytes、缺附件清單及完成狀態。任何失敗不產出標示「完整」的備份。大型資料以分卷或串流實作，附取消與可用空間檢查。
- 驗證器核對 schema、唯一 IDs、每個 SHA-256、所有引用、筆數，解碼抽樣媒體。未簽章的 SHA-256 只能偵測損壞，不能驗證來源可信。

### 還原與退回

1. 還原前先備份目前狀態；新檔只進隔離 staging namespace，驗證完成以前不接觸現有資料。外來 HTML 使用同一受限解析器。
2. 預覽選擇「建立另一份旅程」（預設）或「完整取代」。完整取代明列刪除量，取得當次明確操作；不能以「合併」冒充一模一樣的還原。
3. 小型資料單一 IndexedDB readwrite transaction 寫入各 stores；大型資料先分批寫入新 generation，最後以單一 transaction 切換 active generation。讀取層都必須按 generation 存取。
4. 保留舊 generation 與復原點，重開核對後才標記完成。失敗保留原 generation；中斷重開恢復 staging 狀態，不自動送往雲端。
5. 還原到帳號時由登入身分重建 owner，不信任備份內的 user_id。先用新旅程 ID 對帳；outbox 產生新的 operation IDs，不重用過去 receipt。不直接重播過期 token、舊 sync cursor 或舊 CAS revision。

## Supabase 後續備份

同步會傳播誤刪，因此同步不是備份。資料庫備份也不包含 Storage 的實際物件 bytes；需要分開保存及一起驗證。[Supabase 備份文件](https://supabase.com/docs/guides/platform/backups)

建議目標（須實作並演練才算達成）：已同步資料 RPO 24 小時，RTO 4 小時；未上傳的離線資料只存在裝置，不受此 RPO 保證。保留 7 份每日、4 份每週、12 份每月加密副本；每次 migration 前另留一份。依實際用量確認成本後再啟用排程。

每次備份包含一致的 SQL schema／應用資料／RLS／函式、Auth 復原所需設定清單、私有 bucket 物件及 checksum、應用程式 commit、migration version；受限憑證由私人密鑰管理另存，不進一般備份 manifest。確認所選 Supabase dump 流程對 auth/storage schemas 的預設排除，再補足需要部分。不要假設 db dump 自動備齊帳號或所有角色。

雲端一致性：建立 backup run 記錄與資料庫 snapshot 水位，複製 snapshot 引用的所有不可變 object keys，核對後標記完成。GC 對備份中的物件保留 lease；複製途中不得清除物件。還原到獨立專案，重建 bucket 與權限、恢復必要 Auth identities 後核對 user UUID；若需重新邀請，透過受控 mapping 改 owner，不能讓檔案宣告自己的擁有者。每月演練一次，記實測 RTO、漏失量及附件校驗結果。
