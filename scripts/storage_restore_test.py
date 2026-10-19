#!/usr/bin/env python3
"""Verify or restore DriveDrop's dated archive to its isolated hosted test only.

Python 3.10+, standard library only. Default: offline verification, no network.
The archive and credentials must remain outside the repository.
"""
import argparse
import base64
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import getpass
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import warnings
import zipfile

TARGET = "urzkdwvfplawjvnfubda"
SOURCE = "yozbuuvebzxitoqrvyer"
ARCHIVE_SHA256 = "b05bcbaf828879b98f6b34e2d57500bfc9286bc295c621dbc2affe66a7408c40"
ARCHIVE_NAME = "DriveDrop-storage-backup-2026-10-19.zip"
ORIGIN = "https://" + TARGET + ".supabase.co"
COUNTS = {"delivery-evidence": 104, "message-attachments": 5,
          "transporter-profiles": 3, "transporter-verification": 23,
          "vehicle-photos": 1}
LIMIT = 20 * 1024 * 1024


class RestoreError(Exception):
    pass


def require(condition, message):
    if not condition:
        raise RestoreError(message)


def utcnow():
    return datetime.now(timezone.utc).isoformat()


def digest(data):
    return hashlib.sha256(data).hexdigest()


def safe_path(value):
    require(isinstance(value, str) and value and "\\" not in value
            and not any(ord(c) < 32 for c in value), "Invalid archive path")
    require(all(p not in ("", ".", "..") for p in value.split("/")),
            "Unsafe archive path")
    return value


def member(item):
    return "objects/" + item["bucket"] + "/" + safe_path(item["name"])


def verify_archive(archive):
    """Check exact dated archive and every byte before any network or extraction."""
    archive.seek(0)
    h = hashlib.sha256()
    for chunk in iter(lambda: archive.read(1024 * 1024), b""):
        h.update(chunk)
    require(h.hexdigest() == ARCHIVE_SHA256, "Archive checksum mismatch; nothing uploaded")
    archive.seek(0)
    z = zipfile.ZipFile(archive)
    names = z.namelist()
    require(len(names) == len(set(names)), "Duplicate archive members")
    for info in z.infolist():
        safe_path(info.filename)
        require(not info.is_dir() and not stat.S_ISLNK(info.external_attr >> 16)
                and info.file_size <= LIMIT, "Unsafe archive entry")
    manifest = json.loads(z.read("manifest.json"))
    require(manifest["format"] == "drivedrop-storage-backup-v1"
            and manifest["source_project"] == SOURCE, "Wrong backup source or format")
    buckets = manifest["buckets"]
    require(len(buckets) == 5 and {b["id"] for b in buckets} == set(COUNTS),
            "Unexpected backup buckets")
    for b in buckets:
        require(b["public"] is (b["id"] == "transporter-profiles"),
                "Unexpected bucket visibility")
    objects = manifest["objects"]
    require(len(objects) == manifest["object_count"] == 136, "Wrong object count")
    paths = set()
    total = 0
    for item in objects:
        require(item["bucket"] in COUNTS, "Unexpected object bucket")
        path = member(item)
        require(path not in paths, "Duplicate object path")
        paths.add(path)
        require(type(item["size"]) is int and 0 <= item["size"] <= LIMIT
                and re.fullmatch(r"[0-9a-f]{64}", item["sha256"]),
                "Invalid object size or checksum")
        data = z.read(path)
        require(len(data) == item["size"] and digest(data) == item["sha256"],
                "Object checksum mismatch")
        total += len(data)
    require(total == manifest["total_bytes"] == 227100491, "Wrong byte total")
    for b, count in COUNTS.items():
        require(sum(o["bucket"] == b for o in objects) == count, "Wrong bucket count")
    require(set(names) == paths | {"manifest.json", "source-inventory.json",
                                  "restore_files.py", "README.txt"},
            "Unexpected archive members")
    return z, manifest


def validate_key(key):
    """Local guard only; Supabase verifies the JWT signature before authorizing."""
    try:
        parts = key.strip().split(".")
        require(len(parts) == 3, "Use the test project's legacy service_role key")
        claims = json.loads(base64.urlsafe_b64decode(parts[1] + "=" * (-len(parts[1]) % 4)))
        require(claims.get("ref") == TARGET and claims.get("role") == "service_role",
                "Key is not the isolated test project's service_role key")
        require(float(claims.get("exp", 0)) > time.time(), "Test key has expired")
    except (ValueError, TypeError, KeyError) as exc:
        raise RestoreError("Invalid test-project key") from exc
    return key.strip()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise RestoreError("Redirect refused; credentials were not forwarded")


class Storage:
    def __init__(self, key):
        self.key = validate_key(key)

    def request(self, method, path, *, data=None, headers=None, authenticated=True,
                limit=1024 * 1024):
        require(path.startswith("/") and not path.startswith("//"), "Invalid API path")
        url = ORIGIN + "/storage/v1" + path
        hdrs = {"User-Agent": "DriveDrop-Isolated-Restore/1", "Cache-Control": "no-cache",
                "Accept-Encoding": "identity"}
        if authenticated:
            hdrs.update({"Authorization": "Bearer " + self.key, "apikey": self.key})
        hdrs.update(headers or {})
        # Keep the configured proxy and normal TLS validation; never bypass either.
        opener = urllib.request.build_opener(NoRedirect())
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, data=data, method=method, headers=hdrs)
                with opener.open(req, timeout=30) as response:
                    body = response.read(limit + 1)
                    require(len(body) <= limit, "Response exceeded expected size")
                    return response.status, body
            except urllib.error.HTTPError as exc:
                with exc:
                    status, body = exc.code, exc.read(65536)
                if status in (401, 403) and authenticated:
                    raise RestoreError("Storage authorization refused; stopped") from None
                if status != 429 and not 500 <= status <= 599:
                    return status, body
            except (urllib.error.URLError, TimeoutError, OSError):
                status, body = 0, b""
            if attempt == 2:
                raise RestoreError("Storage connection failed after 3 bounded attempts")
            time.sleep(1 + attempt)
        raise RestoreError("Storage request failed")

    def json_request(self, method, path, payload=None):
        data = None if payload is None else json.dumps(payload).encode()
        status, body = self.request(method, path, data=data,
                                    headers={"Content-Type": "application/json"})
        require(200 <= status < 300, "Storage metadata request failed (HTTP %s)" % status)
        try:
            return json.loads(body)
        except ValueError as exc:
            raise RestoreError("Unexpected Storage metadata response") from exc

    def buckets(self):
        rows = self.json_request("GET", "/bucket")
        require(isinstance(rows, list), "Unexpected bucket list")
        return {b["id"]: b for b in rows}

    def create_bucket(self, bucket):
        self.json_request("POST", "/bucket", {k: bucket[k] for k in
                          ("id", "name", "public", "file_size_limit", "allowed_mime_types")})

    @staticmethod
    def object_path(item, public=False):
        suffix = "/".join(urllib.parse.quote(p, safe="") for p in
                          (item["bucket"] + "/" + item["name"]).split("/"))
        return "/object/" + ("public/" if public else "authenticated/") + suffix

    def download(self, item, public=False):
        path = self.object_path(item, public) + "?restore_check=" + uuid.uuid4().hex
        return self.request("GET", path, authenticated=not public,
                            limit=max(item["size"] + 1, 65536))

    def upload(self, item, data):
        require(len(data) == item["size"] and digest(data) == item["sha256"],
                "Local file changed before upload")
        path = self.object_path(item).replace("/object/authenticated/", "/object/", 1)
        status, _ = self.request("POST", path, data=data, headers={
            "Content-Type": item["mimetype"],
            "Cache-Control": item.get("cache_control") or "no-cache", "x-upsert": "true"})
        require(200 <= status < 300, "Storage upload failed (HTTP %s)" % status)


def missing_object(status, body):
    if status == 404:
        return True
    if status == 400:
        try:
            error = json.loads(body)
            return error.get("code") in ("NoSuchKey", "NoSuchBucket") or (
                str(error.get("statusCode")) == "404" and
                error.get("message") in ("Object not found", "Bucket not found", "The resource was not found"))
        except (ValueError, AttributeError):
            return False
    return False


def matching_bucket(actual, expected):
    return (actual.get("id") == expected["id"]
            and actual.get("public") is expected["public"]
            and actual.get("file_size_limit") == expected["file_size_limit"]
            and sorted(actual.get("allowed_mime_types") or []) ==
            sorted(expected["allowed_mime_types"] or []))


def restore(storage, archive, manifest, report, checkpoint, workers=3):
    """Upsert only manifest paths; skip files only after a complete readback hash."""
    buckets = storage.buckets()
    missing = []
    for bucket in manifest["buckets"]:
        if bucket["id"] not in buckets:
            require(bucket["id"] == "vehicle-photos", "An expected restored bucket is missing")
            missing.append(bucket)
        else:
            require(matching_bucket(buckets[bucket["id"]], bucket),
                    "Existing bucket configuration differs; stopped before upload")
    for bucket in missing:
        storage.create_bucket(bucket)
        require(matching_bucket(storage.buckets()[bucket["id"]], bucket),
                "Created bucket configuration verification failed")
        report["created_buckets"].append(bucket["id"])
        checkpoint(report)

    abort = threading.Event()
    archive_lock = threading.Lock()

    def transfer(item):
        if abort.is_set():
            raise RestoreError("Stopped after another file failed")
        try:
            status, data = storage.download(item)
            match = status == 200 and len(data) == item["size"] and digest(data) == item["sha256"]
            action = "already_matching" if match else "uploaded"
            if not match:
                require(status == 200 or missing_object(status, data),
                        "Readback request failed; file was not overwritten (HTTP %s)" % status)
                require(not abort.is_set(), "Stopped after another file failed")
                with archive_lock:
                    data = archive.read(member(item))
                storage.upload(item, data)
                status, data = storage.download(item)
                require(status == 200 and len(data) == item["size"]
                        and digest(data) == item["sha256"], "Hosted readback checksum mismatch")
            return {"bucket": item["bucket"], "name": item["name"], "bytes": item["size"],
                    "sha256": item["sha256"], "action": action, "verified_at": utcnow()}
        except Exception:
            abort.set()
            raise

    first_error = None
    with ThreadPoolExecutor(max_workers=workers) as pool:
        tasks = [pool.submit(transfer, item) for item in manifest["objects"]]
        for task in as_completed(tasks):
            try:
                result = task.result()
                report["objects"].append(result)
                checkpoint(report)
                print("Verified %d/136" % len(report["objects"]), flush=True)
            except Exception as exc:
                if first_error is None:
                    first_error = exc
                abort.set()
    if first_error is not None:
        raise first_error

    final_buckets = storage.buckets()
    for bucket in manifest["buckets"]:
        require(matching_bucket(final_buckets.get(bucket["id"], {}), bucket),
                "Final bucket configuration differs")
        sample = next(o for o in manifest["objects"] if o["bucket"] == bucket["id"])
        status, data = storage.download(sample, public=True)
        if bucket["public"]:
            require(status == 200 and len(data) == sample["size"]
                    and digest(data) == sample["sha256"], "Public sample readback failed")
        else:
            require(status in (401, 403) or missing_object(status, data),
                    "Private sample was exposed or access check was inconclusive")
        report["access_checks"].append({"bucket": bucket["id"], "public": bucket["public"],
                                        "http_status": status, "passed": True})
        checkpoint(report)
    require(len(report["objects"]) == 136, "Incomplete hosted readback")
    report.update(status="passed", completed_at=utcnow(),
                  verified_objects=len(report["objects"]),
                  verified_bytes=sum(o["bytes"] for o in report["objects"]))
    checkpoint(report)


def write_report(path, report):
    fd, temp = tempfile.mkstemp(prefix=".restore-report-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            json.dump(report, stream, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path, nargs="?", default=Path(ARCHIVE_NAME))
    parser.add_argument("--restore-to", choices=[TARGET], help="Enable hosted writes to the isolated test only")
    parser.add_argument("--workers", type=int, choices=range(1, 5), default=3)
    args = parser.parse_args(argv)
    os.umask(0o077)
    with args.archive.open("rb") as raw:
        archive, manifest = verify_archive(raw)
        with archive:
            print("Backup verified: 136 files, 227100491 bytes.")
            if not args.restore_to:
                print("Offline verification only. No network calls or hosted changes.")
                return 0
            print("Destination: DriveDrop Restore Test 2026-10-19 (" + TARGET + ").")
            print("Existing matching files are skipped; other archive paths are restored.")
            print("Enter this TEST project's legacy service_role key. Input is hidden.")
            with warnings.catch_warnings():
                warnings.simplefilter("error", getpass.GetPassWarning)
                key = validate_key(getpass.getpass("Test project service_role key: "))
            # No key in command arguments, files, reports, subprocesses, or logs.
            storage = Storage(key)
            del key
            report_path = args.archive.resolve().parent / (
                "DriveDrop-hosted-storage-readback-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
                + "-" + uuid.uuid4().hex[:8] + ".json")
            report = {"status": "in_progress", "test_type": "hosted_storage_readback",
                      "target_project": TARGET, "archive_sha256": ARCHIVE_SHA256,
                      "started_at": utcnow(), "created_buckets": [], "objects": [], "access_checks": [],
                      "limitations": ["Database and storage snapshots have different dates.",
                                      "Application authorization and ownership require separate checks.",
                                      "Objects outside the archive are preserved, not inventoried or deleted.",
                                      "No database rows, website configuration, or production projects are changed."]}
            checkpoint = lambda r: write_report(report_path, r)
            checkpoint(report)
            try:
                restore(storage, archive, manifest, report, checkpoint, args.workers)
            except (Exception, KeyboardInterrupt) as exc:
                report.update(status="failed", stopped_at=utcnow(), error_type=type(exc).__name__)
                checkpoint(report)
                print("Incomplete. Verified files: %d/136. Rerunning safely rechecks every file." %
                      len(report["objects"]), file=sys.stderr)
                raise
            finally:
                storage.key = ""
                print("Report:", report_path)
            print("PASS: all 136 hosted files match; five bucket access samples passed.")
            return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (RestoreError, OSError, ValueError, zipfile.BadZipFile, KeyError,
            getpass.GetPassWarning, EOFError, KeyboardInterrupt) as exc:
        # Do not print arbitrary HTTP/proxy exceptions, which may contain private values.
        print("Stopped: " + (str(exc) if isinstance(exc, RestoreError) else type(exc).__name__),
              file=sys.stderr)
        sys.exit(1)
