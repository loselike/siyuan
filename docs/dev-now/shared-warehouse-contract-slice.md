# Shared warehouse contract slice

- 状态：`in_progress`
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

## 待完成

- 精确白名单发布 47 Shared，按影响范围重建 Web 与 API，并核对源码 checksum、容器、health 和错误日志。
