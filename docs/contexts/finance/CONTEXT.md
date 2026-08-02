# Finance Context

## Purpose

Finance manages receivable correctness, confirmed incoming funds, water-receipt allocation, and the resulting posted balances.

## Canonical Terms

- **费用审核状态**: A fee has exactly two audit states: 待审核 and 已审核. 已审核 intrinsically means the fee is locked against editing and deletion; 锁定 and 作废 are not additional fee-audit states.
- **水单匹配状态**: The receipt-allocation progress of a receivable fee. It is 未匹配 when no active request or approved allocation exists, 待匹配审核 while an allocation request awaits Finance, 部分匹配 after approved allocations are greater than zero but below the receivable amount, and 已匹配 after approved allocations reach the receivable amount.
- **应收审核**: Finance confirms a receivable fee. Approval changes its 费用审核状态 from 待审核 to 已审核.
- **水单到账确认**: Finance confirms that the money represented by a water receipt has actually arrived. Only an arrived receipt with remaining balance can enter matching.
- **水单匹配申请**: A business user proposes allocating an arrived water receipt to one or more unpaid receivables belonging to that user's customer scope. A pending request reserves available matching capacity but does not change posted balances.
- **费用级匹配审核**: Finance reviews the pending water-receipt allocations of one receivable fee from 应收审核. One fee can be reviewed and posted multiple times when the customer pays in installments.
- **正式落账**: The approved match updates the water-receipt balance, receivable received amount and receipt status, customer account balance, and related ledger facts as one financial action.
- **匹配反审核**: Finance reverses one previously approved allocation from 应收审核, restores only that allocation's posted balances, and returns the active allocation to pending so it reserves the same water-receipt capacity for correction and re-review; the approval and reversal remain in audit history.
- **水单编号**: The immutable system-generated identifier of a water receipt.
- **付款编号**: The manually entered external payment reference attached to a water receipt.
- **跨越账单运单归属**: A cross-bill fee is assigned with both a customer and a specific shipment, then contributes an auditable business-cost and payable-cost entry to that shipment.
- **跨越账单客户挂账**: A cross-bill fee without an available shipment is assigned by customer code to that customer's responsible salesperson. It remains customer-scoped rather than being guessed onto a shipment; the salesperson may initiate a hang request without seeing payable-sensitive fields.
- **跨越账单直接已付归档**: Finance confirms that an already-audited cross-bill fee with no hang request and no active payment object was paid outside the normal hang/payment-application chain. The fee is archived atomically and the actor, time, amount, currency, route, and required payment note remain in the audit trail.

## Invariants

- Matching requires an arrived receipt, remaining receipt balance, the same customer, the same currency, and an unpaid receivable amount.
- Business users can submit matching only for customers within their own responsibility scope.
- A receivable fee may have multiple pending or approved allocations from different water receipts, but their total cannot exceed the fee's unpaid amount.
- A pending allocation can be modified or deleted by its business owner or Finance; an approved allocation can only be reversed by Finance before it can be replaced.
- Partial posting is allowed: Finance may approve an allocation before the receivable fee is fully paid, and later allocations are reviewed independently.
- A pending allocation has precedence in the displayed 水单匹配状态; after it is approved, the displayed state is recalculated from the cumulative approved amount as 部分匹配 or 已匹配.
- Reversing an approved allocation returns that allocation to pending and immediately reserves the same amount again; it does not expose that capacity to another allocation until the pending allocation is changed, deleted, or re-approved.
- Audited receivable fees cannot be modified or deleted. An unaudited receivable remains editable only while it has no pending or approved water-receipt match; otherwise the match request must be deleted or reversed first.
- Match approval and reversal must preserve water-receipt, receivable, customer-account, and ledger balance consistency.
- A customer-scoped cross-bill fee must not be attached to an arbitrary shipment merely because the customer has multiple shipments.
- A cross-bill direct-paid archive is allowed only when both costs are confirmed, payable audit is approved, hang status is NONE, and no active pending-payment or payment application exists.

## Relationships

- **Business** submits and maintains pending allocations for its own customers; **Finance** confirms arrival and controls review, reversal, and formal posting from 应收审核.
- **Order** owns the receivable fee; **Finance** owns its audit and receipt-allocation states.
