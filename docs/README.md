# wandering-journal 私人日誌設計提案

日期：2026-10-30（Asia/Taipei）。基準：`main@17abbf16eaf72377c1a35eb7e02903153d5ef762`。

本次是程式盤點、備份規劃與功能設計；未實作登入、同步或 Apple Journal 解析器，未連接 Supabase、執行 migration、讀取使用者日記、合併 main 或部署。`scripts/verify_legacy_backup.py` 是離線、唯讀的既有備份檢查工具。

1. [現有儲存盤點](storage-audit.md)
2. [完整備份與還原](backup-and-recovery.md)
3. [私人登入、Supabase 與離線設計](private-sync-design.md)
4. [Apple Journal 匯入設計](apple-journal-import.md)

## 實作順序與完成條件

|階段|交付|必要驗收|
|---|---|---|
|0：資料保全|每台裝置匯出、完整性清單、隔離環境還原|文件／附件數量、SHA-256、筆記／清單／收據／PDF 都核對；原資料保持可讀|
|1：本機儲存|將目前 shim 抽成 LocalRepository；一致快照、原子還原、版本轉換|關閉重開、quota、匯入中斷、跨頁籤寫入不遺失|
|2：私人登入|獨立開發 Supabase、邀請單一帳號、RLS、私人 Storage|匿名及另一帳號直接呼叫 API 都拒絕；登出／換帳號不洩漏|
|3：同步與離線|outbox、CAS revision、變更游標、衝突保留、離線重啟|兩裝置同改、刪除衝突、斷線／重送／token 過期、附件續傳；不能誤示已同步|
|4：Apple Journal|本機解析、預覽、分批匯入、去重、可回復|真實去識別樣本、時區／媒體／惡意壓縮檔／取消／重複匯入測試|
|5：發版審閱|每階段 PR、獨立測試報告、回復方案|人工核准合併及正式部署；不因 PR 通過就自動部署|

所有階段先進 PR。此提案預設 `development → main` 為審閱方向，不啟用自動合併。後續功能可用 `feature/* → development`，整合後再送 main。開發預覽必須使用不同 origin 與不同 Supabase 專案，避免讀寫現有 IndexedDB 或正式雲端。

## 待取得的驗證材料

- 實際使用的網址、各裝置／瀏覽器／PWA 的資料所在位置，是否仍使用 Claude artifact。
- 各裝置匯出檔的唯讀檢查與還原演練；不能以 GitHub 原始碼備份代替。
- 開發用 Supabase 專案、預定邀請帳號（透過私人設定提供；不寫進公開 repo）、資料量與附件大小。
- Apple Journal 的 OS 版本與去識別 ZIP 樣本；目前沒有樣本，不宣稱已相容其內部格式。
- 正式 hosting 與部署觸發設定；repo 沒有 workflow 並不能排除外部自動部署。

## 異動紀錄

- 2026-10-30：新增上述盤點、設計及唯讀備份檢查工具；原應用程式與 service worker 未更動。精確提交時間由 Git commit 記錄。
