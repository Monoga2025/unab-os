import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))

from tema_snapshot_policy import completeness_map


class TemaSnapshotPolicyTest(unittest.TestCase):
    def test_grade_failure_preserves_old_grades_but_core_removes_absent_course(self):
        scopes = completeness_map(
            core_complete=True,
            files_complete=True,
            grades_complete=False,
            announcements_complete=True,
        )
        self.assertTrue(scopes["courses"])
        self.assertTrue(scopes["sections"])
        self.assertTrue(scopes["activities"])
        self.assertFalse(scopes["grades"])

    def test_core_failure_preserves_structure_and_dependent_resources(self):
        scopes = completeness_map(
            core_complete=False,
            files_complete=True,
            grades_complete=True,
            announcements_complete=True,
        )
        self.assertTrue(scopes["courses"])
        self.assertFalse(scopes["sections"])
        self.assertFalse(scopes["activities"])
        self.assertFalse(scopes["files"])
        self.assertFalse(scopes["announcements"])
        self.assertTrue(scopes["grades"])


if __name__ == "__main__":
    unittest.main()
