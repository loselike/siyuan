# ADR 0005: Refactor Sunny incrementally as a modular monolith

- Status: Accepted
- Date: 2026-08-11

## Context

Sunny is already serving real logistics workflows, but production source and local Git history had diverged, several repositories and pages have grown into multi-thousand-line change hotspots, and finance, warehouse, shipment, permission, and presentation concerns still cross module boundaries. A big-bang rewrite would make existing business behavior, permissions, audit evidence, and production data transitions difficult to preserve.

Vendure and Medusa demonstrate explicit TypeScript domain modules and stable application boundaries; ERPNext demonstrates append-only financial evidence and controlled document transitions; Twenty demonstrates a React/NestJS monorepo with reusable workbench primitives; Ant Design Pro and ProComponents demonstrate consistent dense back-office interaction patterns; RuoYi-Vue-Plus demonstrates operational RBAC and audit coverage; OpenWMS demonstrates warehouse bounded contexts. Sunny will borrow these patterns without changing its TypeScript, NestJS, React, Ant Design, Prisma, PostgreSQL, and Docker Compose technology stack.

## Decision

The current source running on server 47 is the migration baseline. It is imported into an isolated `codex/sunny-refactor-phase1` worktree before refactoring so that later changes never silently remove already-released behavior.

Sunny will remain a modular monolith during this refactor. Each business capability is migrated one vertical slice at a time into four explicit layers: controller, application service, domain policy, and repository port/adapter. Existing HTTP routes, shared contracts, database schema, permissions, audit events, and observable business results stay compatible unless a separately accepted decision changes them.

Every extracted slice must have characterization or contract tests covering its important success and rejection paths before callers are switched. The first representative slice is Finance water-receipt handling because it exercises permissions, customer scope, currency, balances, matching, audit, and transactional persistence. Shared workbench UI primitives will be established only after the corresponding business behavior is stable.

## Consequences

- Refactoring can be released in small, reversible batches while production continues to operate.
- Large legacy repositories remain temporarily, but new or migrated behavior must enter through explicit domain/application boundaries instead of adding more unrelated methods to those files.
- The same domain policy can be tested against in-memory and Prisma adapters, reducing data-flow drift between development tests and production.
- Microservices, a framework rewrite, and a full UI replacement are deferred; they would add operational cost before the current domain boundaries are proven.
- Production baseline capture, contract tests, permission checks, audit evidence, and 47 post-release verification become required migration gates.

