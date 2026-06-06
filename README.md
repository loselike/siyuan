# 思远 AI 物流系统

一个面向跨境物流公司的 TMS/OMS MVP。项目学习易抵达/思远系统的业务闭环，但不复刻旧界面；重点是用更现代的运营工作台、状态驱动流程和 AI 辅助能力提升效率。

## 当前已实现

- Monorepo：`apps/web`、`packages/shared`
- 共享领域逻辑：运单状态、业务类型、计费重、报价、AI 风险洞察
- Web 工作台：业务类型切换、状态池、运单表格、批量操作条、AI 优先处理队列
- 测试：领域逻辑测试、Web 核心交互测试

## 开发命令

```bash
npm install
npm run dev
npm test
npm run build
```

默认 Web 地址：`http://localhost:5173`

## 后续路线

1. 接入 `apps/api`：NestJS、Prisma、PostgreSQL、Redis、JWT、RBAC。
2. 将当前静态运单样例替换为 API 数据。
3. 实现运单导入、预报、收货、打单、排货、转单、轨迹、问题件。
4. 接入报价规则、应收应付、对账、收付款、核销。
5. 增加 AI 能力：智能录单、异常总结、报价解释、客户回复生成。
