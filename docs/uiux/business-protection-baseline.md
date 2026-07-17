# UI/UX 业务保护基线

> 任务卡：`2026-07-10-uiux-00-business-protection-baseline.md`
> 建立日期：2026-07-10
> 目的：UI/UX 渐进式升级只触及展示层；任何可能改变数据、权限、状态或请求行为的改动均不在授权范围内。

## 1. 技术与 UI 边界

| 项目 | 当前事实 | UI/UX 约束 |
| --- | --- | --- |
| 前端 | React 19 + TypeScript + Vite | 保持现有技术栈与构建方式 |
| 组件库 | Ant Design 5 | 仅使用现有 Ant Design 与 `lucide-react`；不引入第二套组件库 |
| 样式 | 全局 `apps/web/src/styles.css`，局部 CSS，以及 Ant Design Theme Token | 可调整 Token、CSS、展示类名和纯视觉组件属性 |
| UI 壳层 | `apps/web/src/App.tsx` + `apps/web/src/modules/appShell/config.tsx` | 侧栏、顶栏、主内容区为展示升级对象；菜单选择、数据刷新、权限计算受保护 |
| 路由形态 | 员工端由 `App.tsx` 的 `activeMenuKey/currentMenuKey` 切换；未发现 React Router 路由表 | 不新增、删除或改写 URL/菜单键/菜单跳转；客户角色进入 `CustomerPortal` |
| API 调用层 | `apps/web/src/apiClient.ts`；`API_BASE` 下的统一 `request` 和上传 `fetch` | API 地址、方法、body、query、鉴权头、错误处理和触发时机全部受保护 |
| 后端 | NestJS；全局前缀 `/api` | 仅作为 UI 回归比对对象，不修改 |
| 数据 | Prisma schema/migrations + Repository | 不修改 schema、migration、Repository、种子或持久化逻辑 |

## 2. 权限与入口保护边界

- 前端菜单可见性：`apps/web/src/App.tsx` 调用 `getVisibleStaffMenuKeysByPermissions`；员工菜单配置在 `apps/web/src/modules/appShell/config.tsx`。
- 前端页面级权限：`App.tsx` 将 `session.permissions` 和细粒度布尔值传入领域页面；该传参、条件渲染和数据刷新均不可改。
- 后端鉴权：`apps/api/src/modules/rbac.ts` 定义角色、权限、数据范围说明；`apps/api/src/modules/rbac.guard.ts` 执行 JWT 与权限校验。
- 权限、角色关系、菜单键、数据范围、字段裁剪和无权限结果均是回归基线，不得以 UI 优化名义修改。

## 3. Shared 与业务计算保护边界

`packages/shared/src/index.ts` 的业务类型、状态、计算与规则均禁止修改。重点函数包括：

| 类别 | 受保护函数/常量 |
| --- | --- |
| 状态 | `shipmentStatusLabels`、`allowedTransitions`、`canTransitionShipment` |
| 报价与计费 | `calculateChargeableWeight`、`calculateQuote`、`quoteWithPricingRules`、`createFeeLinesFromQuote` |
| 财务 | `summarizeStatement`、`summarizePaymentSettlement` 及金额、币种、费率相关类型 |
| 业务判断 | `createShipmentInsights`、`validateShipmentImportRows`、履约动作和状态汇总函数 |
| 领域契约 | 所有 `Shipment*`、`Finance*`、`Price*`、`Permission*`、`Role*` 输入输出类型 |

UI 只允许使用现有的返回值做排版、分组、文案换行、密度和既有状态的视觉表达；不得新增前端转换、排序、过滤、推导、默认值或业务颜色判断。

## 4. 展示逻辑与业务逻辑分界

### 可在后续 UI 卡中按范围修改

- JSX/TSX 中不改变事件绑定、数据来源和条件分支的布局结构。
- 纯展示组件、CSS class、CSS/Less/Sass/CSS Module、Theme Token、纯视觉 Ant Design 属性。
- 已有加载、空态、错误态、无权限态的容器、文案排版和图标布局。
- 页面、筛选栏、表格、表单、弹窗、抽屉的响应式布局；仅在原字段、原操作、原回调都保留时允许。

### 受保护，不得修改

- 任何 `useEffect`、`useCallback`、事件处理器、表单 `onFinish`、`onChange`、请求调用、状态写入与本地缓存逻辑。
- `ApiClient` 调用、API 参数构造、上传/下载/导入/导出、表单校验规则、默认值、数据映射和异常处理。
- 权限条件、角色判断、状态值/状态流转、金额/币种/成本/利润/费率计算、审计/操作日志。

页面文件可能混合展示与业务代码，**不因文件属于 Web 页面就默认可全文件编辑**；每张任务卡必须在修改前列出允许触及的 JSX 区域，并把业务回调、数据转换和权限条件作为只读区域。

## 5. 高风险模块

| 模块 | 风险原因 | UI 保护要求 |
| --- | --- | --- |
| 财务 | 金额、币种、应收应付、付款、核销、凭证、敏感字段 | 不使用红绿表达金额或价值；不改审核/付款/核销回调、字段裁剪和上传流程 |
| 报价 | 计费重、价格匹配、加价、成本/利润裁剪、导入 | 不改查询参数、结果排序、解析、加价与颜色业务结论 |
| 订单/仓库/市场 | 状态流转、排货、出库、批量操作、审计 | 入口、行操作、批量操作、确认弹窗与回调全部保留 |
| 客服/轨迹/问题件 | 轨迹节点、问题件状态、异常处理 | 不创造系统不存在的颜色优先级或操作状态 |
| 基础资料/系统管理 | 角色、权限、渠道、费率、汇率 | 不改字段、校验、角色关系、数据范围或管理入口 |
| 登录/个人中心 | 验证码、会话、密码、JWT | 不改认证、会话、错误处理或密码规则 |

## 6. UI 色彩与排版基线

- 颜色仅表达导航、层级、既有状态、风险和操作反馈；不得表达收入、成本、金额正负、报价优劣、渠道优先级、客户等级或系统未定义的问题件优先级。
- Token：`#102A43` shell/一级文本，`#2563EB` 主操作，`#0F766E` 既有正常推进，`#C77A16` 待处理风险，`#C2413B` 失败/删除/不可逆操作，`#F3F6FA` 页面背景。
- 字号：页面标题 20px/600；模块标题 16px/600；表格标题 14px/500；正文 14px/400；辅助文字 12px/400；重点数值 16–20px/500–600。
- 间距：页面 24px（1366px 为 16px），模块 16px，容器 16–20px，控件 8–12px，表单区块 20–24px。
- 控件：高度仅 32px 或 36px；普通圆角 6px，内容容器 8px；禁止渐变、玻璃拟态、强阴影、大圆角、营销式布局和过度动画。

## 7. 本卡修改前保护记录

- 当前任务为文档基线卡，无页面、路由或生产代码修改；页面截图、按钮/行操作/批量操作/弹窗/抽屉计数均为“不适用”。
- 后续每张 UI 卡开始前必须补齐对应页面截图、路由/菜单键、核心操作、接口调用、操作与弹窗数量，并在完成后逐项对比。
- 建立本卡时工作区已存在大量未提交的 API、Web、Shared、Prisma、部署和文档改动；它们均不属于本卡，不得覆盖、格式化、暂存或顺手修改。
