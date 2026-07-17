# UI/UX 验证命令基线

> 原则：UI/UX 卡不得删除、跳过或弱化测试。每张卡至少运行当前模块测试、Web 类型检查、Web ESLint、Web 构建；影响共享 UI 时扩大到受影响模块。

## 1. 必跑静态检查

```bash
npm run typecheck -w @siyuan/web
npm run lint -w @siyuan/web
npm run build -w @siyuan/web
git diff --check
```

## 2. 当前模块最小测试

| 模块 | 命令 |
| --- | --- |
| 运营工作台 | `npm run test:web:workspace` |
| 业务/订单 | `npm run test:web:orders` |
| 仓库 | `npm run test:web:warehouse` |
| 市场/排货 | `npm run test:web:routing` |
| 报价查价 | `npm run test:web:pricing` |
| 客服 | `npm test -w @siyuan/web -- --run src/modules/customerService` |
| 物流轨迹 | `npm run test:web:tracking` |
| 问题件 | `npm run test:web:problemTickets` |
| 财务 | `npm run test:web:finance` |
| 基础资料 | `npm test -w @siyuan/web -- --run src/modules/masterData` |
| 系统管理 | `npm run test:web:settings` |
| 报表 | `npm run test:web:reports` |
| 共享 UI/表格 | `npm test -w @siyuan/web -- --run src/modules/shared` |

## 3. 共享与全量检查

```bash
# 共享 UI、App 壳层或多个模块受影响时
npm run test:web
npm run typecheck
npm run lint
npm run build

# 仅在需要验证全仓基线时使用；不作为普通 UI 卡的默认必跑项
npm test
```

## 4. 浏览器验收基线

每张 UI 卡完成后使用真实页面在 1920px、1440px、1366px、1280px 和一个更窄宽度验收：默认、加载、空、错误、无权限、筛选、表格横滚、行操作、批量勾选、弹窗、抽屉、表单报错、长文本/单号、大金额和多状态标签。

本卡是文档基线卡，无模块页面改动；浏览器截图不适用。后续卡必须把截图绝对路径写入 `docs/uiux/progress.md`。
