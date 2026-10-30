import sys
from pathlib import Path
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))

import sync_tema_cloud as synchronizer


class FakeMoodle:
    def __init__(self, _token):
        pass

    def call(self, function, **_params):
        if function == "core_webservice_get_site_info":
            return {"userid": 99}
        if function == "core_enrol_get_users_courses":
            return [{
                "id": 1404,
                "fullname": "ECUACIONES DIFERENCIALES",
                "shortname": "ECUACIONES",
                "startdate": 1_780_000_000,
                "enddate": 1_800_000_000,
                "progress": 1,
            }]
        if function == "core_course_get_courses_by_field":
            return {"courses": [{"id": 1404, "categoryname": "DEPARTAMENTO DE CIENCIAS BÁSICAS"}]}
        if function == "core_course_get_enrolled_courses_by_timeline_classification":
            return {"courses": [{"id": 1404}]}
        if function == "core_course_get_contents":
            return [{"id": 10, "name": "Recursos", "section": 1, "modules": []}]
        if function == "gradereport_user_get_grade_items":
            return {"usergrades": [{"gradeitems": []}]}
        raise AssertionError(f"Unexpected Moodle function: {function}")


class FakeDatabase:
    def __init__(self, fail_publish=False):
        self.fail_publish = fail_publish
        self.run_number = 0
        self.patches = []
        self.publishes = []

    def insert_one(self, table, payload):
        self.run_number += 1
        self.patches.append(("insert", table, payload))
        return {"id": f"run-{self.run_number}"}

    def patch(self, table, filters, payload):
        self.patches.append(("patch", table, filters, payload))

    def select(self, table, _params):
        if table != "tema_files":
            raise AssertionError(f"Unexpected select: {table}")
        return []

    def upload(self, *_args):
        raise AssertionError("Fixture has no files to upload")

    def upsert(self, *_args):
        raise AssertionError("Live TEMA tables must never be updated progressively")

    def rpc(self, function, payload):
        if function != "publish_tema_snapshot":
            raise AssertionError(f"Unexpected RPC: {function}")
        self.publishes.append(payload)
        if self.fail_publish:
            raise synchronizer.SyncError("simulated transactional publish failure")
        return {"courses": len(payload["p_courses"])}


class TemaSyncAtomicityTest(unittest.TestCase):
    @patch.object(synchronizer, "Moodle", FakeMoodle)
    def test_publish_failure_marks_run_failed_without_progressive_catalog_writes(self):
        database = FakeDatabase(fail_publish=True)
        with self.assertRaisesRegex(synchronizer.SyncError, "transactional publish failure"):
            synchronizer.sync_connection(
                database,
                synchronizer.Connection("11111111-1111-4111-8111-111111111111", "token", "a" * 64),
            )

        self.assertEqual(len(database.publishes), 1)
        self.assertTrue(any(
            call[0:2] == ("patch", "tema_sync_runs")
            and call[2].get("status") == "eq.running"
            and call[3].get("status") == "failed"
            for call in database.patches
        ))
        self.assertTrue(any(
            call[0:2] == ("patch", "tema_connections") and "last_attempted_at" in call[3]
            for call in database.patches
        ))

    @patch.object(synchronizer, "Moodle", FakeMoodle)
    def test_repeated_capture_has_identical_source_payload(self):
        database = FakeDatabase()
        connection = synchronizer.Connection("11111111-1111-4111-8111-111111111111", "token", "a" * 64)
        synchronizer.sync_connection(database, connection)
        synchronizer.sync_connection(database, connection)

        first, second = database.publishes
        for key in (
            "p_courses", "p_sections", "p_activities", "p_files",
            "p_grades", "p_announcements", "p_complete_scopes",
        ):
            self.assertEqual(first[key], second[key])
        self.assertEqual(first["p_courses"][0]["category_name"], "DEPARTAMENTO DE CIENCIAS BÁSICAS")
        self.assertEqual(first["p_courses"][0]["progress_percent"], 1.0)


if __name__ == "__main__":
    unittest.main()
