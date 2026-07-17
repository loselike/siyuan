# Current Test Gaps

Last checked: 2026-07-07

## Verification Snapshot

- `npm run typecheck`: passed.
- `npm run test -w @siyuan/api -- --run src/modules/app.warehouse.e2e.test.ts`: passed 9/9.
- `npm run test -w @siyuan/api`: passed 58/58.
- `npm test`: shared and API passed; Web failed with 7 failures, 96 passed, 8 skipped.
- Old warehouse API e2e finance final-review setup is resolved under the current business self-review口径.

## Known Web Test Gaps

These are not treated as confirmed implementation bugs until the test setup is aligned to the current UI information architecture and async behavior.

| File | Failing setup | Classification | Current expected口径 / next action |
| --- | --- | --- | --- |
| `apps/web/src/modules/problemTickets/problemTickets.test.tsx` | Expects an accessible `问题件` button when opening the problem tickets page. | Old IA / selector | Current入口 is under customer-service/status pools; update the test to navigate by the current stable route or menu label. |
| `apps/web/src/modules/orders/orders.test.tsx` | Expects an accessible `运单管理` button and one callback wiring case times out. | Old IA / async stability | Current入口 uses the newer business/order workspace labels; update selectors and split the long callback assertion. |
| `apps/web/src/modules/settings/settings.test.tsx` | Role-group and master-data tests time out. | Async / test size | Split long setup or add stable waits after confirming no business regression. |
| `apps/web/src/modules/warehouse/warehouse.test.tsx` | Expects `亿阳国际.*¥0.50/kg`, but current row groups by price-book/line, e.g. `origin-transit-price.xlsx ... +¥0.50/kg`. | Old data assertion | Update assertion to current price-book grouping口径 while preserving the transit surcharge check. |
| `apps/web/src/modules/workspace/workspace.test.tsx` | Receive API refresh case times out. | Async / selector stability | Narrow the mocked API wait and assert the shipment refresh state through current stable table text. |

## Resolved

- `apps/api/src/modules/app.warehouse.e2e.test.ts`: `approveForRouting()` now prepares shipments through business self-review with `{ businessReview: true }`, not the deprecated finance final-review shortcut.
- `apps/api/src/modules/app.pricing.e2e.test.ts`: pricing tests remain aligned to the current visibility口径 where non-admin staff cannot see internal agent, route, cost, or gross-profit fields.

## True Bugs

- None confirmed from the latest checkpoint run.
- The remaining full-test failures are Web test口径, selector, or timeout gaps until a focused Web pass proves otherwise.

## Test Layering Policy

- Small validation: current module unit/e2e only.
- Medium validation: `npm run typecheck` plus current workspace tests.
- Large validation: `npm test` plus `npm run build`.
- Daily development defaults to small validation. Checkpoint or release work uses large validation and records known gaps here instead of expanding every task into a global cleanup.
