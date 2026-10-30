from datetime import datetime, timezone
import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))

from tema_sync_schedule import connection_due, latest_daily_boundary


class TemaSyncScheduleTest(unittest.TestCase):
    def test_request_newer_than_last_sync_is_due_immediately(self):
        row = {
            "last_synced_at": "2026-08-25T14:00:00Z",
            "sync_requested_at": "2026-08-25T14:01:00Z",
        }
        self.assertTrue(connection_due(row, datetime(2026, 8, 25, 14, 2, tzinfo=timezone.utc)))

    def test_synced_after_daily_boundary_is_not_due_again(self):
        row = {
            "last_synced_at": "2026-08-25T10:03:00Z",
            "sync_requested_at": "2026-08-25T09:00:00Z",
        }
        self.assertFalse(connection_due(row, datetime(2026, 8, 25, 15, 0, tzinfo=timezone.utc)))

    def test_first_run_after_five_bogota_is_due(self):
        row = {
            "last_synced_at": "2026-08-24T18:00:00Z",
            "sync_requested_at": "2026-08-24T17:00:00Z",
        }
        self.assertTrue(connection_due(row, datetime(2026, 8, 25, 10, 1, tzinfo=timezone.utc)))

    def test_before_five_uses_previous_daily_boundary(self):
        boundary = latest_daily_boundary(datetime(2026, 8, 25, 9, 59, tzinfo=timezone.utc))
        self.assertEqual(boundary, datetime(2026, 8, 24, 10, 0, tzinfo=timezone.utc))

    def test_force_runs_even_when_not_due(self):
        row = {"last_synced_at": "2026-08-25T15:00:00Z", "sync_requested_at": "2026-08-25T14:00:00Z"}
        self.assertTrue(connection_due(row, datetime(2026, 8, 25, 15, 1, tzinfo=timezone.utc), force=True))

    def test_failed_request_does_not_retry_every_ten_minutes(self):
        row = {
            "last_synced_at": None,
            "sync_requested_at": "2026-08-25T15:00:00Z",
            "last_attempted_at": "2026-08-25T15:01:00Z",
        }
        self.assertFalse(connection_due(row, datetime(2026, 8, 25, 15, 11, tzinfo=timezone.utc)))
        self.assertTrue(connection_due(row, datetime(2026, 8, 25, 16, 1, tzinfo=timezone.utc)))

    def test_new_connection_request_bypasses_failure_backoff_once(self):
        row = {
            "last_synced_at": None,
            "sync_requested_at": "2026-08-25T15:05:00Z",
            "last_attempted_at": "2026-08-25T15:01:00Z",
        }
        self.assertTrue(connection_due(row, datetime(2026, 8, 25, 15, 6, tzinfo=timezone.utc)))


if __name__ == "__main__":
    unittest.main()
