# uiux-00-business-protection-baseline

- 状态：`completed`
- 输入来源：`无（当前会话明确请求）`
- 会话 slug：`uiux-00-business-protection-baseline`
- 分支：`codex/agent-master-data`
- worktree：`/Users/j1ng/Tools/sunny`
- 认领时间：`2026-07-10 17:24 Asia/Shanghai`

## 输入摘要

- 目标：建立 UI/UX 升级前的业务保护、保护文件和测试命令基线。
- 不做：不修改生产代码、接口、Shared、Prisma、权限、业务状态或发布。

## 允许修改

- `docs/uiux/business-protection-baseline.md`
- `docs/uiux/protected-files.md`
- `docs/uiux/test-command-baseline.md`
- `docs/uiux/progress.md`
- `docs/dev-now/uiux-00-business-protection-baseline.md`

## 当前进度

- 已完成业务与展示边界、受保护文件、高风险模块、测试命令和当前工作树风险记录。

## 验证

- `npm run typecheck -w @siyuan/web`：通过。
- `npm test -w @siyuan/web -- --run src/modules/shared/ui.test.ts src/modules/shared/ui-table.test.tsx`：通过，12 项。
- `npm run build -w @siyuan/web`：通过，保留既有大 chunk 警告。
- `npm run lint -w @siyuan/web`：失败，187 项既有问题；未修改 lint 或生产代码。
- `git diff --check`：通过。

## 交接

- 阻塞：无。
- 剩余风险：当前工作树存在大量其他会话未提交改动；后续 UI 卡必须以 `docs/uiux/` 基线为准，只改获授权的展示层文件。
- 接手要求：状态改为 `handed_off` 后，新的唯一写会话才能继续。
