# UI/UX 受保护文件与允许修改范围

> 默认规则：未被当前任务卡明确列为“允许修改”的文件，一律视为受保护。允许修改文件也只允许触及展示层区域。

## 1. 后续 UI 卡的默认允许范围

| 路径 | 允许范围 | 明确禁止 |
| --- | --- | --- |
| `apps/web/src/styles.css` | Token、布局、排版、颜色、响应式、状态容器视觉 | 改变 DOM 数据来源、请求、权限或业务含义 |
| `apps/web/src/modules/**/**.css` | 当前模块的局部样式 | 跨模块样式重置、全量 CSS 替换 |
| `apps/web/src/modules/appShell/config.tsx` | 仅 `appTheme` 的展示 Token 和 Ant Design 视觉 Token | 菜单项、状态列表、字段配置、默认值、业务常量 |
| `apps/web/src/modules/shared/ui.tsx` | 仅明确标为纯展示的页面壳、标题、空态、视觉 class/属性 | `ManagedTable` 选择、分页、列设置、localStorage、回调和数据处理逻辑 |
| `apps/web/src/modules/*/*Page.tsx` | 当前任务卡指定页面的 JSX 布局、className、纯展示属性、响应式包装 | handler、effect、form rule、callback、请求、权限、数据映射与条件业务分支 |
| `apps/web/src/modules/finance/useFinanceColumnSettings.css` | 局部视觉样式 | 列设置 Hook 或本地存储逻辑 |

## 2. 禁止修改的文件与目录

| 路径 | 保护原因 |
| --- | --- |
| `apps/api/**` | Controller、Service、Repository、鉴权、审计和业务规则 |
| `apps/api/prisma/**` | 数据库结构、迁移、种子和 Prisma 边界 |
| `packages/shared/**` | Shared 业务类型、状态、计算、领域规则 |
| `apps/web/src/apiClient.ts` | API 地址、方法、参数、鉴权、异常处理与上传调用 |
| `apps/web/src/main.tsx` | 应用启动与全局挂载 |
| `apps/web/src/App.tsx` | 默认保护：菜单选择、路由分支、登录会话、数据刷新、权限传递、业务弹窗回调；仅经单独任务卡可改纯壳层 JSX |
| `apps/web/src/modules/appShell/utils.ts` | 菜单可见性、角色展示、履约动作等逻辑 |
| `apps/web/src/modules/shared/excel.ts`、`apps/web/src/modules/tracking/bulkImport.ts` | 导入/导出、文件解析和数据转换 |
| `apps/web/src/modules/testSupport/**` | 测试桩；不得用 Mock 替代真实接口行为 |
| `apps/web/src/warehouseScanTestData.ts`、`apps/web/src/data.ts` | 领域样本与测试数据 |
| `scripts/**`、`deploy/**`、`.env*`、Docker/发布文件 | 发布、运行环境和密钥边界 |
| `package.json`、`package-lock.json`、各 workspace `package.json` | 依赖、脚本和技术栈边界 |

## 3. 测试文件保护

- 不删除、跳过、弱化或改写既有测试以适配 UI 改动。
- 允许按当前任务卡新增视觉结构、无障碍或展示断言；不得修改测试桩来掩盖真实 API、权限、状态或请求行为。
- 所有既有模块测试均是回归基线。

## 4. 修改停止条件

遇到以下任一情况立即停止并单独请求授权：

1. 需要调整接口地址、方法、参数、响应字段或请求时机；
2. 需要更改数据来源、前端转换、缓存、表单校验、默认值或提交结果；
3. 需要修改 Shared 类型、Prisma、权限、数据范围、状态、金额、币种、报价或审计；
4. 需要删除/合并既有入口、按钮、行操作、批量操作、弹窗、抽屉、Tab、上传、下载、导入、导出或预览；
5. 需要发布、部署、改动依赖或引入第二套 UI 组件库。
