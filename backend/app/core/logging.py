"""
Structured Logging Configuration for Gujjar Petrolium Kot Gujjran.
Formats logs with timestamps and masks sensitive tokens, keys, and credentials.
"""

import logging
import re
import sys
from typing import Any

# Patterns to mask sensitive data
SENSITIVE_PATTERNS = [
    (re.compile(r'(bearer\s+)[a-zA-Z0-9_\-\.]+', re.IGNORECASE), r'\1***MASKED***'),
    (re.compile(r'("?(?:access_token|secret_key|api_key|token|password)"?\s*[:=]\s*"?)[^"\s&,]+("?)', re.IGNORECASE), r'\1***MASKED***\2'),
]


class SensitiveDataFilter(logging.Filter):
    """Filter that masks tokens and credentials from log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            for pattern, replacement in SENSITIVE_PATTERNS:
                record.msg = pattern.sub(replacement, record.msg)
        return True


def setup_logging(debug: bool = False) -> logging.Logger:
    """Configure system-wide structured logger."""
    level = logging.DEBUG if debug else logging.INFO

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.addFilter(SensitiveDataFilter())

    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] [%(name)s]: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    # Remove existing handlers to avoid duplicates
    root_logger.handlers = []
    root_logger.addHandler(handler)

    logger = logging.getLogger("gujjar_petrolium")
    logger.setLevel(level)
    return logger


logger = logging.getLogger("gujjar_petrolium")
