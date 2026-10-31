# 唯讀備份檢查

執行 `python3 scripts/verify_legacy_backup.py /absolute/path/to/backup.json`。

- 回傳 0：結構及已知本機附件引用通過。
- 回傳 1：格式、base64 或引用無效。
- 回傳 2：內容檔涵蓋不完整，或有待人工檢查項目。

工具不連網、不修改檔案、不執行還原，也不輸出日記文字。完整性限制及還原流程見 [備份規劃](../docs/backup-and-recovery.md)。
