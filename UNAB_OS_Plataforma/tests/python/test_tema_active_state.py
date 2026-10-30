import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))

from sync_tema_cloud import active_state


NOW = 1_777_000_000.0
DAY = 24 * 60 * 60


class TemaActiveStateTest(unittest.TestCase):
    def test_official_in_progress_classification_is_active(self):
        self.assertEqual(active_state({"id": 44}, NOW, {"44"}), "active")

    def test_expired_period_is_historical_even_with_stale_partial_progress(self):
        course = {"id": 44, "enddate": NOW - DAY, "progress": 25}
        self.assertEqual(active_state(course, NOW, set()), "historical")

    def test_future_period_is_unknown(self):
        self.assertEqual(active_state({"id": 44, "startdate": NOW + DAY}, NOW, set()), "unknown")

    def test_recent_access_is_an_official_active_signal(self):
        self.assertEqual(active_state({"id": 44, "lastaccess": NOW - 7 * DAY}, NOW, set()), "active")

    def test_source_progress_is_an_official_active_signal(self):
        self.assertEqual(active_state({"id": 44, "progress": 1}, NOW, set()), "active")

    def test_recent_term_start_is_active_without_an_end_date(self):
        self.assertEqual(active_state({"id": 44, "startdate": NOW - 90 * DAY}, NOW, None), "active")

    def test_ambiguous_course_is_not_promoted_when_timeline_api_is_unavailable(self):
        self.assertEqual(active_state({"id": 44}, NOW, None), "unknown")

    def test_course_outside_official_timeline_is_historical_without_other_signals(self):
        self.assertEqual(active_state({"id": 44}, NOW, set()), "historical")


if __name__ == "__main__":
    unittest.main()
