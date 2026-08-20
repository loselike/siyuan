# 全局底层优化：可信基线与仓库代表切片

- 状态：`in_progress`
- 会话标题：`Sunny｜底层架构优化｜01`
- 续接自：无
- 上下文状态：`green`
- 已观察压缩：`0`
- 输入来源：`无（用户已批准分阶段目标）`
- 会话 slug：`architecture-baseline-warehouse-slice-20260819`
- 分支：`codex/architecture-baseline-20260819`
- worktree：`/Users/j1ng/Tools/sunny-architecture-baseline-20260819`
- 基线提交：`cbbd83ad5d63a68305674c6b302dec1d2f5b5b62`
- 认领时间：`2026-08-19 Asia/Shanghai`

## 输入摘要

- 目标：先把 47 当前白名单组合运行树恢复为唯一可追溯 Git 基线并清零 Shared/API/Web 类型错误，再迁移 `/api/warehouse/packages` 只读查询到独立 Warehouse Module，保持路由、响应、权限、数据范围和字段裁剪不变。
- 固定样本：47 当前一个真实在仓包裹；管理员允许读取，同一接口使用无仓库权限角色必须拒绝。
- 不做：本切片不改变业务状态、数据库结构、权限模型、财务口径、页面布局；不删除根工作树或其他 worktree 的任何文件；不迁移仓库之外的领域。

## 允许修改

- 基线恢复阶段：47 运行时清单包含的 `apps/api/**`、`apps/web/**`、`packages/shared/**`、根运行时构建文件，仅允许逐字节吸收远端已运行内容。
- 代表切片阶段：`apps/api/src/modules/app.module.ts`、现有仓库查询 Controller/Service/Repository port 及其定向测试；如契约确需拆分，仅修改仓库相关 Shared 子路径。
- `docs/release-manifests/47/**`
- `docs/dev-now/architecture-baseline-warehouse-slice-20260819.md`

## 47 基线事实

- 当前 release：`whitelist-f22a31bcc68bbdef8a478842`，`SOURCE_MODE=WHITELIST_CAS`，发布于 `2026-08-19T15:20:35+08:00`。
- 指纹：Web `f22a31bcc68bbdef8a478842e1cd72c618e413df5be480683ad242925ac060f8`；API `c4c04ab0cb69189e38788f1c0460c287aabe253601d6f9d221d5837c256469e0`；migration `8f2229f05edb997c56b4ab053ffe9849400a88e8553b5ad9b549cbf464faefe0`。
- 初始源码审计：本地 531、远端 539；458 相同、73 内容不同、8 远端独有；远端 22 个 AppleDouble 文件为非运行时历史垃圾，不吸收、不删除。
- 远端 Prisma migration 目录 173 个；API/Web/Shared 源文件合计 544 个。

## 成熟项目参考

- [Medusa](https://github.com/medusajs/medusa)：借鉴领域 Module、窄接口和跨模块可补偿 Workflow；MIT。Sunny 保持模块化单体，不复制电商领域模型或工作流代码。
- [Vendure](https://github.com/vendurehq/vendure)：借鉴 NestJS 模块边界、请求上下文和状态转换保护；GPLv3，仅阅读设计和测试方式，不复制受 GPL 约束实现。
- [react-admin](https://github.com/marmelab/react-admin)：借鉴 Data Provider、查询去重、缓存和 headless controller；MIT。Sunny 保留 AntD 与现有业务页面，不整体替换框架。

## 当前进度

- 已从最近可追溯发布提交建立独立分支和 worktree，根工作树 445 项内容未被修改或清理。
- 已采集 47 runtime manifest：`docs/release-manifests/47/20260819-080525-whitelist-f22a31bcc68bbdef8a478842/`。
- 已把 73 个生产差异文件与 8 个远端独有文件逐字节吸收到本分支；复核为本地 539、远端 539、539 全部一致、运行时漂移 0。
- 正在建立独立 Git 基线提交；随后以该提交为类型错误修复起点。

## 验证

- 已通过：`bash scripts/audit-47-source-drift.sh --summary --fail-on-drift`，539/539 一致、漂移 0。
- 待执行：`npm run typecheck`，Shared/API/Web 全部为 0。
- 待执行：`npm run governance:check` 与 `git diff --check`。
- 代表切片完成后：仓库查询 characterization、管理员允许路径、无权限拒绝路径、47 只读固定样本。

## 交接

- 阻塞：无。
- 剩余风险：47 是 81 文件白名单组合树，当前尚无唯一 Git commit；在逐字节吸收、类型清零和审查完成前禁止发布或开始业务结构迁移。
- 用户验收目标：以不改变现有业务行为的方式，获得干净可追溯基线，并让仓库在仓查询不再经过 God Controller/Repository。
- 效果证据：待补充。
- 安全证据：待补充。
- 未验证项：类型错误清单、固定在仓包裹与拒绝角色样本。
- 发布状态：`未发布；当前仅建立隔离基线`。
- 稳定附件：无。
- 准确下一步：提交 47 当前运行树基线，运行三端类型检查并逐项修复现存漂移。
- 建议新标题：`Sunny｜底层架构优化｜02`
- 建议新状态文件：`docs/dev-now/architecture-baseline-warehouse-slice-20260819-02.md`
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。
