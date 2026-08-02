# 仓库效率与可理解性治理

- 状态：`in_progress`
- 会话标题：`Sunny｜仓库效率治理｜01`
- 续接自：无
- 上下文状态：`green`
- 已观察压缩：`2`
- 输入来源：`无（当前会话明确请求）`
- 会话 slug：`repository-efficiency-roadmap`
- 分支：`codex/repository-efficiency-roadmap`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/repository-efficiency-roadmap`
- 认领时间：`2026-08-02 Asia/Shanghai`

## 输入摘要

- 目标：按“47/Git 唯一基线、上下文压缩、垂直切片、最小验证映射”的顺序完成治理，以不改变现有业务逻辑、权限、金额、状态流转、数据和审计为第一约束。
- 固定样本：当前 47 运行源码 manifest、公开 Web/API health、357 条路由鉴权契约，以及问题件既有允许/拒绝路径和页面入口。
- 不做：不删除原脏工作树、不覆盖其他会话文件、不通过全仓同步覆盖 47、不执行破坏性迁移或生产业务写入、不做大爆炸式重构。

## 允许修改

- 当前独立 worktree 内的 Git/47 基线治理、上下文索引与检查脚本、架构模板、问题件垂直切片及其定向测试。
- 根脏工作树仅允许只读核对，不写入、不清理、不提交。

## 当前进度

- 已创建独立 clean worktree，继承已发布的代码瘦身分支历史。
- 47 发布锁空闲、recovery 状态为 clear。
- 已提交 47 当前生产源码只读快照 `2b87dcd`；运行文件 manifest 为 321/321，同哈希 321、内容差异 0、本地/远端独有均为 0、远端遗留物为 0。
- 独立 worktree 完成 `npm ci` 和 Prisma Client 生成；确认首次 Shared 大量缺失报错由 worktree 误解析根工作树依赖造成，不是 47 Shared 源码缺失。
- 47 当前生产源码中有 6 个已过期测试夹具；已仅更新测试输入/类型，不修改运行时代码。API/Web/Shared 生产构建已恢复可重复通过。
- `.codex-state.md` 已从 382,316 bytes / 231 条历史记录压缩为 1,765 bytes 的当前索引；原文完整保存到 `docs/archive/codex-state/`。
- `docs/dev-now/` 已从 219 个文件收敛到 3 个模板加本会话 1 个活跃文件；151 个终态/旧交接文件完整移入归档，64 个本地完成但未发布项移入 backlog，没有丢弃内容。
- 已新增 `context:check` 与 dry-run 优先的 `context:archive`；日常主线程已改为 Terra Medium，子任务默认 Luna Medium，Sol 仅按风险门升级，且规则明确不会自动切换当前主线程模型。
- 已移植并重建当前 47 源码对应的架构基线：401 条路由契约、3 组既有重复路由作为显式债务冻结，不改变当前运行路由。
- Finance Catalog 已固化为参考垂直切片：Controller→Service→Repository/Audit ports→Prisma/Memory adapters，Shared 领域 subpath 与 Web 窄 client 已落地；根 Shared 导出和 legacy memory 审计桥保持兼容。
- 问题件领域 owner 已从当前代码固化为 Customer Service；Shipment 保留主状态所有权。首个旧链路 `GET /problem-tickets` 已迁移到 Query Service/Port/Prisma 与 legacy adapters，写入、审计、通知和状态流转未移动。
- 已新增 `validation:select`：按变更路径选择每个切片的一条效果测试和一条安全门，Prisma 自动标记模型升级；Finance Catalog fixture/reset/handler 已从 6,499 行 `appTestHarness` 拆为独立 79 行领域 fixture。

## 验证

- 47 源码漂移审计：`LOCAL_COUNT=321`、`REMOTE_COUNT=321`、`SAME=321`、`CHANGED=0`、`LOCAL_ONLY=0`、`REMOTE_ONLY=0`、遗留物 0。
- API typecheck 通过；Web typecheck 通过；`npm run build` 的 Shared/API/Web 全部通过。
- API 过期夹具定向 3/3 通过；Web 类型夹具定向 8/8 通过；`git diff --check` 通过。
- `context:check` 通过：活跃状态 1、归档 151、backlog 64；`context:archive` dry-run 候选 0。
- `governance:check` 通过：开发规则、上下文、401 条路由/架构 no-new-debt、墨家设备拒绝路径 3/3 全部通过。
- Finance Catalog 双 adapter 契约 4/4、现有 API 读写权限/创建删除/审计场景 1/1 通过；API/Web typecheck 通过。
- 问题件双 query adapter 契约 4/4、真实 API 客户范围/岗位权限 2/2、Web client facade 1/1 通过。旧 `problemTickets.test.tsx` 仍指向已不存在的“问题件”按钮，作为历史测试拆分项保留，未据此修改运行界面。
- validation selector self-test 通过；Finance Catalog harness 真实 UI 场景 1/1 通过；Shared/API/Web 全量 typecheck 与治理门禁通过。

## 交接

- 阻塞：无。
- 剩余风险：47 现有 3 组重复 HTTP 路由已被门禁记录但尚未消除；不能在无等价接口证据时直接删除。当前治理提交改变 package scripts，最终标准发布前需重新取得 47 baseline receipt 并由发布流程更新远端源码基线。
- 用户验收目标：新任务能从唯一代码基线快速定位；上下文不重复加载历史；首个旧链路完成等价垂直切片；业务行为、权限、数据、金额、状态和审计不变。
- 效果证据：生产源码已从 237/321 漂移恢复为可独立构建的 321/321 精确快照。
- 安全证据：远端锁 clear/free；只读拉取未写 47；本轮修正仅测试文件；完整生产构建通过。
- 未验证项：最终生产构建、标准发布后的 47 新指纹和线上只读权限/响应证据。
- 发布状态：`未发布`。
- 稳定附件：无。
- 准确下一步：提交最小验证治理，执行最终生产构建与候选审查，再从干净提交按 baseline receipt 精确发布 47 并做只读线上验证。
- 建议新标题：`Sunny｜仓库效率治理｜02`
- 建议新状态文件：`docs/dev-now/repository-efficiency-roadmap-02.md`
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。
