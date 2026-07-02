# 财务旧模型兼容清单

本文件记录旧财务模型仍参与的兼容路径。当前不物理删除旧表，新增财务闭环默认只写新事实源。

## 新事实源

- 三类费用：`ShipmentFinanceItem`
- 收款水单：`WaterReceipt`、`WaterReceiptMatch`
- 应付待付款队列：`PayablePaymentApplication`
- 付款申请与已付款：`PaymentApplication`、`PaymentApplicationItem`
- 凭证：`PaymentVoucher`、`WaterReceiptVoucher`

## 仍保留的旧模型

| 旧模型 | 当前用途 | 新模型映射 | 停用条件 |
| --- | --- | --- | --- |
| `ReceivableFee` | 老报价生成、客户应收兼容读取、客户账单兼容 | `ShipmentFinanceItem(type=RECEIVABLE)` | 报价生成和客户账单均改读写 `ShipmentFinanceItem` 后停用 |
| `PayableFee` | 老报价生成、单票费用兼容读取 | `ShipmentFinanceItem(type=PAYABLE)` 或 `BUSINESS_COST` | 老生成费用接口不再写 `PayableFee` 后停用 |
| `Payment` | 老客户收款接口 `/finance/payments` | `WaterReceipt` + `WaterReceiptMatch` | 客户收款全部改走收款管理后停用 |
| `Settlement` | 老收款核销明细 | `WaterReceiptMatch` | `/finance/payments` 停用后随 `Payment` 退出 |
| `CustomerStatement` | 客户对账单草稿兼容 | 后续对账单模型或 `ShipmentFinanceItem` 聚合 | 对账单模块完成新费用源改造后停用 |

## 当前约束

- 新录单、新应收审核、新业务成本审核、新应付审核、待付款、已付款、收款管理不得新增写入旧费用表。
- 旧接口保留兼容读取和历史业务，不主动迁移线上历史数据。
- 旧模型退出前必须先补对账单和客户收款的替代验收测试。
