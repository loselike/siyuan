# Sunny GitHub reference projects

This catalog records which patterns Sunny deliberately adopts. It is a design constraint, not a license to copy entire frameworks or replace working business behavior.

| Reference | Patterns Sunny adopts | Sunny boundary |
| --- | --- | --- |
| [Vendure](https://github.com/vendure-ecommerce/vendure) | NestJS domain modules, explicit extension points, background work separated from request handling, admin UI design-system discipline | Keep Sunny's logistics terminology, Prisma schema, APIs, and deployment model |
| [Medusa](https://github.com/medusajs/medusa) | Module services, workflow steps with compensating behavior, idempotent commands, runtime contract validation | Introduce these one slice at a time; do not replace NestJS or rewrite all commands |
| [ERPNext](https://github.com/frappe/erpnext) | Stock and finance ledgers, submitted/cancelled document semantics, reversal evidence instead of silent overwrites | Preserve Sunny's existing finance approval vocabulary and add immutable evidence around it |
| [Twenty](https://github.com/twentyhq/twenty) | TypeScript monorepo boundaries, configurable dense list views, reusable field/filter/workflow primitives | Reuse Sunny's React, Ant Design, permissions, and business-specific fields |
| [Ant Design Pro](https://github.com/ant-design/ant-design-pro) and [ProComponents](https://github.com/ant-design/pro-components) | Page containers, query tables, complex forms, detail surfaces, error/empty/loading states | Prefer Sunny's existing `ManagedTable` and local design tokens before adding dependencies |
| [RuoYi-Vue-Plus](https://github.com/dromara/RuoYi-Vue-Plus) | Organization/role/data-scope separation, login and operation audit, files and scheduled-job administration | Borrow operational concepts only; do not switch to Java or Vue |
| [OpenWMS](https://github.com/openwms) | Receiving, inventory, routing, and shipping as bounded contexts | Use bounded-context vocabulary inside a modular monolith; do not split microservices yet |

## Refactor rules derived from the references

1. A business invariant lives in one named domain policy and is reused by every persistence adapter.
2. Controllers translate HTTP only; application services coordinate permissions, transactions, repositories, and audit.
3. Financial facts are posted or reversed with traceable evidence; historical meaning is not silently overwritten.
4. Shared API types and runtime validation evolve together.
5. Back-office pages use one predictable workbench grammar: page header, compact filters, `ManagedTable`, detail surface, explicit state and permission feedback.
6. A slice is migrated only with observable success and rejection tests plus a production-compatible rollout path.

