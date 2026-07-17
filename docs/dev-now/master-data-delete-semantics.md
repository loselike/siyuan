# 全系统删除功能语义统一治理

- 状态：已完成（第四阶段：财务与录单删除入口）
- 任务来源：2026-07-10 用户任务卡《全系统删除功能语义统一治理》
- 本会话范围：全局删除入口扫描；基础资料库代表模块的公司渠道、代理渠道、渠道类别、代理资料、客户资料；第二阶段报价配置的代理加价规则，以及系统员工账号。
- 本会话不做：47 发布；批量清理或历史数据回填。
- 已完成：代理渠道、公司渠道、渠道类别的“删除”改为真实 DELETE；公司渠道和渠道类别增加引用保护；联系人和汇率原有的停用操作统一改为“停用”文案；输出全局删除语义扫描清单。
- 第二阶段：代理加价规则和南非物料规则的单条/批量删除改为物理删除；员工账号仅在没有登录记录时物理删除，有登录记录时拒绝并要求使用现有停用入口。
- 验证：
  - 通过：`npm test -w @siyuan/web -- --run src/modules/masterData/masterData.test.tsx -t "删除|停用|物理删除|公司渠道|代理渠道"`（3 passed）。
  - 通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.orders.e2e.test.ts -t "physically deletes unreferenced master data channels"`。
  - 通过：`git diff --check`。
  - 已知基线问题：全量筛选 API 测试会因既有代理删除用例的共享内存状态污染失败；API/Web typecheck 分别被未合并的价格表类型改动阻断，未报告本任务删除接口的类型错误。
  - 第二阶段通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "markup rules"`、`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.orders.e2e.test.ts -t "lets admins maintain master data"`、`npm run typecheck -w @siyuan/api`、`git diff --check`。
  - 已知基线问题：完整 `pricing.test.tsx` 有 4 个既有页面断言失败（查询模块文案和代理展示断言），与本轮删除接口无关。
- 第三阶段目标：将财务页面文字为“删除”的应付审核和订单费用删除改为物理删除；存在付款申请、付款记录或水单匹配引用时拒绝删除。界面文字为“作废”的应收、业务成本和水单保持原有作废语义。
- 第三阶段完成：应付审核及订单费用的 DELETE 均改为物理删除；付款申请、付款记录、账单凭证和水单匹配成为引用保护。弹窗同步说明“删除后不可恢复”，审计使用 `finance.payable.delete` / `shipment.finance_item.delete` 并记录 `hardDelete: true`。
- 第四阶段完成：录单草稿的“删除”改为物理删除，草稿费用和关联草稿数据一并清理并释放仓库包裹；一旦已有付款、水单、轨迹、面单、承运任务或问题件引用，后端拒绝删除且保留全部历史链路。
- 补充修复：代理资料删除仅由仍有效价格表或进行中的导入任务阻断；价格表已删除后，其完成/失败的历史导入任务不再阻断代理物理删除。
- 发布：2026-07-10 已同步至 47；差异范围为 `api+web`，未命中 Prisma schema/migration，未运行迁移。已重建并重启 `api`、`web`，`postgres/redis` 保持运行；47 本机首页和 `/api/health` 均返回 200。同步脚本补充排除远端 `backups/`，避免 `--delete` 清理服务器备份目录。
