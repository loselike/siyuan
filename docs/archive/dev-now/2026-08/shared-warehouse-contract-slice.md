# Shared warehouse contract slice

- 状态：`published_47`
- 分支：`codex/shared-warehouse-contract-slice`
- worktree：`/private/tmp/sunny-shared-warehouse-contract-slice`

## 用户结果

开始实质拆分 Shared 巨型入口，同时保持所有现有 `@siyuan/shared` 仓库类型、函数和调用方完全兼容。

## 固定验收样本

- 调用方继续只从 `@siyuan/shared` 导入仓库契约，不要求批量改 import。
- `94760803LH` 仍判定为首次理货，`94760803LH02` 仍判定为二次理货。
- 待理货、理货中、已理货、二次理货四种生命周期结果保持不变。

## 范围

- 将完整仓库契约块从 `packages/shared/src/index.ts` 搬到 `packages/shared/src/warehouse.ts`。
- 根入口仅通过 `export * from './warehouse.js'` 保持原公共 API。
- 不修改字段、联合类型、函数实现、API、Repository、Prisma、权限、生产数据或前端交互。

## 已完成

- 将 599 行完整仓库契约搬到 `packages/shared/src/warehouse.ts`。
- 根入口保留原公共导出；现有 `@siyuan/shared` 调用方无需改 import。
- `packages/shared/src/index.ts` 从 6455 行缩减到 5858 行。

## 本地证据

- 搬迁前原始仓库契约块与新文件 SHA-256 完全一致：`f63f0791c1713b42ac918342d2a80c45857369b3d33ead9f03a1cb70117d1cc0`。
- Shared 仓库契约边界定向测试：2/2 通过，覆盖根入口重导出及四种理货生命周期。
- Shared、API、Web 完整类型检查：通过。
- `npm run architecture:check:fast`：通过，414 条路由契约。
- `git diff --check`：通过。

## 47 证据

- 发布 ID：`whitelist-a5c442c999a1885f996b21d7`，时间：`2026-08-06T09:46:24+08:00`。
- 线上源码 checksum 与本地候选一致：
  - `packages/shared/src/index.ts`：`e57276374bbee67045921924dd6da657715d6b8af7510603ba5facf6aa68a9d5`
  - `packages/shared/src/warehouse.ts`：`f63f0791c1713b42ac918342d2a80c45857369b3d33ead9f03a1cb70117d1cc0`
- Web、API 生产构建成功并正常运行；内网页面/API health、公网页面/API health 均为 200。
- Web/API 最近 10 分钟日志未发现 ERROR/FATAL/PANIC/EMERG；发布锁 free，恢复标记 clear。

## 人工检查点

- 本切片不改变界面；仓库管理相关页面只需确认正常加载，原理货生命周期标签与操作入口保持不变。
