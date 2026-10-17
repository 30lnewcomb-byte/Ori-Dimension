"""Safety-first find -> look -> think -> propose loop for Ori Dimension.

The normal loop never executes a physical action. It returns a proposal for
review. Hardware execution is intentionally outside this first implementation.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol

from src.printer.interfaces import PrinterAdapter, PrinterObservation


ALLOWED_ACTIONS = frozenset({
    "inspect",
    "pause_print",
    "resume_print",
    "stop_print",
    "request_human_help",
})


@dataclass(frozen=True)
class ActionProposal:
    action: str
    reason: str
    parameters: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class LoopResult:
    status: str
    printer_id: str | None = None
    observation: PrinterObservation | None = None
    proposal: ActionProposal | None = None
    message: str = ""


class Reasoner(Protocol):
    def think(self, observation: PrinterObservation) -> ActionProposal | None:
        """Interpret the observation and propose, but do not execute, an action."""
        ...


def validate_proposal(
    proposal: ActionProposal,
    observation: PrinterObservation,
) -> list[str]:
    issues: list[str] = []
    if proposal.action not in ALLOWED_ACTIONS:
        issues.append(f"Action is not on the allowlist: {proposal.action}")
    if not proposal.reason.strip():
        issues.append("Every proposal must include a non-empty reason")
    if not observation.connected:
        issues.append("Printer is not confirmed connected")
    if observation.telemetry.get("fault") or observation.telemetry.get("emergency_stop"):
        issues.append("Printer reports a fault or emergency-stop state")
    if proposal.action == "resume_print" and observation.telemetry.get("fault"):
        issues.append("Cannot propose resume while a fault is reported")
    return issues


def run_once(
    configured_printer_id: str,
    adapter: PrinterAdapter,
    reasoner: Reasoner,
) -> LoopResult:
    """Find one configured printer, observe it, think, and return a proposal.

    No action executor is accepted by this function, so this path cannot send
    commands to a physical printer.
    """
    if not configured_printer_id.strip():
        return LoopResult(status="needs_configuration", message="Configure a printer ID first.")

    found_id = adapter.find_configured_printer(configured_printer_id)
    if found_id is None:
        return LoopResult(
            status="printer_not_found",
            message="The configured printer was not confirmed. No action was taken.",
        )

    observation = adapter.observe(found_id)
    if observation.printer_id != found_id:
        return LoopResult(
            status="observation_mismatch",
            observation=observation,
            message="The observation belongs to a different printer. No action was taken.",
        )
    if not observation.connected:
        return LoopResult(
            status="printer_disconnected",
            printer_id=found_id,
            observation=observation,
            message="Printer is not connected. No action was taken.",
        )

    proposal = reasoner.think(observation)
    if proposal is None:
        return LoopResult(
            status="observed_no_action",
            printer_id=found_id,
            observation=observation,
            message="Observation completed; the reasoner did not request an action.",
        )

    issues = validate_proposal(proposal, observation)
    if issues:
        return LoopResult(
            status="proposal_rejected",
            printer_id=found_id,
            observation=observation,
            proposal=proposal,
            message="; ".join(issues),
        )

    return LoopResult(
        status="awaiting_approval",
        printer_id=found_id,
        observation=observation,
        proposal=proposal,
        message="Proposal prepared. This loop does not execute printer commands.",
    )
