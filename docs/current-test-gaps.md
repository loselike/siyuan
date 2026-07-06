# Current Test Gaps

Last checked: 2026-07-07

## Verification Snapshot

- `npm run typecheck`: passed.
- `npm test`: failed in `@siyuan/api` before Web tests ran.
- Shared tests passed: 29/29.
- API tests passed except `apps/api/src/modules/app.warehouse.e2e.test.ts`: 53 passed, 4 failed.
- `apps/api/src/modules/app.pricing.e2e.test.ts`: passed under the current new pricing visibility口径.

## Known New-Business-口径 Test Failures

These are not treated as implementation bugs until the test setup is updated to the current workflow.

| File | Failing setup | Classification | Current expected口径 |
| --- | --- | --- | --- |
| `apps/api/src/modules/app.warehouse.e2e.test.ts` | `approveForRouting()` logs in `finance` and calls `POST /api/shipments/:id/review/approve`, expecting `201`, but gets `403`. | Business口径 changed | Label/dispatch/carrier-task scenarios should prepare shipments through the current business self-review / market routing path, not the old finance final-review shortcut. |

Affected tests:

- `creates mock carrier labels, reuses active labels, dispatches with generated transfer number, and protects staff-only label details`
- `voids an unshipped label and prevents dispatching with the voided transfer number`
- `creates carrier tracking tasks after dispatch and runs a successful customer-visible sync`
- `marks carrier tracking tasks failed and lets staff retry them successfully`

## True Bugs

- None confirmed in the latest checkpoint run.

## Deprecated Old Assertions

- Old warehouse e2e setup that treats finance as the final shipment reviewer is deprecated.
- Pricing tests must keep the new visibility口径: non-admin staff must not see internal agent, internal route, cost, or gross-profit fields.

## Test Layering Policy

- Small validation: current module unit/e2e only.
- Medium validation: `npm run typecheck` plus current workspace tests.
- Large validation: `npm test` plus `npm run build`.
- Daily development defaults to small validation. Checkpoint or release work uses large validation and records known gaps here instead of expanding every task into a global cleanup.
