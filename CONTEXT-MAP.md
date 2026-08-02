# Context Map

## Contexts

- [Warehouse](./docs/contexts/warehouse/CONTEXT.md) — manages warehouse receiving, inventory state, outbound handling, and warehouse rent.
- [Finance](./docs/contexts/finance/CONTEXT.md) — manages receivable fees, water-receipt arrival confirmation, match review, and formal posting.
- [Master Data](./docs/contexts/master-data/CONTEXT.md) — manages shared customers, agents, carriers, and company channels used by operational records and pricing.
- [Company Channel](./docs/contexts/company-channel/CONTEXT.md) — defines carrier-channel charge-weight terminology and calculation boundaries.
- [Notifications](./docs/contexts/notifications/CONTEXT.md) — delivers announcements and business-event messages without owning or changing the underlying workflow state.
- [Customer Service](./docs/contexts/customer-service/CONTEXT.md) — owns problem-ticket handling and customer-visible communication while Shipment retains ownership of shipment lifecycle state.

## Relationships

- **Warehouse → Finance**: Warehouse rent produces RMB charge results that can be used by downstream financial workflows.
- **Business → Finance**: Business users submit water-receipt match requests for their own customers; Finance reviews them before formal posting.
- **Master Data → Business / Pricing / Finance**: Company channels and other shared reference data are selected by downstream operational, pricing, and financial records.
- **Company Channel → Finance**: Company-channel rules determine the charge weight used by downstream fee calculation.
- **Business / Warehouse / Finance / Customer Service → Notifications**: Committed audit events are translated into user-scoped deliveries and, where an individual must correct source data, a personal return-work task; reading, archiving, or acknowledging a delivery never changes the source business record.
- **Customer Service → Shipment**: A problem ticket references a shipment and exposes a derived “has problem” signal, but its OPEN / ASSISTANCE_REQUIRED / CLOSED lifecycle does not replace or directly transition the shipment lifecycle status.
