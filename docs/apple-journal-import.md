# Apple Journal 匯入設計

狀態：規格提案，沒有取得真實匯出樣本，未實作或宣稱格式相容。Apple 官方確認可以輸出包含照片、位置及其他媒體的 ZIP；本次查閱的官方文件沒有提供穩定的機器可讀 schema。[Apple 官方說明](https://support.apple.com/zh-tw/121822)

輸入為使用者手動從 Journal 輸出的檔案；不要求 Apple 帳號密碼、不連接 iCloud 或讀取 iPhone 私人資料庫。PDF 可當保存附件，但不承諾從 PDF 還原原始日誌與媒體結構。

## 使用者流程

「匯入 Apple Journal」→ 選 ZIP → 本機檢查及格式辨識 → 預覽條目／日期範圍／媒體／重複／無法判讀項 → 選目標旅程或另建日誌 → 明確選擇是否排入私人雲端同步 → 匯入 → 結果摘要與批次復原。

解析階段不傳送檔案。預覽預設「只存本機」，使用者主動選同步後才傳選取條目與附件。不要把整份 Apple 原始匯出 ZIP 自動上傳 Supabase；原檔由使用者另行加密保存。日期、位置、人物、情緒等均視為私人內容，不進 log／analytics。

## 格式辨識與安全邊界

- ZIP 先讀中央目錄，檢查 magic bytes、檔案數、單檔及總解壓 bytes、壓縮比、可用空間；實際解壓串流仍累計限制，不能信任標頭宣告。初始保守上限提案：ZIP 250 MiB、解壓 1 GiB、10,000 檔、單檔 100 MiB、壓縮比 100:1；需以真機及實際樣本調整，超限提供分批方案。
- 拒絕 `..`、絕對路徑、反斜線穿越、NUL、symlink、重複正規化路徑及巢狀壓縮檔；保留大小寫與 Unicode 正規化碰撞報告。密碼壓縮檔明確回報不支援。
- 有實際樣本後建立 `apple-journal/<format-version>` adapter 與去識別 fixtures。依目錄特徵、metadata 欄位與檔案內容識別，不能只憑 ZIP 檔名認定相容。可能遇到 HTML、JSON 或其他結構，未辨識即停止寫入，列出支援範圍。
- HTML 先以沒有腳本及網路載入能力的解析器處理為允許的文字／段落／清單結構；不掛到 live DOM，不使用 innerHTML 顯示原文，不執行 JS／event handlers／iframe／SVG。預覽只用 textContent 或受限內容樹。
- 相對媒體引用只解析到 ZIP 內已校驗檔案。禁止解析過程 fetch 外部 URLs、讀本機路徑或觸發追蹤圖片。偵測 MIME 與副檔名不一致；未知格式保留為不可執行附件，先不渲染。
- 預覽完成前不建立正式 documents、不排 outbox；取消、超限、未知 schema 均維持原資料不變。

## 資料映射與無損原則

|來源資料|目標與處理|
|---|---|
|穩定 entry ID（若有）|`source_key`，來源命名空間為 apple-journal；不是目標 document ID|
|標題／內文|note.title、text／受限段落結構；保留原始字串與未知 metadata 供後續重解析|
|建立／編輯時間|保留原始時間值與時區，能確定才轉 UTC；只含日期則 `local_date`，不補午夜 UTC|
|沒有時區的本地時間|標示 timezone_unknown，由使用者預覽選擇；不得用伺服器時間猜測|
|照片／影片／音訊|保存 ZIP 中原始 bytes、MIME、大小、SHA-256；縮圖另存衍生版本，不替代原件|
|位置|有明確座標才存 lat/lng；保留標籤、原 metadata、精度；不自動查詢第三方地圖|
|書籤／標籤／其他附件|可識別則映射；未知欄位保留原始資料並列警示，不默默丟棄|
|缺少附件或破損條目|列出問題與受影響條目；預設排除，允許使用者明確選擇部分匯入並留報告|

保留 `source_digest`、來源 adapter version、batch_id 及每檔 checksum。來源原始 HTML 若保存為檔案，不給同 origin 可執行 URL，不 inline 開啟；原檔只供使用者下載封存。編輯器不提供執行原始 HTML 的入口。

## 去重、更新與分批提交

有穩定 entry ID 時以 `(owner, trip, source, source_key)` 去重。沒有 ID 時，adapter 基於已驗證欄位制定 canonical fingerprint（原日期字串、正規化文字、依固定順序排序的附件 hashes）；不能只以日期或標題去重。若不同來源其實相同但 fingerprint 改變，列疑似重複讓使用者選擇。

同 source_key 且 digest 相同直接略過；digest 不同視為來源更新，顯示 diff，預設保留本機編輯與來源副本；不能覆寫使用者已修改的 note。帳號間不能共用去重索引或透露他人存在的檔案。

解析及匯入由 Worker 分批執行，提供進度與取消。完整解析、校驗及預覽資料寫入隔離 staging 後，才允許 commit。每批 transaction 寫 documents／assets／import_entries／batch checkpoint；同步關閉時沒有 outbox。若選擇同步，先本機完成整批，再解除 batch 的同步屏障；避免使用者取消時已有半批日記被上傳。大批次可明確選擇保留部分，報告已提交與未提交數量。

重開依 batch_id 續作，重送不重複建資料。取消尚未 commit 的 staging 直接釋放；「復原此批匯入」只處理該批建立且之後未被編輯的記錄，已編輯項留待確認。已同步項透過 tombstone 與相同衝突機制復原，不能直接刪除遠端物件；共用附件依引用及備份 lease 延後 GC。

## 驗收矩陣

|測試|預期|
|---|---|
|同一 ZIP 再匯入、重新封裝但內容相同|不重複建立條目|
|來源 entry ID 相同但內文變更|預覽更新；不蓋掉本機修改|
|跨時區、日光節約、只有日期、缺時區|保留原值與不確定性，不改成錯誤日期|
|多照片、影片、音訊、位置、HEIC/未知媒體|原 bytes/hash 留存；不支援預覽有清楚標示|
|缺檔、壞 ZIP、錯 MIME、重複路徑、Zip Slip、zip bomb|拒絕或明確部分匯入；原資料不變|
|HTML script/event/iframe、外部圖片與追蹤 URL|不執行、不送出任何網路請求|
|quota、強制關閉、批次中斷、取消、斷網|已 commit 可追溯，可續作或復原；未提交不污染正式資料|
|未選同步／明確選同步／匯入中換帳號|前者零上傳；後者只傳選取資料；換帳號隔離|

正式驗收前必須取得各目標 OS 匯出的去識別真實樣本，對照原 Journal 條目數、文字、日期與附件逐項核對。合成 fixtures 僅驗證解析安全與程式行為，不能代替 Apple 格式相容證據。
