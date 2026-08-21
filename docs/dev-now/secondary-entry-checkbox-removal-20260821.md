# 二级入口勾选移除

- 状态：`in_progress`
- 会话标题：`Sunny｜二级入口勾选移除｜01`
- 会话 slug：`secondary-entry-checkbox-removal-20260821`
- 分支：`codex/secondary-permission-checkbox-20260821`
- worktree：`/private/tmp/sunny-secondary-permission-checkbox-20260821-x74Gfr`
- 认领时间：`2026-08-21 Asia/Shanghai`

## 目标

- 角色权限分配中所有一级模块的二级入口卡片只负责选择配置页，统一按“草稿箱”模式，不再显示独立入口复选框。
- 右侧三级功能权限及其依赖、保存接口、RBAC 权限码和已有角色授权保持不变。

## 固定验收

- 依次切换运营工作台、报价查价、业务管理、仓库管理、市场管理、客服管理、物流轨迹管理、财务管理、杂费、基础资料库、系统管理；所有二级入口卡片均不存在“授权进入…”复选框。
- 点击任一二级入口仍能打开右侧功能授权，三级权限复选框正常保留。

## 允许修改

- `apps/web/src/modules/settings/SettingsPage.tsx`
- `apps/web/src/modules/settings/rolePermissionPresentation.ts`
- `apps/web/src/modules/settings/settings.test.tsx`
- `docs/dev-now/secondary-entry-checkbox-removal-20260821.md`

## 发布边界

- Web-only；不修改 API、Shared、数据库、权限码、业务数据，不运行 migration 或 seed。
