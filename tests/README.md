# 備份檢查器測試

執行 `python3 -m unittest discover -s tests -v`。

測試只使用合成備份，驗證缺附件、無效 base64、格式版本、重複 JSON key、唯讀行為及回傳碼。通過測試不代表真實裝置備份已完整，亦不代表 Apple Journal 或 Supabase 功能已實作。
