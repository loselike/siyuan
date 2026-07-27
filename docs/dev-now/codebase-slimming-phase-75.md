# 代码瘦身治理第七十五阶段

- 状态：`completed`
- 会话标题：`Sunny｜代码瘦身治理｜75`
- 续接自：`docs/dev-now/codebase-slimming-phase-74.md`
- 上下文状态：`green`
- 输入来源：持续目标要求继续按声明—引用证据删除整簇退场代码
- 会话 slug：`codebase-slimming-phase-75`
- 分支：`codex/codebase-slimming-phase-1`
- worktree：`/Users/j1ng/Tools/sunny/.worktrees/codebase-slimming-phase-1`
- 认领时间：`2026-07-27 Asia/Shanghai`

## 输入摘要

- 目标：删除价格页在现行 `MarkupRouteEditor` 上线后已不可达的旧内嵌“渠道线路详情/渠道阶梯加价”编辑簇，并停止为该退场界面加载数据。
- 固定样本：代理加价规则的“查看线路”仍进入现行线路阶梯工作台；旧内嵌弹窗、批量线路加价和旧阶梯表单标记从源码与构建产物清零。
- 硬边界：不改价格、加价计算、API 定义、请求参数契约、RBAC、页面入口、现行线路编辑器、数据库、状态流转或审计。

## 修改

- `apps/web/src/modules/pricing/PricingPage.tsx`
- `docs/dev-now/codebase-slimming-phase-75.md`
- `.codex-state.md`

## 当前进度

- 声明—引用与状态流复扫确认旧 `markupChannelDetailOpen` 只能由同簇零调用函数置为 `true`；现行“查看线路”已由 `openMarkupChannelDetail` 直接打开 `MarkupRouteEditor`，旧内嵌编辑器整簇不可达。
- 删除旧渠道详情弹窗、旧渠道阶梯表单、批量线路加价、旧筛选/分页/请求序列状态、相关 helper 和兼容恢复分支；本地生产源码增加 8 行、删除 676 行，净减少 668 行和 33,010 bytes。
- 47 当前源码基线从 4,270 行 / 230,218 bytes 降至 3,600 行 / 197,175 bytes，净减少 670 行和 33,043 bytes。
- 价格规则工作台首次加载、跨窗口刷新和切回加价规则时，不再额外请求旧界面专用的 500 条 detail 规则；每条链路各减少一次重复 GET，现行规则列表与线路编辑器自行加载保持不变。
- 用户已明确后续扫描可包含财务模块；下一阶段仍只处理零引用、恒定状态或已被现行能力替代的退场代码，财务金额、权限、状态和审计继续作为禁止边界。

## 验证

- 本地与 47 候选 TypeScript 语法转译均为 0 错误，`git diff --check` 通过；目标旧符号清零，`MarkupRouteEditor`、`openMarkupChannelDetail`、`view=route-editor` 和“查看线路”标记保留。
- Web 定向整页用例 30 秒内未产出有效结果，已由安全 runner 停止且不记为通过；Web typecheck 仍被 `ReceivableAuditPage.tsx` 与 `appTestHarness.tsx` 的既有类型错误阻断，没有新增 `PricingPage.tsx` 错误。
- PricingPage 定向 ESLint 仍有 15 个既有告警/错误，删除过程中出现的未定义引用已清零；47 Web production build 已通过，作为最终 TypeScript 与生产打包门。
- 47 以当前远端源码为基线应用单文件白名单改动，只构建/重启 Web，无 API、共享契约、Prisma 或迁移变化；备份位于 `/opt/siyuan/backups/codex-20260727-codebase-slimming-phase-75/`。
- 47 源码旧标记与构建产物旧文案均为 0；现行“线路阶梯加价/查看线路/新增默认加价”构建标记保留于 2 个资产文件。
- Web 容器、公网页面、反向代理 API health 和最近 Web 错误日志均通过；漂移审计保持 `55 changed + 45 remote-only`。

## 交接

- 阻塞：无。
- 发布状态：`已发布 47`；仅构建和重启 Web，无迁移。
- 准确下一步：扫描财务与其他高密度页面的零引用声明和恒定 state，优先选择完整退场簇；财务候选须额外证明金额口径、RBAC、状态流转和审计链路未被触碰。
