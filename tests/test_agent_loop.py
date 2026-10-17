from __future__ import annotations

import unittest

from src.agent.loop import ActionProposal, run_once
from src.printer.interfaces import PrinterObservation


class FakeAdapter:
    def __init__(self, found: str | None = "printer-1", connected: bool = True) -> None:
        self.found = found
        self.connected = connected
        self.observation = PrinterObservation(
            printer_id="printer-1",
            observed_at="2026-01-01T00:00:00Z",
            connected=connected,
            telemetry={"state": "idle"},
            camera_frame_ref=None,
        )

    def find_configured_printer(self, configured_printer_id: str) -> str | None:
        return self.found if configured_printer_id == "printer-1" else None

    def observe(self, printer_id: str) -> PrinterObservation:
        return self.observation


class FakeReasoner:
    def __init__(self, proposal: ActionProposal | None) -> None:
        self.proposal = proposal

    def think(self, observation: PrinterObservation) -> ActionProposal | None:
        return self.proposal


class AgentLoopTests(unittest.TestCase):
    def test_proposal_waits_for_approval_and_is_not_executed(self) -> None:
        proposal = ActionProposal("pause_print", "Unexpected movement detected")
        result = run_once("printer-1", FakeAdapter(), FakeReasoner(proposal))
        self.assertEqual(result.status, "awaiting_approval")
        self.assertEqual(result.proposal, proposal)
        self.assertIn("does not execute", result.message)

    def test_unknown_action_is_rejected(self) -> None:
        proposal = ActionProposal("run_arbitrary_command", "Not allowed")
        result = run_once("printer-1", FakeAdapter(), FakeReasoner(proposal))
        self.assertEqual(result.status, "proposal_rejected")
        self.assertIn("allowlist", result.message)

    def test_missing_printer_stops_before_reasoning(self) -> None:
        result = run_once("printer-1", FakeAdapter(found=None), FakeReasoner(None))
        self.assertEqual(result.status, "printer_not_found")

    def test_disconnected_printer_stops_before_reasoning(self) -> None:
        result = run_once("printer-1", FakeAdapter(connected=False), FakeReasoner(None))
        self.assertEqual(result.status, "printer_disconnected")

    def test_empty_configuration_is_rejected(self) -> None:
        result = run_once("", FakeAdapter(), FakeReasoner(None))
        self.assertEqual(result.status, "needs_configuration")


if __name__ == "__main__":
    unittest.main()
