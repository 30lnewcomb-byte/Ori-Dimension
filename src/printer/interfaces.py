"""Typed interfaces between Ori and printer-specific integrations.

Concrete adapters must be implemented and tested separately for each printer.
This module performs no network discovery and sends no device commands.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass(frozen=True)
class PrinterObservation:
    printer_id: str
    observed_at: str
    connected: bool
    telemetry: dict[str, Any] = field(default_factory=dict)
    camera_frame_ref: str | None = None


class PrinterAdapter(Protocol):
    """Read-only adapter contract for an explicitly configured printer."""

    def find_configured_printer(self, configured_printer_id: str) -> str | None:
        """Confirm the configured printer exists; never scan arbitrary networks."""
        ...

    def observe(self, printer_id: str) -> PrinterObservation:
        """Return one timestamped camera/telemetry observation."""
        ...
