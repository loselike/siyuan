# 报价查价仓库编码组合规则

- 状态：`completed`
- 输入来源：`2026-07-14-报价查价-仓库编码组合规则全局匹配`
- 会话 slug：`pricing-warehouse-code-combination-rules`
- worktree：`/Users/j1ng/Tools/sunny`

## 允许范围

- `packages/shared/src/index.ts`
- `apps/api/src/modules/pricing-excel.ts`
- `apps/api/src/modules/in-memory.repository.ts`
- `apps/api/src/modules/prisma.repository.ts`
- `apps/web/src/modules/pricing/excel.ts`
- `apps/api/src/modules/app.pricing.e2e.test.ts`
- `docs/dev-now/pricing-warehouse-code-combination-rules.md`

## 不做

- 不改金额、加价、推荐排序、权限裁剪或发布 47。

## 验证

- 通过：`USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.pricing.e2e.test.ts -t "加拿大|仓库|YYZ|亚马逊|重量段"`
- 通过：`npm run build -w @siyuan/shared`、`npm run typecheck -w @siyuan/api`、`npm run typecheck -w @siyuan/web`、`git diff --check`。
