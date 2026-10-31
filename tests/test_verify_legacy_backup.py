"""Synthetic fixtures only: no real diary entries or Apple Journal samples."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "verify_legacy_backup.py"
spec = importlib.util.spec_from_file_location("verifier", SCRIPT)
verifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)


def fixture():
    return {"format": "trip-content", "version": 1, "config": {"days": []}, "private": {},
            "data": {"items": {}, "split": {}, "misc": {}, "todos": {},
                     "meta": {"maps": {}, "plans": {}}},
            "local": {"docs": {"notes/me/items/a": {"text": "synthetic-secret", "photos": ["ab"]},
                               "data/users/me/packmeta": {"seeded": 1}},
                      "assets": {"ab": "data:text/plain;base64,YQ=="}}}


class BackupTests(unittest.TestCase):
    def test_full_local_structure_and_no_content_output(self):
        result = verifier.verify(fixture())
        self.assertEqual(result["status"], "structure_valid")
        self.assertEqual(result["counts"]["asset_bytes"], 1)
        self.assertNotIn("synthetic-secret", json.dumps(result))
        self.assertNotIn("notes/me", json.dumps(result))

    def test_content_only_is_never_full(self):
        pack = fixture()
        del pack["local"]
        pack["data"]["split"]["x"] = {"receipts": ["ab"]}
        self.assertEqual(verifier.verify(pack)["status"], "review_required")

    def test_missing_receipts_and_pdf_pages(self):
        pack = fixture()
        pack["data"]["split"]["x"] = {"receipts": ["cd"]}
        pack["data"]["items"]["x"] = {"pdf": {"pages": ["/_blob/ef"]}}
        result = verifier.verify(pack)
        self.assertIn("missing_referenced_asset_bytes", result["errors"])
        self.assertEqual(result["counts"]["referenced_assets"], 3)

    def test_bad_data_urls_and_base64(self):
        for uri in ("https://invalid.test/x", "data:text/plain;base64,%%%", "data:;base64,YQ=", "data:;base64,YR=="):
            pack = fixture()
            pack["local"]["assets"]["ab"] = uri
            self.assertEqual(verifier.verify(pack)["status"], "invalid")

    def test_invalid_structures_do_not_crash(self):
        for value in (None, [], "x", 7, True):
            self.assertEqual(verifier.verify(value)["status"], "invalid")
        for key in ("config", "private", "data", "local"):
            pack = fixture()
            pack[key] = []
            self.assertEqual(verifier.verify(pack)["status"], "invalid")

    def test_version_must_be_integer_one(self):
        for version in (2, True, "1"):
            pack = fixture()
            pack["version"] = version
            self.assertEqual(verifier.verify(pack)["status"], "invalid")

    def test_external_links_need_review_without_fetch(self):
        pack = fixture()
        pack["data"]["items"]["x"] = {"url": "https://invalid.test/never-fetch"}
        self.assertEqual(verifier.verify(pack)["status"], "review_required")

    def test_unknown_documents_require_review(self):
        pack = fixture()
        pack["data"]["new_kind"] = {"x": {}}
        self.assertEqual(verifier.verify(pack)["status"], "review_required")

    def test_input_not_modified(self):
        pack = fixture()
        before = copy.deepcopy(pack)
        verifier.verify(pack)
        self.assertEqual(pack, before)

    def test_cli_exit_codes_and_read_only(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "fixture.json"
            for expected, content in ((0, json.dumps(fixture())),
                                      (2, json.dumps({k: v for k, v in fixture().items() if k != "local"})),
                                      (1, '{"format":1,"format":2}'),
                                      (1, '{"x":NaN}'), (1, 'not-json')):
                path.write_text(content)
                before = path.read_bytes()
                proc = subprocess.run([sys.executable, str(SCRIPT), str(path)], capture_output=True, text=True)
                self.assertEqual(proc.returncode, expected, proc.stderr)
                self.assertEqual(path.read_bytes(), before)
                self.assertNotIn("synthetic-secret", proc.stdout)
                self.assertNotIn(str(path), proc.stdout)
                json.loads(proc.stdout)


if __name__ == "__main__":
    unittest.main()
