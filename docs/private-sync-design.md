# 私人登入、Supabase 雲端同步與離線設計

狀態：設計提案，未建立 Supabase 或套用 SQL。先抽離目前 `window.claude` shim 為明確的 Repository，保留舊資料唯讀與備份；應用只依賴本機 Repository，遠端同步作為旁路服務。

## 使用流程與模組

首次：歡迎 → 邀請帳號登入 → 選擇是否保留此裝置離線資料 → 舊資料預覽／另建旅程 → 儲存於本機 → 背景同步。沒有邀請帳號時不能建立雲端帳號。斷網新裝置不提供假登入；已授權裝置可以選擇本機解鎖後離線記錄。

```text
UI → LocalRepository → IndexedDB：documents / assets / outbox / conflicts / syncState
                             ↑                    ↓
                  Import staging         SyncEngine → Supabase Auth / RPC / private Storage
BackupService ← 一致快照
```

建議模組：`storage/local-repository`、`auth/session-controller`、`sync/engine`、`sync/conflicts`、`backup/snapshot`、`import/apple-journal`。先寫 adapter contract，再拆單一 HTML；各步保留舊匯出相容性。登入錯誤不得 fallback 成 `isOwner: true`。

## 私人登入與授權

- 預設單一被邀請帳號。Supabase 關閉新使用者註冊、匿名登入與未使用的 providers；由管理端先邀請，另外維護不可由使用者自行寫入的 `private.allowed_users(user_id, enabled)`。只看前端 email allowlist 不足以授權。[Auth 設定](https://supabase.com/docs/guides/auth/general-configuration)
- 預設 email OTP，前端呼叫 `signInWithOtp({ email, options: { shouldCreateUser: false } })`；後端 email template 使用 Token 以送驗證碼。明列寄送中／冷卻／過期／驗證失敗；回應避免洩漏帳號存在與否。[OTP 文件](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- 初次邀請流程需在線完成；設定開發及正式 redirect URL 的精確 allowlist。公開環境只含 project URL 與 publishable key，禁止 secret／service_role key、DB URL 進前端、repo 或 logs。
- 表格每筆綁 `user_id = auth.uid()`，RLS 並檢查 enabled。allowed_users 放在非 exposed schema，透過受限安全函式只回傳「目前登入者是否被允許」，固定 search_path、撤銷 PUBLIC execute。不要用可自行修改的 user_metadata 判斷擁有權。[RLS 文件](https://supabase.com/docs/guides/database/postgres/row-level-security)
- 禁止匿名讀寫；authenticated 也不能直接 insert/update/delete 同步表，只能執行受限 RPC。RPC 以 `auth.uid()` 取得 owner，不接受呼叫者替換身分；SECURITY DEFINER 必須自行驗證 allowlist／owner，固定 search_path，嚴格驗證參數與授權。
- 關閉登入後先解決既有 HTML 注入點：提示／私人設定改為受限內容樹，舊 HTML 經消毒與 URL scheme allowlist。封裝固定版本函式庫、CSP、避免第三方 JS 取得私人內容或 token；不要記錄 OTP/token/日記內容。

### 離線身分與登出

雲端 session 和本機解鎖不同。選擇「信任此裝置」才保留離線內容；以獨立本機密語派生金鑰，加密文件與 Blob，不落盤明文金鑰。採用標準 Web Crypto KDF 與驗證式加密，參數需在目標 iPhone 實測；密語遺失無法復原本機未同步資料。未解鎖不掛載 Repository。

共享裝置模式不持久化私人內容／session，離線功能關閉。不能在純靜態 app 宣稱具 HttpOnly cookie 或端到端加密。此設計是雲端存取控制與裝置資料保護；Supabase 管理員仍可能讀取雲端明文，E2EE 屬另案。

SDK 的 session storage 必須明確設定：共享裝置 `persistSession: false`；信任裝置用自訂加密 storage adapter，不讓預設 localStorage 落盤明文 refresh token。解鎖前不啟動 session refresh；鎖定時停止 refresh、清記憶體 session。金鑰與已加密 token 同放 IndexedDB 但以明文保存金鑰，不能算裝置保護。

登出前若有待同步／衝突，選擇先同步、匯出或鎖定保留；不能悄悄丟棄。登出／換帳號立即取消請求與訂閱、清除記憶體和物件 URL、鎖定金鑰。不同帳號及專案各用 namespace，晚到的請求不能寫入新帳號。雲端 token 過期時保留本機編輯、停止雲端同步並提示重新登入；離線時無法得知遠端撤權，介面必須坦白這個限制。

## 雲端資料模型（欄位契約）

|表|主要欄位與限制|
|---|---|
|`trips`|`user_id, id(uuid), title, timezone, revision, deleted_at`；複合 PK `(user_id,id)`|
|`documents`|`user_id, trip_id, id(uuid), kind, legacy_path, payload(jsonb), revision(bigint), deleted_at, updated_at(server)`；PK `(user_id,trip_id,id)`；FK `(user_id,trip_id) → trips`；同旅程 legacy_path 唯一|
|`assets`|`user_id, trip_id, id(uuid), object_key, sha256, bytes, mime, state, deleted_at`；FK 綁同 owner 旅程；object_key 不可變且唯一|
|`document_assets`|同 owner／trip 的 document_id、asset_id 複合 FK；防跨帳號引用|
|`change_log`|owner／trip、commit_order 游標、document／asset ID、revision、tombstone；索引 `(user_id,trip_id,commit_order)`|
|`operation_receipts`|owner、op_id(uuid)、request_hash、結果 revision；唯一 `(user_id,op_id)`，保留期覆蓋允許離線重送期間|
|`import_batches`|owner、trip、batch_id、來源 fingerprint、狀態、進度、source schema、錯誤摘要|
|`import_entries`|owner、trip、source、source_key、source_digest、document_id、batch_id；同來源 key 唯一|

文件 kind 對應 config/private_config/item/split/misc/todo/note/packing/maps/plans/legacy_marker。先以 JSONB 保留現有未知欄位，避免改造時失去資料；後續再逐類強型別化。舊 `notes/me` 是來源鍵，不是雲端帳號；遷移以 deterministic mapping 對到已登入 owner，保留 legacy_path，不能直接信任匯入的 uid。未識別的他人 uid 先隔離讓使用者確認。

Storage bucket `journal-private` 必須 private。不可變 key：`<auth.uid()>/<trip-id>/<asset-id>/<sha256>`。RLS 對 SELECT/INSERT 分別檢查 bucket、第一層 owner、allowlist 與同 owner 的旅程；不授權客戶端 overwrite/delete。短效 signed URL 只存記憶體，不放 payload／備份／service worker。刪除與 GC 經受控管理工作執行。[Storage 權限](https://supabase.com/docs/guides/storage/security/access-control)

## 離線與同步協定

1. 每次本機編輯在**同一 IndexedDB transaction** 寫 document、revision 與 outbox。確認 transaction commit 才顯示「已存本機」。quota 或 transaction abort 時保留輸入並顯示失敗；不先顯示已儲存。
2. outbox：`op_id, owner, trip_id, entity_id, base_revision, payload/delete, dependencies, attempt, next_retry_at`。同文件的編輯序列化；正在送出的 operation immutable，後續編輯依賴其 ack。沒有 ack 的新建項目不能當成雲端已存在。
3. 前景載入、visibilitychange、online 及手動操作觸發同步；timer 作補充，不能依賴 iOS 背景執行。使用單一同步鎖；BroadcastChannel 通知其他頁籤重讀 IDB，無此能力時由 DB transaction CAS 保底。
4. 附件先本機持久化，再傳至不可變 key；驗證 hash/bytes 後 RPC finalize asset metadata，文件只有在所依賴的 asset ready 時才提交。中斷重送同 key，遇到已存在先驗證而不覆蓋；孤立上傳受延後 GC 管理。
5. `apply_operation(op_id, trip_id, document_id, expected_revision, payload/delete)` 在單一 DB transaction 做 allowlist、owner、schema／大小／附件引用驗證、request_hash 去重與 CAS。同 op_id 同 hash 回傳原結果；同 ID 不同 hash 拒絕。revision 由 server 遞增，不使用裝置時鐘決定勝負。
6. 預期 revision 不符，回傳目前 server revision／payload。不同文件自動合併；同文件改動保留兩份，使用者選用本機／遠端／另存副本；刪除對編輯也視為衝突。未解決的記錄停送，其他記錄繼續。
7. 拉取 changes：每個 owner/trip 的提交 RPC **先取得同一交易鎖**，再配置 commit_order 並寫 change_log；讀取快照水位亦取得同鎖。不可只用普通 sequence／updated_at 當 cursor，避免較早序號晚提交而漏讀。按序分頁，先持久化資料與 cursor 的原子 transaction，再 ack。Realtime 只當重新拉取提示，不當可靠傳輸。
8. 收到 ack 時，若本機已產生後續編輯，只更新已確認基線與依賴 revision，不用舊 server payload 覆蓋較新本機內容。若 push 成功但回應丟失，以同 op_id 重試。
9. 401 暫停等待登入；403 保留本機資料並顯示拒絕；429／5xx 指數退避加 jitter；離線不忙迴圈。pull 絕不蓋掉 pending／conflict 記錄。
10. tombstone 與變更日誌至少保留 180 天（初始提案）。cursor 過期的裝置必須做帶高水位的完整 snapshot 對帳，保留未送出的編輯並逐筆衝突處理；不能從過期佇列直接復活已刪資料。operation receipt 過期亦需重新對帳後產生新 operation。

同步狀態分為：本機儲存中／已存本機・待同步 N 筆／同步中／已同步（最後成功時間）／離線／需重新登入／衝突 N 筆／儲存失敗。只有當本機 durable、outbox 清空、附件完成且 pull 到此次水位，才能顯示已同步。

## PWA 改造

必要 app shell 本地封裝並逐一驗證成功後才標示「可離線開啟」；首次安裝需要網路。service worker 僅快取版本化的公開靜態 shell，排除 Auth、Supabase、私人 API、token callback、signed URLs。只有 navigation 可 fallback shell；附件透過已解鎖 Repository 讀取。舊 cache 清理限定 app 前綴；未存輸入／migration 進行時不強制 skipWaiting。IndexedDB schema 升級有 blocked/versionchange UI，舊頁籤必須關閉或轉唯讀。

地圖 tiles、遠端網址預覽及首次載入 PDF 工具若未準備好，清楚顯示需連線；文字、照片、待辦／花費記錄不能因此阻塞。離線測試包含 airplane mode 冷啟動、瀏覽器關閉重開、session 過期及容量不足。

## 開發環境驗收與發版閘門

- 使用兩個測試帳號與 anon 直接測 REST／RPC／Storage，含猜測 ID、跨 trip 引用、修改 owner、停權後既有 JWT；全部不得越權。驗證 SECURITY DEFINER 權限與 RPC 冪等／CAS transaction。
- 兩台裝置同改同筆、同改不同筆、delete/edit、離線多次改動、重複重送、成功後回應丟失、分頁中有併發提交；所有分支保留可追蹤結果。
- migration 先在備份副本讀取 legacy stores → staging → 校驗 → 切換新 DB。成功之前不能清除 `trip-local`；回退應用時仍可匯出新資料，禁止降版直接寫壞新 schema。
- 每階段 PR 包含測試與未完成項；正式啟用前需備份還原驗收、真機離線驗收、獨立部署核准。本次不新增任何部署 workflow。
