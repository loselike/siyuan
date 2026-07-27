# 代码瘦身治理第八十七阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜87`
- 续接自：`docs/dev-now/codebase-slimming-phase-86.md`
- 上下文状态：`green`
- 输入来源：持续目标要求优先处理 Repository/API 高频只读查询中的全量关系加载与内存过滤
- 会话 slug：`codebase-slimming-phase-87`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-27 Asia/Shanghai`

## 输入摘要

- 目标：缩短客服转单候选 GET 的数据库与映射路径，避免为了最终候选加载全部可见运单及关系。
- 固定样本：客服角色只看到本人名下“已出库且转单号为空”的运单；客户继续拒绝；可见候选仍须业务与代理数据审核均通过，并执行原字段裁剪。
- 硬边界：API路径、HTTP方法、参数、状态码、错误文案、返回字段、RBAC、数据范围、字段裁剪、数据库、写入、状态流转、审计、页面入口、按钮、筛选、表格字段和提交载荷不变。

## 修改

- `apps/api/src/modules/prisma.repository.ts`
- `apps/api/src/modules/prisma.repository.transfer-query.test.ts`
- `docs/dev-now/codebase-slimming-phase-87.md`
- `.codex-state.md`

## 当前进度

- `getShipments` 新增可选 Prisma `where`，并以 `AND` 叠加到既有客户/业务员可见范围，未替换或放宽原范围。
- 客服转单查询把 `status=OUTBOUNDED`、`transferNo IS NULL/空字符串` 和非全量角色的精确业务员归属前推到数据库。
- 精确业务员条件保留原映射回退语义：优先客户归属业务员；仅当客户业务员为 `null` 时回退到录单人。
- 完整 `shipmentIncludes`、站点映射、排货/出库归档、市场字段遮罩、数据确认周期审核和客服字段裁剪继续复用原链路。
- 本地生产源码增加26行、删除12行，净增加14行；新增85行定向测试。本阶段收益是减少数据库读取、关系映射和审计扫描，不计作代码行减量。

## 验证

- Prisma谓词叠加与客服精确归属/字段裁剪单测2/2通过；客服只读接口允许/拒绝契约2/2通过，合计4/4。
- `git diff --check`通过；目标测试文件无ESLint或TypeScript错误。API全量typecheck仍被既有仓库生命周期、可选字符串和财务筛选返回类型错误阻断，目标新增错误为0。
- 47优化前管理员8次预热请求：返回200/0条/2 bytes，P50 45.2ms、P95 71.7ms；当前库共5票，已出库且转单号为空为0票。
- 47候选基于线上当前22,192行 Repository 单文件生成，只增加27行、删除13行；完整保留线上独有的排货归档、客服数据确认周期反审判断和专线查询范围。
- 47只构建/重启API，无Web构建和数据库迁移；production build通过，源码SHA-256为 `a432a6dabd9083be5803d7298c001a1f7f752fd6149d78d49820c684b9b76706`，源码和活动dist均包含新谓词1次。
- 47管理员与`UG_CUSTOMER_SERVICE`均返回200/0条；客户、仓库、财务、市场、业务角色均保持403“没有访问权限”；未登录仍为401“缺少登录凭证”。
- 47优化后管理员8次预热请求：返回200/0条/2 bytes，P50 32.4ms、P95 37.9ms，较前分别下降28.3%和47.1%。当前样本量很小，因此不把该比例外推到大数据量。
- API容器、容器内health、宿主18899 health、公网8899首页/API health均为200，发布窗口实际ERROR/FATAL/Unhandled日志为0。备份位于 `/opt/siyuan/backups/codex-20260727-codebase-slimming-phase-87/`。
- 严格47漂移审计通过：`55 changed + 46 remote-only`，生产树备份/临时遗留物数量和字节数均为0。

## 交接

- 阻塞：无。
- 发布状态：`已发布47`；API新镜像已运行，无迁移。
- 未验证项：47当前无真实转单候选，线上仅验证空结果、角色边界、响应等价和性能；非空候选的周期审核与字段裁剪由本地定向测试及未改原后处理链覆盖。
- 准确下一步：扫描 `getNavigationUnreadBadges` 或客服数据确认查询中的全量运单/审计加载，优先选择可用聚合、窄字段或数据库谓词消除真实成本且不改变水位线、权限或周期口径的单个切片。
