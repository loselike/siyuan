# M3 最小财务闭环设计

## 目标

M3 将 M1+M2 的运单履约主干延伸到可收费、可调整、可对账的最小财务闭环。范围固定为报价试算、单票费用生成、费用调整、客户对账单草稿，不接入真实承运商价格、不处理支付核销、不做复杂文件导出。

## 范围

- 报价公式：基础运费 = 计费重 x 每公斤单价；燃油费 = 基础运费 x 燃油率；附加费为固定金额。
- 单票费用：应收费用和应付费用都按运单生成费用项，保留费用名称、金额、结算状态。
- 费用调整：员工或财务可以给运单追加正负调整项，并记录为费用项名称。
- 对账单草稿：按客户与日期范围汇总未结算应收费用，生成客户对账单草稿。
- 权限边界：客户只能看自己客户下的费用和对账单；员工、财务、管理员可以看全部。

## 架构

Shared 层提供 DTO 和纯函数计算，保证公式可测试、可复用。API 层在现有 repository 中新增 finance 方法，Prisma 路径使用现有 `ReceivableFee`、`PayableFee`、`CustomerStatement`，测试路径使用扩展后的 in-memory repository。Web 层继续使用同一个 Vite 应用，员工在报价/财务菜单使用真实 API，客户门户显示自己的费用和对账单入口。

## API

- `POST /pricing/quote`：报价试算，返回费用明细和总额。
- `POST /shipments/:id/fees/generate`：为运单生成应收和应付费用。
- `GET /finance/receivables`：按当前 principal 可见范围返回应收费用。
- `POST /shipments/:id/receivable-adjustments`：追加应收调整项。
- `GET /finance/customer-statements`：查看可见客户对账单。
- `POST /finance/customer-statements`：按客户和日期范围生成草稿对账单。

## Web

员工端 `pricing` 页面提供报价试算表单和结果。员工端 `finance` 页面显示应收费用、费用调整和对账单草稿操作。客户门户增加费用明细和对账单列表，只展示当前客户数据。

## 测试

- Shared：报价公式、燃油、附加费、负数调整、对账汇总。
- API：报价试算；发货后生成费用；客户不能看其他客户费用；调整项影响对账汇总；客户只能看自己的对账单。
- Web：报价页面调用 API；财务页面展示费用并生成对账；客户门户展示自己的费用。
