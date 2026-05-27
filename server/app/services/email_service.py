import re
import smtplib
from email.message import EmailMessage
from email.utils import make_msgid

from app.config import settings

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def is_valid_email(value: str) -> bool:
    email = (value or "").strip().lower()
    return bool(EMAIL_PATTERN.fullmatch(email))


def _is_smtp_configured() -> bool:
    return bool(
        settings.smtp_host.strip()
        and settings.smtp_from_email.strip()
        and settings.smtp_username.strip()
        and settings.smtp_password.strip()
    )


def send_b2b_follow_up_email(to_email: str, subject: str, body: str) -> dict:
    recipient = (to_email or "").strip().lower()
    if not recipient or not is_valid_email(recipient):
        return {
            "success": False,
            "provider": "smtp",
            "message_id": None,
            "error": "invalid_recipient_email",
        }

    if not _is_smtp_configured():
        return {
            "success": False,
            "provider": "smtp",
            "message_id": None,
            "error": "smtp_not_configured",
        }

    msg = EmailMessage()
    from_name = settings.smtp_from_name.strip() or "Workflow PH"
    from_email = settings.smtp_from_email.strip()
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = recipient
    msg["Subject"] = subject or "Workflow PH Follow-Up"
    msg["Message-ID"] = make_msgid()
    msg.set_content(body or "")

    try:
        with smtplib.SMTP(
            settings.smtp_host.strip(),
            int(settings.smtp_port),
            timeout=int(settings.smtp_timeout_seconds),
        ) as smtp:
            smtp.ehlo()
            if settings.smtp_use_tls:
                smtp.starttls()
                smtp.ehlo()
            smtp.login(settings.smtp_username.strip(), settings.smtp_password.strip())
            smtp.send_message(msg)

        return {
            "success": True,
            "provider": "smtp",
            "message_id": msg["Message-ID"],
            "error": None,
        }
    except Exception as exc:
        return {
            "success": False,
            "provider": "smtp",
            "message_id": msg["Message-ID"],
            "error": str(exc),
        }
