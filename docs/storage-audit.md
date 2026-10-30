# 現有資料儲存盤點

基準為 `17abbf1`。以下由原始碼確認；未讀取任何實際日記資料或雲端後台。

## 兩種執行模式

|模式|儲存與身分|證據|
|---|---|---|
|一般 HTTPS 網頁／GitHub Pages|IndexedDB `trip-local` v1，`docs`、`assets` 兩個 object stores；記憶體 Map 作快取；使用者固定 `me`、isOwner/canEdit/can 永遠 true|`trip.html:829–914`|
|Claude artifact|既有 `window.claude.use('db'/'user'/'assets'/'downloads')`，資料／權限依平台能力；repo 無後端規則的執行或部署證據|`trip.html:830`、`2660–2680`；README 規則僅是宣告範例|

獨立版沒有 Supabase、私人帳號登入、遠端同步或多裝置合併。`onSnapshot` 是本頁記憶體訂閱；不是遠端即時服務。IndexedDB 依 origin 隔離，同 origin 的其他路徑可能共用同一個 `trip-local`；換網域、瀏覽器或裝置會看到另一份資料。`localStorage['trip-day']` 只記錄所選天數。

## 文件與附件

|路徑／位置|內容|現有匯出|
|---|---|---|
|`meta/config`|旅程日期、區域、同行人、分組、匯率、行前提示與清單預設|config|
|`private/config`|航班住宿、現金等 HTML|private|
|`items/<id>`|行程、金額、位置、交通班次、PDF 引用|data.items|
|`split/<id>`、`misc/<id>`|分攤／零星支出及收據 asset IDs|data.split／misc|
|`todos/<id>`|待辦|data.todos|
|`meta/maps`、`meta/plans`|地圖與方案選擇|data.meta|
|`notes/<uid>`、`notes/<uid>/items/<id>`|筆記作者索引、日期、文字與照片 IDs|只有 LOCAL 時的 local.docs|
|`data/users/<uid>/<id>`|私人攜帶清單及 packmeta|只有 LOCAL 時的 local.docs|
|assets object store|以隨機 hex ID 為 key 的 Blob；執行時另產生短暫 blob URL|只有 LOCAL 時的 local.assets，以 data URL/base64 儲存全部 Blob|

`trip.html:2443–2450` 組成 `trip-content` v1；一般網頁檔名是 `trip-backup-*`。Claude 內容檔沒有 local 區，不能當完整私人備份。README 第 6 節描述主要是 Claude 內容檔，須按執行模式判讀。

照片已在寫入時壓成最長邊 1600 px JPEG，收據為 2000 px（`1838–1858`、`1933–1946`）。備份能保存目前儲存的 Blob，無法還原被壓縮前的手機原檔。PDF 的 `url`／`pages` 使用 `/_blob/<id>`；部分顯示邏輯仍直接使用這個路徑（`1407–1408`、`2334–2336`），在獨立版需納入連結重建驗證。

## 發現與處理優先序

|優先|發現與影響|設計要求|
|---|---|---|
|P1|本機 user API 永遠允許；只隱藏畫面不是私人登入|雲端由 Auth + RLS 強制；本機提供明確裝置解鎖模式|
|P1|`renderConfigBlocks()` 將匯入設定 HTML 放進 innerHTML（`988–999`），惡意備份可能執行 HTML 事件等內容|所有外來 HTML 以受限格式重建／消毒；在持有登入 token 的應用中先解決此處|
|P1|匯出混合 UI 記憶體資料與 DB 私人設定，沒有跨 docs/assets 的一致快照（`920–925`、`2443–2449`）|暫停寫入／排空操作，單一唯讀 transaction 擷取兩 stores，之後才編碼|
|P1|還原多個獨立寫入／刪除，失敗會部分完成（`2468–2488`）；local.restore 只合併、略過同 ID 附件，不移除多餘私人文件（`926–934`）|先驗證並 staging；明確區分完整取代與合併；原子切換與復原點|
|P1|原生儲存清除／裝置遺失會失去未匯出的資料；persist() 請求未檢查結果|顯示持久化與容量狀態；獨立備份、提醒及還原演練|
|P2|記憶體 Map 只在啟動讀入；多頁籤可互相覆蓋、不會同步顯示|transaction + revision + Web Locks/BroadcastChannel，舊頁籤禁止越版寫入|
|P2|筆記／收據刪除會立刻刪除 Blob（`1881–1888`、`1951–1960`）|tombstone 與延後 GC，備份保留政策後才清除|
|P2|sw.js 安裝逐項忽略失敗，立刻 skipWaiting；activate 清除所有非同版本 cache|必要 shell 全部成功才就緒；僅刪本 app 前綴 cache；有未存工作時延後更新|
|P2|sw.js 對 same-origin GET 廣泛快取，HTML/JSON 失敗回傳 trip.html|改為明確 shell allowlist；不快取 Auth/API/簽名網址，非導航不得回傳 HTML|
|P2|外部 CDN 函式庫／字型及動態地圖請求；地圖資料檔不在 repo|離線核心資產隨版本封裝；無網路時地圖／PDF 顯示能力限制，不阻擋文字記錄|

## 證據邊界

- 公開 GitHub repo 目前是通用旅行框架與範例，不能推出任何裝置已備份，亦不能判斷正式網址或外部 hosting 設定。
- 觀察到 main 未受分支保護；本次不調整 repo 權限或分支保護。
- GitHub 連線讀取成功，但 create_branch 回傳 403；之後使用已登入的 GitHub 網頁，成功從相同基準建立遠端 development。main 保持原提交；後續變更透過 PR 審閱。
