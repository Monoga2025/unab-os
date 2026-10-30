import subprocess
import sys
import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))

import sync_tema_cloud as synchronizer


class TemaTextExtractionTest(unittest.TestCase):
    def test_extracts_and_bounds_pdf_text_without_a_shell(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "source.pdf"
            path.write_bytes(b"%PDF-1.4 fixture")
            completed = subprocess.CompletedProcess([], 0, stdout="  Tema\r\n" + "x" * 30_000, stderr="")
            with patch.object(synchronizer.subprocess, "run", return_value=completed) as run:
                result = synchronizer.extract_file_text(path, "application/pdf")

        self.assertEqual(result.status, "ready")
        self.assertEqual(len(result.text or ""), synchronizer.MAX_EXTRACTED_TEXT_CHARS)
        args, kwargs = run.call_args
        self.assertEqual(args[0][0:2], ["pdftotext", "-layout"])
        self.assertIs(kwargs["shell"], False)
        self.assertEqual(kwargs["timeout"], synchronizer.TEXT_EXTRACTION_TIMEOUT_SECONDS)

    def test_marks_image_only_pdf_for_ocr_and_command_failures_as_failed(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "source.pdf"
            path.write_bytes(b"%PDF-1.4 fixture")
            with patch.object(synchronizer.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, stdout=" \n", stderr="")):
                self.assertEqual(synchronizer.extract_file_text(path, "application/pdf"), synchronizer.TextExtraction("ocr_needed", None))
            with patch.object(synchronizer.subprocess, "run", side_effect=subprocess.TimeoutExpired("pdftotext", 8)):
                self.assertEqual(synchronizer.extract_file_text(path, "application/pdf"), synchronizer.TextExtraction("failed", None))

    def test_decodes_txt_strictly_and_rejects_unsupported_formats(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "notes.txt"
            path.write_bytes("Péndulo\x00\r\nMAS".encode())
            self.assertEqual(synchronizer.extract_file_text(path, "text/plain"), synchronizer.TextExtraction("ready", "Péndulo\nMAS"))
            path.write_bytes(b"\xff\xfe")
            self.assertEqual(synchronizer.extract_file_text(path, "text/plain"), synchronizer.TextExtraction("failed", None))
            self.assertEqual(synchronizer.extract_file_text(path, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), synchronizer.TextExtraction("unsupported", None))

    def test_unexpected_enrichment_errors_have_a_failed_representation(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "source.pdf"
            path.write_bytes(b"%PDF-1.4 fixture")
            with patch.object(synchronizer, "_run_pdftotext", side_effect=OSError("missing")):
                self.assertEqual(synchronizer.extract_file_text(path, "application/pdf"), synchronizer.TextExtraction("failed", None))


if __name__ == "__main__":
    unittest.main()
