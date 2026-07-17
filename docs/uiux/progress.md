# UI/UX 渐进式升级进度

> 仅追加当前任务卡结果；不得覆盖其他会话记录。

## 2026-07-10 — 卡 00：业务与 UI 保护基线

- 状态：完成。
- 完成范围：建立技术栈、组件库、菜单/权限/API 边界、Shared/Prisma 边界、展示/业务分界、高风险模块、保护文件和测试命令基线。
- 修改文件：
  - `docs/uiux/business-protection-baseline.md`
  - `docs/uiux/protected-files.md`
  - `docs/uiux/test-command-baseline.md`
  - `docs/uiux/progress.md`
- 生产代码：未修改。
- 截图：不适用；本卡无页面、路由或展示层改动。
- 验证：
  - `npm run typecheck -w @siyuan/web`：通过。
  - `npm test -w @siyuan/web -- --run src/modules/shared/ui.test.ts src/modules/shared/ui-table.test.tsx`：通过，2 个文件、12 项断言通过；仅有 Ant Design 5 / React 19 兼容性既有警告。
  - `npm run build -w @siyuan/web`：通过；保留既有 `antd-vendor` 大 chunk 警告。
  - `npm run lint -w @siyuan/web`：未通过，187 项既有 ESLint 问题，集中于未使用导入及浏览器全局变量规则；本卡未修改任何生产代码或 lint 配置。
  - `git diff --check`：通过。
- 风险：工作区已有大量其他会话的未提交 API、Web、Shared、Prisma 与部署改动；本卡未触碰、未格式化、未暂存它们。
- 下一张建议任务卡：卡 01（全局 Theme Token、壳层和共享展示组件），实施前必须按本基线完成页面与操作保护盘点。
