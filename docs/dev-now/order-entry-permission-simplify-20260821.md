# 录单权限收敛

- 状态：`in_progress`
- 会话标题：`Sunny｜录单权限收敛｜01`
- 续接自：无
- 上下文状态：`green`
- 已观察压缩：`1`
- 输入来源：`无（当前会话明确请求）`
- 会话 slug：`order-entry-permission-simplify-20260821`
- 分支：`codex/order-entry-permission-simplify-20260821`
- worktree：`/private/tmp/sunny-order-entry-permission-simplify-20260821-RnEaFU`
- 认领时间：`2026-08-21 12:00 Asia/Shanghai`

## 输入摘要

- 目标：角色权限分配中的“录单”只保留编辑、业务成本、应付费用三项正向权限，不再展示或保存单票费用查看、增删改、锁定、解锁、利润权限。
- 不做：不删除兼容 API 权限代码，不改变财务专属权限、录单业务表单、费用计算和线上业务数据。

## 允许修改

- `apps/api/src/modules/rbac.ts`
- `apps/api/src/modules/rbac.test.ts`
- `apps/web/src/modules/settings/SettingsPage.tsx`
- `apps/web/src/modules/settings/rolePermissionCatalog.ts`
- `apps/web/src/modules/settings/settings.test.tsx`
- `docs/dev-now/order-entry-permission-simplify-20260821.md`

## 当前进度

- 已将七个旧 `business:order-fee:*` 权限改为不可分配兼容权限，并从业务默认角色及非管理员角色标准化结果中移除。
- 已移除角色权限页“单票费用授权”区，仅保留三项录单授权。

## 验证

- `git diff --check`：通过。
- API 定向测试：`rbac.test.ts` 16 项通过。
- Web 定向测试：角色权限固定样本 1 项通过。
- API/Web 类型检查：通过。

## 交接

- 阻塞：无
- 剩余风险：待完成 Git 同源发布与 47 线上权限目录、容器和日志验证。
- 用户验收目标：打开“系统管理 → 角色权限分配 → 业务管理 → 录单”时只看到编辑、业务成本、应付费用三项。
- 效果证据：Web 组件测试确认三项复选框存在，“单票费用授权”与其复选框不存在。
- 安全证据：API 测试确认旧七项不再可分配、默认业务角色不再持有、旧存量授权会被标准化清理。
- 未验证项：47 线上静态产物与 API 权限目录。
- 发布状态：`未发布`
- 稳定附件：用户截图 `/var/folders/gn/0rym6f8s7j7335s75535fw4h0000gn/T/codex-clipboard-833d486d-f310-4c02-9002-fe532c3361d2.png`
- 准确下一步：提交分支、合并 main，并按 Git 可追溯流程仅发布 API 与 Web 到 47。
