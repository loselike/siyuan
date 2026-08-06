# Warehouse inventory summary repository slice

- Status: complete
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
- Pure totals characterization: 2/2 passed for the fixed 3-piece/25 kg/0.08 CBM sample and fallback grouping/rounding.
- Warehouse inventory API E2E: 2/2 passed, including summary equality, unauthenticated 401 and unauthorized 403.
- API typecheck passed; architecture check passed with 414 route contracts; `git diff --check` passed.
- The local clean integration base was behind two newer 47 API source files. Deployment candidates were therefore generated from the exact 47 files under checksum preconditions, and the candidate-vs-47 diff contained only the new import and three aggregation replacements.
- 47 release: `whitelist-d8f46f32bf7cf4062bba99fb`.
- Online source checksums:
  - `apps/api/src/modules/prisma.repository.ts`: `631da80569f0a3af818fe6de5fc42cf68fa55862a77ad71f86151c472ef039d6`
  - `apps/api/src/modules/in-memory.repository.ts`: `43f30de26329daf88ab5ee8c8239a6bc3ca99e8409bc0fc75a8ca108dcb42a3d`
  - `apps/api/src/modules/warehouse/inventory/warehouse-inventory-query.logic.ts`: `a05fbf61257357218a958b70eae557068b8c96b4e429d583260763e641e8602a`
- 47 API production build and restart passed; public health 200; online admin summary returned 200 with the seven expected totals keys; API container healthy; error-log scan found no runtime errors; release lock free; recovery marker clear.
- The direct online denied-role probe remains unconfirmed because the second temporary-JWT probe was rejected by execution approval. The equivalent local API E2E denial path passed with 403.
