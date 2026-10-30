# 備份檢查器測試

執行 `python3 -m unittest discover -s tests -v`。

測試只使用合成備份，驗證缺附件、無效 base64、格式版本、重複 JSON key、唯讀行為及回傳碼。通過測試不代表真實裝置備份已完整，亦不代表 Apple Journal 或 Supabase 功能已實作。

## 長旅行、路線與記帳

有 Node.js 時執行：

```sh
node tests/trip-segments.mjs
node tests/trip-money-routes.mjs
```

兩組各 8 項，只讀取應用程式的純函式，使用合成資料。區段測試同時解析全部內嵌腳本。本次工作環境透過已提供的 Node runtime 執行，沒有安裝套件。
