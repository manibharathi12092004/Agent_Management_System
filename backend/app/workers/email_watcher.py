"""
IMAP Email Watcher — polls email inboxes for active email-trigger schedules.

For each active email schedule:
  - Connects via IMAP SSL
  - Fetches UNSEEN emails
  - Marks them as read
  - Dispatches execute_scheduled_tasks with email content as input_data

Password is stored encrypted in trigger_config.encrypted_password.
"""
import email
import imaplib
import logging
from email.header import decode_header

logger = logging.getLogger(__name__)


def _subject_matches(mail, msg_id: bytes, keyword: str) -> bool:
    """Fetch just the subject header and check if keyword is contained (case-insensitive)."""
    try:
        _, data = mail.fetch(msg_id, "(BODY.PEEK[HEADER.FIELDS (SUBJECT)])")
        raw = data[0][1].decode("utf-8", errors="replace")
        subject = _decode_header_value(raw.replace("Subject:", "").strip())
        return keyword.lower() in subject.lower()
    except Exception:
        return False


def _decode_header_value(value: str | None) -> str:
    """Decode encoded email header (handles UTF-8, base64, etc.)."""
    if not value:
        return ""
    parts = decode_header(value)
    decoded = []
    for part, charset in parts:
        if isinstance(part, bytes):
            decoded.append(part.decode(charset or "utf-8", errors="replace"))
        else:
            decoded.append(str(part))
    return " ".join(decoded)


def _get_body(msg: email.message.Message) -> str:
    """Extract plain text body from email message."""
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            cd = str(part.get("Content-Disposition", ""))
            if ct == "text/plain" and "attachment" not in cd:
                try:
                    charset = part.get_content_charset() or "utf-8"
                    body = part.get_payload(decode=True).decode(charset, errors="replace")
                    break
                except Exception:
                    continue
    else:
        try:
            charset = msg.get_content_charset() or "utf-8"
            body = msg.get_payload(decode=True).decode(charset, errors="replace")
        except Exception:
            body = str(msg.get_payload())
    return body.strip()


def check_email_schedule(schedule) -> int:
    """
    Poll IMAP inbox for a single schedule.
    Returns number of emails processed.
    """
    from app.core.security import decrypt_api_key
    from app.workers.tasks import execute_scheduled_tasks

    cfg = schedule.trigger_config or {}
    email_addr = cfg.get("email", "")
    encrypted_pw = cfg.get("encrypted_password", "")
    imap_host = cfg.get("imap_host", "imap.gmail.com")
    imap_port = int(cfg.get("imap_port", 993))
    folder = cfg.get("folder", "INBOX")

    if not email_addr or not encrypted_pw:
        logger.warning(f"[EmailWatcher] Schedule '{schedule.name}' missing email/password — skipping")
        return 0

    try:
        password = decrypt_api_key(encrypted_pw)
    except Exception as e:
        logger.error(f"[EmailWatcher] Failed to decrypt password for '{schedule.name}': {e}")
        return 0

    processed = 0
    try:
        with imaplib.IMAP4_SSL(imap_host, imap_port) as mail:
            mail.login(email_addr, password)
            mail.select(folder)

            # Build IMAP search criteria — both FROM and SUBJECT filtered server-side
            filter_from    = cfg.get("filter_from", "").strip()
            filter_subject = cfg.get("filter_subject", "").strip()

            criteria_parts = ["UNSEEN"]
            if filter_from:
                criteria_parts.append(f'FROM "{filter_from}"')
            if filter_subject:
                criteria_parts.append(f'SUBJECT "{filter_subject}"')

            search_criteria = f'({" ".join(criteria_parts)})'
            logger.debug(f"[EmailWatcher] IMAP search: {search_criteria}")

            _, msg_ids = mail.search(None, search_criteria)
            ids = msg_ids[0].split()

            # If subject filter returned nothing, retry without subject
            # (some IMAP servers are case-sensitive) and filter in Python
            if not ids and filter_subject:
                fallback_parts = ["UNSEEN"]
                if filter_from:
                    fallback_parts.append(f'FROM "{filter_from}"')
                _, msg_ids = mail.search(None, f'({" ".join(fallback_parts)})')
                ids = msg_ids[0].split()
                # Python-side subject filter (case-insensitive)
                ids = [
                    mid for mid in ids
                    if _subject_matches(mail, mid, filter_subject)
                ]

            if not ids:
                logger.debug(f"[EmailWatcher] '{schedule.name}' — no new emails")
                return 0

            logger.info(f"[EmailWatcher] '{schedule.name}' — {len(ids)} new email(s)")

            for msg_id in ids:
                try:
                    _, data = mail.fetch(msg_id, "(RFC822)")
                    raw = data[0][1]
                    msg = email.message_from_bytes(raw)

                    from_addr = _decode_header_value(msg.get("From", ""))
                    subject   = _decode_header_value(msg.get("Subject", "(no subject)"))
                    body      = _get_body(msg)

                    # Mark as read immediately to prevent re-processing
                    mail.store(msg_id, "+FLAGS", "\\Seen")

                    # Dispatch workflow
                    execute_scheduled_tasks.delay(
                        str(schedule.id),
                        input_data={
                            "trigger_type": "email",
                            "email_from": from_addr,
                            "email_subject": subject,
                            "email_body": body[:5000],  # cap at 5k chars
                        },
                    )

                    logger.info(
                        f"[EmailWatcher] Triggered '{schedule.name}' "
                        f"from={from_addr} subject={subject[:60]}"
                    )
                    processed += 1

                except Exception as e:
                    logger.error(f"[EmailWatcher] Error processing email for '{schedule.name}': {e}")
                    continue

    except imaplib.IMAP4.error as e:
        logger.error(f"[EmailWatcher] IMAP error for '{schedule.name}' ({email_addr}): {e}")
    except Exception as e:
        logger.error(f"[EmailWatcher] Unexpected error for '{schedule.name}': {e}")

    return processed
