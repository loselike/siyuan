# ADR 0004: Cross-bill direct-paid archive bypasses payment applications

- Status: Accepted
- Date: 2026-08-01

## Context

Some approved cross-bill fees are paid outside Sunny before any hang request or payment application exists. Creating a fictitious payment application would misrepresent the real operating path, while silently archiving would lose the financial reason and actor.

## Decision

Finance may use a dedicated direct-paid archive action only when the cross-bill fee is confirmed, payable-audited, unvoided, unarchived, has `hangStatus=NONE`, and has no active pending-payment/payment object. The action requires a payment note, records actor/time/amount/currency/route in the audit log, and sets the fee archive timestamp atomically.

The normal hang route remains unchanged in meaning: the salesperson submits a hang request, Finance approves it, and the system creates a pending-payment object. Any fee that entered that route cannot use direct-paid archive.

## Consequences

- Finance can accurately close externally paid cross-bill fees without fabricating a payment application.
- Direct-paid archive has stricter eligibility and no implicit fallback from the normal payment chain.
- Payment proof remains an operational responsibility outside this minimal action; Sunny requires a written payment note and preserves immutable audit evidence.
