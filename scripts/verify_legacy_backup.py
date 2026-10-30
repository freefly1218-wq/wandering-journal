#!/usr/bin/env python3
"""Read-only, offline structural checks for trip-content v1; never restores data.

Exit 0: locally portable structure, 1: invalid, 2: incomplete/uncertain coverage.
No output includes document text, file paths, owner identifiers or asset IDs.
"""
import argparse
import base64
import binascii
import hashlib
import json
import re
from pathlib import Path

COLLECTIONS = ("items", "split", "misc", "todos")
DOC_ID = re.compile(r"[A-Za-z0-9_\-.~:@+]{1,200}\Z")
ASSET_ID = re.compile(r"[0-9a-f]{1,64}\Z")
PRIVATE_PATH = re.compile(r"(?:notes|data/users)/[A-Za-z0-9_\-.~:@+/]+\Z")
BLOB_REF = re.compile(r"/_blob/([0-9a-f]+)")
DATA_URL = re.compile(r"data:([^,]*);base64,([A-Za-z0-9+/=]*)\Z")


def no_duplicates(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise ValueError("duplicate_json_key")
        value[key] = item
    return value


def reject_constant(_value):
    raise ValueError("non_finite_json_number")


def verify(pack):
    errors, warnings, references = set(), set(), set()
    counts = {"shared_documents": 0, "private_documents": 0, "assets": 0,
              "asset_bytes": 0, "referenced_assets": 0, "orphan_assets": 0}
    result = {"status": "invalid", "errors": [], "warnings": [], "counts": counts}

    def obj(value, code):
        if not isinstance(value, dict):
            errors.add(code)
            return {}
        return value

    def scan(value):
        if isinstance(value, dict):
            for key, item in value.items():
                if key in ("photos", "receipts"):
                    if not isinstance(item, list) or any(not isinstance(x, str) for x in item):
                        errors.add("invalid_attachment_reference_list")
                    else:
                        references.update(item)
                scan(item)
        elif isinstance(value, list):
            for item in value:
                scan(item)
        elif isinstance(value, str):
            references.update(BLOB_REF.findall(value))
            if "blob:" in value:
                warnings.add("temporary_blob_url_requires_manual_review")
            if re.search(r"https?://", value):
                warnings.add("external_urls_not_archived_or_verified")

    pack = obj(pack, "invalid_root")
    if pack.get("format") != "trip-content" or type(pack.get("version")) is not int or pack.get("version") != 1:
        errors.add("unsupported_format_or_version")
    config = obj(pack.get("config"), "missing_or_invalid_config")
    if not isinstance(config.get("days"), list):
        errors.add("invalid_config_days")
    private = obj(pack.get("private"), "missing_or_invalid_private_config")
    data = obj(pack.get("data"), "missing_or_invalid_data")
    scan(config)
    scan(private)
    for collection in COLLECTIONS:
        records = obj(data.get(collection), "missing_or_invalid_collection")
        counts["shared_documents"] += len(records)
        for key, record in records.items():
            if not DOC_ID.fullmatch(key) or not isinstance(record, dict):
                errors.add("invalid_shared_document")
            scan(record)
    meta = obj(data.get("meta"), "missing_or_invalid_meta")
    for key in ("maps", "plans"):
        obj(meta.get(key), "missing_or_invalid_meta_document")
    scan(meta)
    if set(data) - set(COLLECTIONS) - {"meta"} or set(meta) - {"maps", "plans"}:
        warnings.add("unknown_data_requires_manual_review")

    assets = {}
    if "local" not in pack:
        warnings.add("content_only_missing_private_documents_and_asset_bytes")
    else:
        local = obj(pack["local"], "invalid_local_section")
        docs = obj(local.get("docs"), "missing_or_invalid_private_documents")
        counts["private_documents"] = len(docs)
        for key, record in docs.items():
            if not PRIVATE_PATH.fullmatch(key) or not isinstance(record, dict):
                errors.add("invalid_private_document")
            scan(record)
        assets = obj(local.get("assets"), "missing_or_invalid_assets")
        counts["assets"] = len(assets)
        for key, uri in assets.items():
            if not ASSET_ID.fullmatch(key) or not isinstance(uri, str):
                errors.add("invalid_asset")
                continue
            match = DATA_URL.fullmatch(uri)
            if not match:
                errors.add("invalid_asset_data_url")
                continue
            try:
                raw = base64.b64decode(match[2], validate=True)
                if base64.b64encode(raw).decode("ascii") != match[2]:
                    errors.add("non_canonical_asset_base64")
                counts["asset_bytes"] += len(raw)
            except (ValueError, binascii.Error):
                errors.add("invalid_asset_base64")
        if set(local) - {"docs", "assets"}:
            warnings.add("unknown_local_fields_require_manual_review")
    if any(not ASSET_ID.fullmatch(key) for key in references):
        errors.add("invalid_asset_reference")
    if "local" in pack and references - set(assets):
        errors.add("missing_referenced_asset_bytes")
    counts["referenced_assets"] = len(references)
    counts["orphan_assets"] = len(set(assets) - references)
    result.update(status="invalid" if errors else "review_required" if warnings else "structure_valid",
                  errors=sorted(errors), warnings=sorted(warnings))
    result["limitations"] = ["not_proof_of_complete_source_snapshot",
                             "not_a_restore_test", "media_decoding_not_tested",
                             "no_original_per_asset_checksums_in_v1"]
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("backup", type=Path)
    parser.add_argument("--max-mib", type=int, default=256,
                        help="maximum input file size (default 256 MiB)")
    args = parser.parse_args()
    try:
        if args.max_mib < 1 or args.backup.stat().st_size > args.max_mib * 1024 * 1024:
            raise ValueError("file_size_limit_exceeded")
        with args.backup.open("rb") as stream:
            raw = stream.read(args.max_mib * 1024 * 1024 + 1)
        if len(raw) > args.max_mib * 1024 * 1024:
            raise ValueError("file_size_limit_exceeded")
        pack = json.loads(raw, object_pairs_hook=no_duplicates, parse_constant=reject_constant)
        result = verify(pack)
        result["file_sha256"] = hashlib.sha256(raw).hexdigest()
    except (OSError, ValueError, RecursionError):
        result = {"status": "invalid", "errors": ["unreadable_oversized_or_invalid_json"]}
    print(json.dumps(result, ensure_ascii=True, indent=2))
    return 1 if result["status"] == "invalid" else 2 if result["status"] == "review_required" else 0


if __name__ == "__main__":
    raise SystemExit(main())
