# Warehouse complete tally modal slice

- 状态：`published_47`
- 分支：`codex/warehouse-complete-tally-modal-slice`
- worktree：`/private/tmp/sunny-warehouse-complete-tally-modal-slice`

## 用户结果

继续缩减仓库巨型页面，但“处理理货”的保留、合并、拆分、校验、提交、打印和状态流转保持不变。

## 固定验收样本

- 理货任务 `TL-9476` 含两个来源包裹。
- 合并模式仍可全选两个来源、填写理货后件数和备注并确认完成。
- 拆分模式仍只保留最后一个来源选择，并继续填写拆分件数组合。
- 提交期间继续禁用取消、关闭和遮罩关闭。

## 范围

- 仅把现有“处理理货”受控界面抽到 `WarehouseCompleteTallyModal`。
- 页面继续持有任务、草稿、错误、提交锁和所有 API/打印/刷新逻辑。
- 不修改 API、Repository、Shared、Prisma、权限、生产数据或视觉文案。

## 已完成

- 把原“处理理货”弹窗抽为受控组件 `WarehouseCompleteTallyModal`。
- 页面继续持有任务、草稿、提交锁以及完成理货、打印和刷新逻辑。
- `WarehousePage.tsx` 从 4571 行缩减为 4509 行，本切片净减少 62 行。

## 本地证据

- 固定样本组件测试：3/3 通过，覆盖合并全选、拆分仅保留最后来源、草稿委托、确认/取消和提交锁。
- `npm run typecheck -w @siyuan/web`：通过。
- `npm run architecture:check:fast`：通过，414 条路由契约。
- `git diff --check`：通过。

## 47 证据

- 发布 ID：`whitelist-6a76124d627a1fa28371711c`，时间：`2026-08-06T09:19:01+08:00`。
- 线上源码 checksum 与本地候选一致：
  - `WarehousePage.tsx`：`76f44484132a31b6e7cfcfa5b833ffa4e71645e8cd2fd9b238cc7a7cb9f8581f`
  - `WarehouseCompleteTallyModal.tsx`：`2d9184eff925b7076ba703d3c028fda847ba8577c5229596757f1eff7e729a6c`
- Web 生产构建成功，容器运行；内网首页、内网 API health、公网页面和公网 API health 均为 200。
- 最近 10 分钟 Web 日志未发现 error/fatal/panic/emerg；发布锁 free，恢复标记 clear。

## 人工检查点

- 47 的仓库管理中打开未完成理货任务，进入“处理理货”，核对保留、合并、拆分三个模式的布局和交互与发布前一致。
