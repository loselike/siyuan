# 财务审核列设置统一到 ManagedTable

## 本轮范围

- 应收审核、业务成本审核、市场应付审核移除卡片工具栏中的自定义列设置入口。
- 统一复用 `ManagedTable` 的表头右侧列设置入口，并保留原 localStorage key 的旧配置兼容读取。

## 边界

- 不改财务数据、审核、权限、筛选、批量操作或接口。
- 不发布 47，不提交 Git。

## 验证

- 通过：`npm test -w @siyuan/web -- --run src/modules/shared/ui-table.test.tsx`。
- 通过：财务应收审核与市场应付审核定向流程测试。
- 通过：`npm run typecheck -w @siyuan/web`、`git diff --check`。
