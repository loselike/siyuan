# 市场管理功能权限细分

## 本会话完成

- 将市场看板、待排货、已排货和本周排货数据拆分为可配置的 `market:*` 功能权限，并接入系统管理权限工作区。
- 业务员默认移除市场入口与排货写入权限；市场用户组默认使用市场权限集合。
- 排货、退回重排、删除待排货接口按新权限校验；排货费用与代理字段按权限从运单列表输出中裁剪。
- 前端市场页面按权限控制二级入口、行操作、费用页签、统计项、导出和列设置入口；报价管理不再接受 `routing:write` 作为替代授权。

## 验证

- `npm run typecheck -w @siyuan/web`
- `npm run typecheck -w @siyuan/api`
- `npm test -w @siyuan/web -- --run src/modules/routing/routing.test.tsx`
- `USE_PRISMA_REPOSITORY=false npm test -w @siyuan/api -- --run src/modules/app.orders.e2e.test.ts -t "deletes only waiting-sort routing|navigation unread badges"`
- `git diff --check`

## 已知边界

- 现有通用运单列表接口仍被多个模块复用；市场页面已按新权限隐藏入口与敏感字段，后续如需将“待排货/已排货/本周”各自的数据范围下沉到独立接口，应以模块专用查询参数或接口继续收口。
