# Warehouse inventory summary repository slice

- Status: in_progress
- Branch: `codex/warehouse-inventory-summary-repository-slice`
- Goal: first move the duplicated pure in-stock totals policy out of the giant Prisma/InMemory repositories without changing API, permission, data scope, query, audit, or persistence behavior.
- Fixed sample: two received rows for one ticket (2 × 10 kg and 1 × 5 kg) must still return 1 ticket, 3 pieces, 25 kg, 0.08 CBM, 1 exception, and write the same audit action.
- Allowed runtime files:
  - `apps/api/src/modules/warehouse/inventory/warehouse-inventory-query.logic.ts`
  - `apps/api/src/modules/in-memory.repository.ts`
  - `apps/api/src/modules/prisma.repository.ts`
- Allowed tests: pure warehouse inventory totals characterization and warehouse inventory API tests.
- Forbidden: schema/migration changes, endpoint/DTO changes, permission model changes, production data writes, unrelated refactors.
- Acceptance: fixed-sample pure totals test and warehouse inventory API effect test pass; API typecheck and architecture check pass; exact API-only whitelist deployment to 47; online source checksum, container, health, logs, lock, and recovery marker verified.

## Evidence

- Baseline focused tests exposed three pre-existing stale assertions; they are recorded and are not evidence of the new slice.
- The direct permission/data-query ownership move was deliberately deferred because its current characterization suite is stale. This slice centralizes only deterministic aggregation, leaving authorization, data scope, queries, and audit in their existing repositories.
