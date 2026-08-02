# 仓库看板实时指标一致性

- 状态：已完成并发布至 47
- 任务来源：2026-07-10 用户反馈“仓库看板与待出库数据不一致”。
- 根因：`WarehousePage` 的仓库看板使用写死示例值 `18 / 9 / 3`，待出库列表则使用实际运单和理货队列。
- 已完成：仓库看板改为实时统计。待出库复用与待出库表完全相同的队列行集；待理货与收货异常复用在仓汇总接口的实时返回值。
- 全局治理：问题件改为使用已加载的问题件列表生成待处理、已关闭、客户可见及明细/待办；市场排货 AI 上下文改为实时排货状态和当前运单；系统设置移除员工角色和审计项的硬编码兜底；`appShell` 旧模块配置中的示例统计、示例记录、示例待办已删除，避免被再次接入真实页面。
- 扫描结论：报价、订单、运营、报表、轨迹、财务、基础资料、客服、市场的现有可见指标均由接口响应、实时列表或其派生汇总生成，未发现第二处直接渲染的静态业务数字。
- 验证：`npm test -w @siyuan/web -- --run src/modules/warehouse/warehouse.test.tsx -t "shows today receipts dashboard"`、`npm test -w @siyuan/web -- --run src/modules/routing/routing.test.tsx`、`npm run typecheck -w @siyuan/web`、`git diff --check` 均通过。
- 已知基线：`workspace.test.tsx` 全量及“every staff module”定向用例因当前并行的权限菜单、详情字段、轨迹页面和待排货删除改动产生 4 个既有断言失败，不由本轮指标改造引起。
- 发布：2026-07-10 已同步至 `47:/opt/siyuan`，构建并重启 `api`、`web`、`db-migrate`；`prisma migrate deploy` 显示无待执行迁移，`/api/health` 和首页均返回 200。
- 未做：按用户要求未进行浏览器验证。
