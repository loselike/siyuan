# Sunny 架构治理

本目录保存 Sunny 架构治理的可复查证据和阶段性结论。领域术语仍以根目录 `CONTEXT-MAP.md` 与 `docs/contexts/*/CONTEXT.md` 为准；本目录不创建第二套业务术语。

## 阶段 0 产物

- [`phase-0-current-state.md`](./phase-0-current-state.md)：当前架构、调用链、质量门和已知限制。
- [`phase-0-module-map.md`](./phase-0-module-map.md)：当前模块地图、候选领域边界及依赖方向。
- [`phase-0-debt-register.md`](./phase-0-debt-register.md)：按风险、耦合和收益排序的治理债务。
- [`phase-1-gate-a.md`](./phase-1-gate-a.md)：路由鉴权契约、增量债务预算和 lint no-new-debt 门。
- [`module-slice-template.md`](./module-slice-template.md)：从 Finance Catalog 提炼的渐进式垂直切片模板及已知差距。
- [`baseline/metrics.md`](./baseline/metrics.md)：机器扫描规模与热点文件。
- [`baseline/dependency-findings.md`](./baseline/dependency-findings.md)：静态依赖图、循环、孤儿候选、完全重复文件与双 Repository 方法差异。
- [`baseline/api-route-permission-matrix.md`](./baseline/api-route-permission-matrix.md)：完整 API 路由与权限装饰器元数据。
- [`baseline/prisma-model-catalog.md`](./baseline/prisma-model-catalog.md)：完整 Prisma 模型及模型关系目录。
- [`baseline/web-api-client-catalog.md`](./baseline/web-api-client-catalog.md)：完整 Web `ApiClient` 方法目录。
- [`baseline/frontend-entry-catalog.md`](./baseline/frontend-entry-catalog.md)：登录/客户分支、15 个 StaffMenuKey、10 个员工主菜单、路由别名和角色可见性。

## 快照边界

- 扫描完成时间：2026-08-01 13:34，Asia/Shanghai。
- 分支：`codex/repository-baseline-governance`。
- 基线提交：`3af988a`。
- 任务开始时工作树：93 项 tracked changes、363 项 untracked，共 456 项；报告描述的是该脏工作树上的阶段 0 快照，不是干净 Git 提交，也不等同于 47 已发布代码。
- 本阶段未读取或修改 47，未执行数据库写入、迁移、业务接口或浏览器操作。
- `Auth/RBAC`、财务、Prisma migrations、上传和外部集成只建立代码地图；是否存在真实越权、财务口径或线上迁移问题均未验证。

## 重新扫描

扫描器只读取源码并输出 Markdown：

```bash
node scripts/architecture-baseline.mjs summary
node scripts/architecture-baseline.mjs api-routes
node scripts/architecture-baseline.mjs prisma-models
node scripts/architecture-baseline.mjs web-client
node scripts/architecture-baseline.mjs dependencies
node scripts/architecture-baseline.mjs json
```

生成结果必须人工复核。候选领域使用名称启发式分类，不能替代领域所有权确认。
