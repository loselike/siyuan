# 录单权限收敛

- 状态：`completed`
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
- 主干 CI `32449432133`：通过。
- 47 发布：`git-7444595ec013_web-952795901dfb_api-72413c95ede7`，运行提交 `7444595ec013a274794adcc3f75ba5f94fe5a0ec`，仅重启 Web/API，未运行迁移或 seed。
- 47 权限目录：管理员只读请求 200；“业务管理 / 录单”可分配项精确为 `edit`、`business-cost`、`payable-fee`；旧七项可分配数量与角色标准化结果均为 0；普通业务/仓库岗位读取角色权限矩阵返回 403。
- 47 页面产物：存在“录单授权”，不存在“单票费用授权”；线上源码不存在旧授权区和旧控制器，七个兼容权限均为 `assignable: false`。
- 47 运行状态：Web/API/Postgres/Redis 均 running，公网首页 200、`/api/health` 正常，镜像与 release state 一致，provenance traceable，最近 API/Web 日志未发现运行错误，发布锁 free、recovery clear。

## 交接

- 阻塞：无
- 剩余风险：仅剩浏览器中的最终视觉排列由用户在 47 人工确认；兼容权限代码仍保留供管理员/历史运行链路使用，但不再向非管理员分配。
- 用户验收目标：打开“系统管理 → 角色权限分配 → 业务管理 → 录单”时只看到编辑、业务成本、应付费用三项。
- 效果证据：Web 组件测试确认三项复选框存在，“单票费用授权”与其复选框不存在。
- 安全证据：API 测试确认旧七项不再可分配、默认业务角色不再持有、旧存量授权会被标准化清理。
- 未验证项：未做浏览器截图验收（按 47 非浏览器验收规则交由用户人工检查）。
- 发布状态：`已发布并验证`
- 稳定附件：用户截图 `/var/folders/gn/0rym6f8s7j7335s75535fw4h0000gn/T/codex-clipboard-833d486d-f310-4c02-9002-fe532c3361d2.png`
- 准确下一步：用户在 `/app/settings/role-permissions` 检查“业务管理 → 录单”仅显示编辑、业务成本、应付费用三项。
