# Warehouse complete tally modal slice

- 状态：`in_progress`
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

## 待完成

- 精确白名单发布 47 Web 并核对源码 checksum、容器、health 和错误日志。
