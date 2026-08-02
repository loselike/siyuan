# Customer Service

The Customer Service context owns problem-ticket handling, replies, assistance requests, closure, and the customer-visible communication boundary. Shipment remains the owner of shipment lifecycle state.

## Language

**问题件**:
A customer-service case attached to one shipment. It records a reason, visibility, replies, assistance state, and closure data without replacing the shipment's own lifecycle status.
_Avoid_: using 问题件状态 to mean 运单状态

**客户可见**:
A ticket-level disclosure flag. Customer accounts may read only customer-visible tickets attached to their own customer ID; internal roles still require the corresponding backend permission.
_Avoid_: treating menu visibility as the customer data-scope rule

**需协助**:
An open problem ticket that has been marked `ASSISTANCE_REQUIRED` with an assistance reason. It remains part of the problem-ticket lifecycle and does not transition the shipment.

**关闭问题件**:
The transition of a problem ticket to `CLOSED`, including closed time, operator, and reason. Closing the last open ticket removes the derived “has problem ticket” signal but does not restore or alter the shipment lifecycle status.

**常用标签快照**:
The selected enabled problem-ticket tag names copied onto a ticket at creation time so later tag maintenance does not rewrite historical meaning.
