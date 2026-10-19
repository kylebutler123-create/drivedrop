"""Offline regression tests: no Supabase credentials or network are used."""
import base64
from contextlib import redirect_stdout
import copy
import io
import json
from pathlib import Path
import tempfile
import threading
import time
import unittest
from unittest.mock import patch
import urllib.error
import zipfile

import storage_restore_test as app


def fake_key(ref=app.TARGET, role="service_role", exp=None):
    claims = {"ref": ref, "role": role, "exp": exp or time.time() + 3600}
    payload = base64.urlsafe_b64encode(json.dumps(claims).encode()).decode().rstrip("=")
    return "eyJhbGciOiJIUzI1NiJ9." + payload + ".FAKE_SIGNATURE_TEST_ONLY"


def fixture():
    content = io.BytesIO()
    objects, buckets = [], []
    with zipfile.ZipFile(content, "w") as archive:
        for bucket, count in app.COUNTS.items():
            buckets.append({"id": bucket, "name": bucket,
                            "public": bucket == "transporter-profiles",
                            "file_size_limit": 1000000, "allowed_mime_types": ["image/png"]})
            for i in range(count):
                data = (bucket + ":" + str(i)).encode()
                item = {"bucket": bucket, "name": "folder/" + str(i) + " image.png",
                        "size": len(data), "sha256": app.digest(data),
                        "mimetype": "image/png", "cache_control": "no-cache"}
                objects.append(item)
                archive.writestr(app.member(item), data)
    content.seek(0)
    return zipfile.ZipFile(content), {"buckets": buckets, "objects": objects}


class FakeStorage:
    def __init__(self, manifest):
        self.config = {b["id"]: copy.deepcopy(b) for b in manifest["buckets"]
                       if b["id"] != "vehicle-photos"}
        self.files = {}
        self.uploads = 0
        self.created = []
        self.bad_readback = False
        self.expose_private = False
        self.refuse_download = False
        self.lock = threading.Lock()

    def buckets(self):
        return copy.deepcopy(self.config)

    def create_bucket(self, bucket):
        self.created.append(bucket["id"])
        self.config[bucket["id"]] = copy.deepcopy(bucket)

    def download(self, item, public=False):
        if self.refuse_download:
            return 403, b"forbidden"
        if public and not self.config[item["bucket"]]["public"] and not self.expose_private:
            return 400, b'{"statusCode":"404","code":"NoSuchBucket","message":"Bucket not found"}'
        data = self.files.get(app.member(item))
        if data is None:
            return 400, b'{"statusCode":"404","code":"NoSuchKey","message":"Object not found"}'
        return 200, b"corrupt" if self.bad_readback else data

    def upload(self, item, data):
        with self.lock:
            self.uploads += 1
            self.files[app.member(item)] = data


def report():
    return {"status": "in_progress", "created_buckets": [], "objects": [], "access_checks": []}


class RestoreTests(unittest.TestCase):
    def setUp(self):
        self.archive, self.manifest = fixture()
        self.addCleanup(self.archive.close)
        self.storage = FakeStorage(self.manifest)

    def run_restore(self, workers=3):
        result = report()
        with redirect_stdout(io.StringIO()):
            app.restore(self.storage, self.archive, self.manifest, result, lambda r: None, workers)
        return result

    def test_all_136_files_restore_and_resume_without_uploading_again(self):
        extra = b"leave this extra object alone"
        self.storage.files["unrelated/duplicate.png"] = extra
        result = self.run_restore()
        self.assertEqual(result["status"], "passed")
        self.assertEqual(result["verified_objects"], 136)
        self.assertEqual(len(result["access_checks"]), 5)
        self.assertEqual(self.storage.uploads, 136)
        self.assertEqual(self.storage.created, ["vehicle-photos"])
        self.assertFalse(self.storage.config["vehicle-photos"]["public"])
        second = self.run_restore()
        self.assertEqual(self.storage.uploads, 136)
        self.assertTrue(all(o["action"] == "already_matching" for o in second["objects"]))
        self.assertEqual(self.storage.files["unrelated/duplicate.png"], extra)

    def test_existing_two_samples_are_readback_verified_and_skipped(self):
        for item in self.manifest["objects"][:2]:
            self.storage.files[app.member(item)] = self.archive.read(app.member(item))
        result = self.run_restore()
        self.assertEqual(self.storage.uploads, 134)
        self.assertEqual(sum(o["action"] == "already_matching" for o in result["objects"]), 2)

    def test_matching_length_but_wrong_hash_is_replaced(self):
        item = self.manifest["objects"][0]
        self.storage.files[app.member(item)] = b"x" * item["size"]
        self.run_restore()
        self.assertEqual(self.storage.files[app.member(item)], self.archive.read(app.member(item)))

    def test_private_bucket_made_public_aborts_before_any_write(self):
        self.storage.config["delivery-evidence"]["public"] = True
        with self.assertRaisesRegex(app.RestoreError, "configuration differs"):
            self.run_restore()
        self.assertEqual(self.storage.uploads, 0)
        self.assertEqual(self.storage.created, [])

    def test_missing_original_bucket_aborts_before_any_write(self):
        del self.storage.config["delivery-evidence"]
        with self.assertRaisesRegex(app.RestoreError, "expected restored bucket"):
            self.run_restore()
        self.assertEqual(self.storage.created, [])

    def test_denied_read_is_not_treated_as_missing(self):
        self.storage.refuse_download = True
        with self.assertRaises(app.RestoreError):
            self.run_restore(workers=1)
        self.assertEqual(self.storage.uploads, 0)

    def test_corrupt_post_upload_readback_never_reports_pass(self):
        self.storage.bad_readback = True
        with self.assertRaises(app.RestoreError):
            self.run_restore(workers=1)
        self.assertEqual(self.storage.uploads, 1)

    def test_private_object_exposure_prevents_success(self):
        self.storage.expose_private = True
        with self.assertRaisesRegex(app.RestoreError, "Private sample"):
            self.run_restore()

    def test_source_and_production_keys_are_rejected(self):
        for ref in (app.SOURCE, "srqhjgrhgyyfdaxckjum"):
            with self.assertRaisesRegex(app.RestoreError, "not the isolated"):
                app.validate_key(fake_key(ref))
        with self.assertRaises(app.RestoreError):
            app.validate_key(fake_key(role="anon"))
        with self.assertRaises(app.RestoreError):
            app.validate_key(fake_key(exp=1))
        self.assertEqual(app.validate_key(fake_key()).count("."), 2)

    def test_archive_checksum_failure_before_zip_or_network(self):
        with self.assertRaisesRegex(app.RestoreError, "Archive checksum mismatch"):
            app.verify_archive(io.BytesIO(b"altered archive"))

    def test_bad_archive_paths_are_rejected(self):
        for value in ("../x", "/etc/passwd", "x/../y", "x//y", "x\\y", "x\ny"):
            with self.assertRaises(app.RestoreError):
                app.safe_path(value)

    def test_paths_are_percent_encoded_without_changing_target(self):
        item = {"bucket": "delivery-evidence", "name": "folder/a?# file.png"}
        self.assertEqual(app.Storage.object_path(item),
                         "/object/authenticated/delivery-evidence/folder/a%3F%23%20file.png")

    def test_redirect_is_refused(self):
        with self.assertRaisesRegex(app.RestoreError, "Redirect refused"):
            app.NoRedirect().redirect_request(None, None, 302, "", {}, "https://example.com")

    def test_failed_http_auth_is_not_retried(self):
        storage = app.Storage(fake_key())
        class Opener:
            def __init__(self):
                self.calls = 0
            def open(self, request, timeout):
                self.calls += 1
                raise urllib.error.HTTPError(request.full_url, 401, "Denied", {}, io.BytesIO(b"{}"))
        opener = Opener()
        with patch.object(app.urllib.request, "build_opener", return_value=opener):
            with self.assertRaisesRegex(app.RestoreError, "authorization refused"):
                storage.request("GET", "/bucket")
        self.assertEqual(opener.calls, 1)

    def test_network_failure_retries_are_bounded(self):
        storage = app.Storage(fake_key())
        class Opener:
            calls = 0
            def open(self, request, timeout):
                self.calls += 1
                raise urllib.error.URLError("network unavailable")
        opener = Opener()
        with patch.object(app.urllib.request, "build_opener", return_value=opener), \
                patch.object(app.time, "sleep"):
            with self.assertRaisesRegex(app.RestoreError, "3 bounded attempts"):
                storage.request("GET", "/bucket")
        self.assertEqual(opener.calls, 3)

    def test_report_is_valid_and_has_private_posix_permissions(self):
        with tempfile.TemporaryDirectory() as root:
            path = Path(root) / "report.json"
            app.write_report(path, {"status": "in_progress"})
            app.write_report(path, {"status": "passed"})
            self.assertEqual(json.loads(path.read_text()), {"status": "passed"})
            if app.os.name == "posix":
                self.assertEqual(path.stat().st_mode & 0o077, 0)
            self.assertEqual(list(Path(root).iterdir()), [path])


if __name__ == "__main__":
    unittest.main()
