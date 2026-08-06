# Warehouse create tally modal slice

- Status: in_progress
- Branch: `codex/warehouse-create-tally-modal-slice`
- Worktree: `/private/tmp/sunny-warehouse-create-tally-modal-slice`

## User outcome

Continue reducing warehouse-module hotspot size without changing existing business logic.

## Fixed acceptance sample

Selecting 2 in-stock packages and opening “发起理货” still shows the selected count, preserves the controlled tally-requirement input, delegates cancel to the page-owned reset flow, and delegates confirm to the existing `createWarehouseTallyTask` handler.

## Scope

- Extract only the existing create-tally modal markup into `WarehouseCreateTallyModal`.
- Keep selection state, validation, API calls, notices, permissions, task status transitions, and refresh behavior in `WarehousePage` unchanged.
- Add a focused component test for the extracted boundary.
- No API, Repository, Shared, Prisma, permission, production-data, or visual redesign changes.

## Validation

- `npm run test:web:safe -- --run src/modules/warehouse/WarehouseCreateTallyModal.test.tsx`: 2/2 passed.
- `npm run typecheck -w @siyuan/web`: passed.
- `npm run architecture:check:fast`: passed, 414 route contracts.
- `git diff --check`: passed.

## Publish

- Pending exact Web whitelist publication to 47.
