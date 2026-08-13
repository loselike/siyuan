# Sunny 深度重构 Phase 57

- 状态：`in_progress`
- 分支：`codex/sunny-refactor-phase56`
- 基线提交：`23f19cc`
- 47 基线：`git-f38c6af956f4_web-7fd6e14600c5_api-40e35302377a`
- 用户验收目标：每个切片完成后重新审查并参考成熟 GitHub 项目；整个系统业务逻辑不得改变。

## 本轮重评

- P0 安全/正确性：改密或主动退出撤销 token、全局 DTO ValidationPipe 都会改变现有认证或拒绝行为，不纳入行为保持重构。
- P1 高频业务/UI：仓库管理页 5,131 行；拥有 `warehouse:dashboard:view` 的岗位进入仓库看板时只看到三张统计卡和“暂无可操作内容”，不能从异常/待理货/待出库直接进入既有作业区。
- P1 后端维护性：Prisma/InMemory 仍为 31,997/19,416 行，但继续抽取的用户可见收益低于修复仓库主入口。
- 选择：转向仓库看板的最小纵向切片，只复用已经加载的 `inStockTotals` 和既有二级入口；不增加 API、不改变查询、权限、字段、状态或提交结果。
- 固定样本：管理员进入仓库看板看到与原三项完全相同的数量；点击“查看待理货”进入原 `consolidation`，点击“查看待出库”进入原 `queue`；没有对应入口权限时不显示动作。

## 成熟参考与取舍

- Ant Design Pro：https://github.com/ant-design/ant-design-pro （MIT）。借鉴 Workplace/Monitor 模板将摘要与当前工作入口组合，不把后台首页做成纯装饰统计；不引入 Umi、ProComponents 或新路由框架。
- Vendure Dashboard：https://github.com/vendurehq/vendure （GPL-3.0）。借鉴 dashboard widget 的 `requiresPermissions` 和可操作工具栏原则；Sunny 继续使用既有 canonical permissions，不复制代码或设计系统。
- Refine：https://github.com/refinedev/refine （MIT）。借鉴数据密集内部工具把资源状态和动作保持在同一工作上下文；不引入 Refine/React Query，也不改变 Sunny 当前请求时序。

## 风险与行为保护

- 风险：统计数量、权限显隐、二级导航键或数据请求时序漂移。
- 保护：新组件只接收原 `dashboardStats` 等价数据和可见入口列表；动作调用现有 `setActiveReceiveSection`；定向测试锁定数值、文案、权限和导航；现有 scoped loading 测试继续证明 dashboard 只请求 today + summary，不请求完整在仓列表。

## 本地实施与审查

- 仓库看板改为三张可操作队列卡，继续使用原 `inStockTotals` 三项统计；动作只切换既有 `today` / `consolidation` / `queue`，并按 `receiveSubItems` 的现有权限结果隐藏无权入口。
- 新样式与组件同目录，未增加全局 `styles.css` 热点债务；900px 以下单列排列。
- 修复既有在仓分页测试夹具，使保护网与当前 `warehouseInStockPage` 调用一致；没有改变运行时代码的查询方法。
- 自审调用链：`WarehousePage` 原汇总查询 -> `inStockTotals` -> `WarehouseDashboardPanel` -> 原 `setActiveReceiveSection` -> `ModuleSubWorkspace`。未发现新增 API、权限、状态、写操作、审计或业务字段变化。
- 本地证据：Dashboard/Page 定向测试 6/6、Web typecheck、`git diff --check`、governance/context/architecture、安全契约 3/3 均通过。
