# Master Data

Master Data defines the shared business identities and reference records reused by operations, pricing, warehouse, and finance.

## Language

**Company Channel（公司渠道）**:
A company-maintained logistics service option associated with a carrier and shared by shipments, pricing rules, and fuel-rate rules.
_Avoid_: Agent Channel（代理渠道）, Carrier（承运商）

**Referenced Company Channel（受引用公司渠道）**:
A company channel currently associated with at least one shipment, pricing rule, or fuel-rate rule. Deleting it removes it from current master-data choices while preserving the internal record required by historical business references.
_Avoid_: Undeletable Channel（不可删除渠道）, Cascade-deleted Channel（级联删除渠道）

**Reference-Protected Delete（引用保护删除）**:
A master-data deletion that removes a record from current lists and future selection while preserving the internal record and historical business references. An unreferenced master-data record may instead be physically deleted.
_Avoid_: Cascade Delete（级联删除）, Disable（停用）

**代理价格表默认备注（Agent Price-book Default Remark）**:
An internal custom remark owned by one selected agent within one pricing lookup module. It is reused by later price-book uploads for the same agent and module, while existing price-book remarks remain historical snapshots.
_Avoid_: Global Agent Remark（全局代理备注）, Channel Requirement（渠道要求）
