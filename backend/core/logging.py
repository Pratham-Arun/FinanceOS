"""
Enterprise Structured Logger for FinanceOS.

Every log entry includes:
  - Level
  - Event Name
  - Timestamp (UTC ISO)
  - Correlation ID (X-Request-ID, propagated via ContextVar)
  - Arbitrary metadata fields

Usage:
    from core.logging import logger
    logger.info("Expense Created", expense_id="exp_001", employee="john@demo.com", amount=68.50)
    logger.warning("Policy Violation", expense_id="exp_003", violation="Amount exceeds limit")
    logger.error("AI Analysis Failed", expense_id="exp_007", error=str(e))
"""

import sys
import logging
import datetime
import json
from contextvars import ContextVar
from typing import Any

# ── Correlation ID Context ──────────────────────────────────────────────────
# Set per-request by CorrelationIdMiddleware in core/middleware.py.
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")


# ── Structured Formatter ────────────────────────────────────────────────────

class StructuredFormatter(logging.Formatter):
    """
    Emits log records as a single human-readable line:

    [2026-08-04 21:00:00] [INFO] [req=abc12345] Expense Created | expense_id=exp_001 employee=john@demo.com amount=68.5
    """

    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        level = record.levelname
        correlation_id = request_id_ctx.get("-")

        # The primary message (event name)
        event = record.getMessage()

        # Extra structured metadata attached via logger.info("Event", key=val)
        metadata = getattr(record, "_metadata", {})
        meta_str = " ".join(f"{k}={v}" for k, v in metadata.items()) if metadata else ""

        if meta_str:
            return f"[{timestamp}] [{level}] [req={correlation_id}] {event} | {meta_str}"
        return f"[{timestamp}] [{level}] [req={correlation_id}] {event}"


# ── Structured Logger Wrapper ───────────────────────────────────────────────

class StructuredLogger:
    """
    Thin wrapper around stdlib logging that injects structured metadata.

    Supports keyword arguments as structured fields:
        logger.info("Expense Created", expense_id="exp_001", amount=68.50)
    """

    def __init__(self, name: str = "financeos"):
        self._log = logging.getLogger(name)
        if not self._log.handlers:
            self._log.setLevel(logging.DEBUG)
            handler = logging.StreamHandler(sys.stdout)
            handler.setFormatter(StructuredFormatter())
            self._log.addHandler(handler)
            self._log.propagate = False

    def _emit(self, level: int, event: str, **kwargs: Any) -> None:
        record = self._log.makeRecord(
            name=self._log.name,
            level=level,
            fn="",
            lno=0,
            msg=event,
            args=(),
            exc_info=None,
        )
        record._metadata = kwargs  # type: ignore[attr-defined]
        self._log.handle(record)

    def debug(self, event: str, **kwargs: Any) -> None:
        self._emit(logging.DEBUG, event, **kwargs)

    def info(self, event: str, **kwargs: Any) -> None:
        self._emit(logging.INFO, event, **kwargs)

    def warning(self, event: str, **kwargs: Any) -> None:
        self._emit(logging.WARNING, event, **kwargs)

    def error(self, event: str, **kwargs: Any) -> None:
        self._emit(logging.ERROR, event, **kwargs)

    def critical(self, event: str, **kwargs: Any) -> None:
        self._emit(logging.CRITICAL, event, **kwargs)


# ── Singleton ───────────────────────────────────────────────────────────────
logger = StructuredLogger("financeos")
