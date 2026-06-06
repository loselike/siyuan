# M3 Finance Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the M3 minimum finance loop: quote calculation, shipment fees, receivable adjustments, and customer statement drafts.

**Architecture:** Shared owns DTOs and deterministic money calculations. API repositories expose finance use cases with Prisma in non-test and in-memory storage in tests. Web consumes the API through `apiClient` and renders staff finance/pricing plus customer-visible finance summaries.

**Tech Stack:** TypeScript, NestJS, Prisma/PostgreSQL, Vite React, Vitest, Supertest.

---

### Task 1: Shared Finance DTOs And Calculations

**Files:**
- Modify: `packages/shared/src/index.ts`
- Modify: `packages/shared/src/domain.test.ts`

- [ ] Add failing tests for quote totals, fuel, surcharges, adjustments, and statement totals.
- [ ] Add DTOs for quote request/response, fee summaries, adjustments, and customer statements.
- [ ] Implement pure functions for `calculateQuote`, `createFeeLinesFromQuote`, and `summarizeStatement`.
- [ ] Run `npm run test -w @siyuan/shared`.

### Task 2: API Finance Use Cases

**Files:**
- Modify: `apps/api/src/modules/app.e2e.test.ts`
- Modify: `apps/api/src/modules/data.controller.ts`
- Modify: `apps/api/src/modules/prisma.repository.ts`
- Modify: `apps/api/src/modules/in-memory.repository.ts`
- Modify: `apps/api/src/modules/seed.ts`

- [ ] Add failing e2e tests for quote, fee generation, customer isolation, adjustment, and statement draft.
- [ ] Add controller endpoints for pricing and finance.
- [ ] Implement repository methods in both Prisma and in-memory repositories.
- [ ] Seed starter receivable/payable fees and price inputs.
- [ ] Run `npm run test -w @siyuan/api`.

### Task 3: Web Finance UI

**Files:**
- Modify: `apps/web/src/apiClient.ts`
- Modify: `apps/web/src/App.test.tsx`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/styles.css`

- [ ] Add failing tests for pricing quote, finance receivable display, statement generation, and customer-visible fees.
- [ ] Extend `apiClient` with M3 endpoints.
- [ ] Render API-backed pricing and finance views.
- [ ] Add customer portal finance panels.
- [ ] Run `npm run test -w @siyuan/web`.

### Task 4: Full Verification

**Files:**
- All changed files

- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Report any limitations, especially local PostgreSQL not being connected yet.
