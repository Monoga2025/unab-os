import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))

from tema_file_identity import stable_candidate_id


class TemaFileIdentityTest(unittest.TestCase):
    def test_reordering_contents_keeps_candidate_ids_and_handoff_target(self):
        files = [
            {
                "filename": "guia.pdf",
                "filepath": "/Semana 1/",
                "fileurl": "https://tema.unab.edu.co/webservice/pluginfile.php/10/mod_resource/content/1/guia.pdf?forcedownload=1&token=secret",
            },
            {
                "filename": "taller.pdf",
                "filepath": "/Semana 1/",
                "fileurl": "https://tema.unab.edu.co/webservice/pluginfile.php/10/mod_resource/content/1/taller.pdf?token=other",
            },
        ]
        first = {item["filename"]: stable_candidate_id(44, item) for item in files}
        reordered = {item["filename"]: stable_candidate_id(44, item) for item in reversed(files)}
        self.assertEqual(first, reordered)
        self.assertEqual(first["guia.pdf"], reordered["guia.pdf"])

    def test_token_and_query_order_do_not_change_identity(self):
        base = {
            "filename": "guia.pdf",
            "filepath": "/",
            "fileurl": "https://tema.unab.edu.co/webservice/pluginfile.php/10/mod_resource/content/1/guia.pdf?token=one&forcedownload=1",
        }
        refreshed = {**base, "fileurl": "https://tema.unab.edu.co/webservice/pluginfile.php/10/mod_resource/content/1/guia.pdf?forcedownload=0&token=two"}
        self.assertEqual(stable_candidate_id(44, base), stable_candidate_id(44, refreshed))

    def test_different_pluginfile_paths_do_not_collide(self):
        left = {"filename": "guia.pdf", "filepath": "/", "fileurl": "https://tema.unab.edu.co/webservice/pluginfile.php/10/mod_resource/content/1/guia.pdf"}
        right = {**left, "fileurl": "https://tema.unab.edu.co/webservice/pluginfile.php/11/mod_resource/content/1/guia.pdf"}
        self.assertNotEqual(stable_candidate_id(44, left), stable_candidate_id(44, right))


if __name__ == "__main__":
    unittest.main()
