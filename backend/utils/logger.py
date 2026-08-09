"""
Backward-compatible logger shim.
All modules that import `from utils.logger import logger` continue to work
unchanged. The logger now delegates to core/logging.py so every log entry
automatically inherits structured formatting and correlation IDs.
"""

from core.logging import logger  # noqa: F401

__all__ = ["logger"]
