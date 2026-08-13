# Sunny 深度重构 Phase 57

- 状态：`completed`
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

## 47 发布与发布后复审

- 提交：`3964a91a2636a1b53cb2d69e3a1d64c9e0884258`，已推送功能分支及发布协调分支。
- 47 发布：`git-3964a91a2636_web-3c24fed0279c_api-40e35302377a`，标准 Web scope、Git bundle provenance；未运行 migration、未写业务数据。
- 发布命令在新容器已经运行后因 SSH 连接未退出而悬停，人工中断按规则生成 recovery marker。已逐项核对源码三类 fingerprint、新 Web 静态标记、Web/API 运行镜像、API release ID、bundle SHA/只读权限、容器内 health 后补全不可变 receipt/state，并清除 recovery marker。
- 最终证据：provenance `traceable/ok`、Web/API image 与 API release ID 匹配、Web 静态产物含“当前作业队列”、容器内 Web/API 200、近期无关键错误、锁 free、recovery clear。公网 `47.120.33.111:18899` 从本机和服务器均超时，未把公网连通性误报为通过。
- 副作用审查：UI 只新增既有二级入口，数据汇总、权限过滤、请求时序、API、状态及提交结果不变；CSS 已组件化，未增加全局样式热点。

## 完成后重新排序

- 安全/正确性：改密和主动退出的 token 撤销仍需改变认证语义，保持待确认，不在行为保持重构中自动实施。
- 高频业务/UI：仓库看板空入口已解决；`FinancePage` 的基础资料占位来自外层未传 render 实现的组合方式，直接替换可能改变导航所有权，先不猜测。
- 架构/发布效率：本次标准发布暴露“远端 Docker build 已完成但 SSH 无输出悬停，最终 state 未落盘”的确定性高成本故障；该缺陷会使每个后续切片需要人工恢复并阻断发布队列，价值高于继续拆 `WarehousePage`。
- 下一选择：转向发布可靠性，先参考 OpenSSH keepalive 与 Moby/BuildKit 的可诊断长任务模式，为标准发布增加有界保活/超时和可恢复阶段证据；不得修改业务代码、容器业务配置或业务数据。
