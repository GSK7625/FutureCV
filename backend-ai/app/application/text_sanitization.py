"""
Deterministic text sanitization helper for privacy and PII protection.

Redacts obvious email addresses and phone numbers from free-text fields before
text is passed to external AI services or embeddings.
"""

import re

# Email matching pattern
EMAIL_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")

# Phone number candidate pattern (validated via digit count 8..15)
PHONE_CANDIDATE_REGEX = re.compile(r"(?:\+?\d{1,4}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}\b")


def _redact_phone_match(match: re.Match[str]) -> str:
    """Redact match if it contains between 8 and 15 digits (phone number range)."""
    raw = match.group(0)
    digits = re.sub(r"\D", "", raw)
    if 8 <= len(digits) <= 15:
        return "[PHONE_REDACTED]"
    return raw


def sanitize_free_text(text: str | None) -> str:
    """
    Deterministically redact obvious email addresses and phone numbers from free text.

    Preserves surrounding text structure while replacing privacy-sensitive tokens.
    """
    if not text:
        return ""

    redacted = EMAIL_REGEX.sub("[EMAIL_REDACTED]", text)
    redacted = PHONE_CANDIDATE_REGEX.sub(_redact_phone_match, redacted)
    return redacted.strip()


# Backward-compatible alias
sanitize_semantic_text = sanitize_free_text

