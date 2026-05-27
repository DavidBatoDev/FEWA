import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SERVER_DIR = ROOT / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from app.services.email_service import send_b2b_follow_up_email


class TestEmailService(unittest.TestCase):
    def test_send_email_success(self):
        with patch("app.services.email_service._is_smtp_configured", return_value=True):
            with patch("app.services.email_service.smtplib.SMTP") as mock_smtp:
                smtp_ctx = mock_smtp.return_value.__enter__.return_value
                smtp_ctx.send_message.return_value = {}
                result = send_b2b_follow_up_email(
                    to_email="lead@example.com",
                    subject="Meeting Notes",
                    body="Body",
                )

        self.assertTrue(result["success"])
        self.assertEqual(result["provider"], "smtp")
        self.assertIsNotNone(result["message_id"])

    def test_send_email_failure(self):
        with patch("app.services.email_service._is_smtp_configured", return_value=True):
            with patch("app.services.email_service.smtplib.SMTP", side_effect=Exception("smtp down")):
                result = send_b2b_follow_up_email(
                    to_email="lead@example.com",
                    subject="Meeting Notes",
                    body="Body",
                )

        self.assertFalse(result["success"])
        self.assertEqual(result["provider"], "smtp")
        self.assertIn("smtp down", result["error"])

    def test_send_email_invalid_recipient(self):
        with patch("app.services.email_service._is_smtp_configured", return_value=True):
            result = send_b2b_follow_up_email(
                to_email="not-an-email",
                subject="Meeting Notes",
                body="Body",
            )
        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "invalid_recipient_email")


if __name__ == "__main__":
    unittest.main()
