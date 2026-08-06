# Warehouse create tally modal slice

- 状态：`published_47`
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

- Published through the exact Web whitelist path; no API, Shared, Prisma, migration, or production-data write was included.
- Release ID: `whitelist-308e74a621bbb11b58d0c2d3`.
- Released at: `2026-08-06T08:35:04+08:00`.
- 47 source checksums match the local candidates:
  - `WarehousePage.tsx`: `526333321b78e0266ce94634aa9e8ee2f7ee7bba501b4458a0a22ff723bb7dd7`
  - `WarehouseCreateTallyModal.tsx`: `1948648a6c130c3138293b338b4c8978eb0ff95c9dc8561aaba1b20cbb2ed03a`
- Web container is running; inner root/health and public `:8899` root/health all returned HTTP 200.
- Recent Web logs contain normal Nginx startup and successful requests, with no release error observed.
