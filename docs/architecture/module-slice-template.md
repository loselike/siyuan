# Sunny 模块垂直切片模板

## 1. 模板定位

此模板服务 Sunny 模块化单体的渐进治理，不要求每个 CRUD 套用完整 DDD。只有存在状态、不变量、计算或跨资源事务时才建立独立 domain 层；简单资料目录保持最短可测试链路。

推荐依赖方向：

```text
presentation/controller
        ↓
application/service
        ↓
port/repository contract
        ↑
infrastructure adapters (Prisma / memory / file / external API)
```

Shared 只承载跨进程契约与真正跨端纯规则，不承载 Nest、Prisma、React 或页面状态。

## 2. 最小文件职责

| 层 | 必须负责 | 禁止负责 |
| --- | --- | --- |
| Controller | HTTP 映射、鉴权 metadata、输入输出映射 | Prisma 查询、事务、业务状态判断 |
| Application Service | 用例编排、不变量、事务意图、审计意图 | HTTP Response、React 展示、环境变量读取 |
| Repository Port | 领域所需最小读写能力 | 暴露 Prisma client 或跨域总仓储 |
| Prisma Adapter | 查询、事务、锁、持久化映射 | 决定角色菜单或前端行为 |
| Memory Adapter | 与 Prisma adapter 相同的可观察契约 | 通过总 Repository 偷渡不同语义 |
| Domain/Pure Types | 状态、规则、纯映射 | Nest exception、Prisma、网络和文件 I/O |

## 3. 每个迁移切片的完成契约

1. 固定一个真实样本和最终可观察结果。
2. Route contract 明确 `auth` 或权限键；公开路由必须单独分类。
3. Controller 不直接依赖 Prisma/总 Repository。
4. Service 只依赖领域 port 和纯类型。
5. Prisma/Memory 使用同一 adapter contract tests，覆盖成功、缺失、重复、拒绝和异常分支。
6. 明确事务边界、幂等性、审计前后值和敏感字段裁剪。
7. Web 通过领域 client facade 调用，不给根 `ApiClient` 增加新业务方法。
8. Shared 使用领域 subpath；不新增根桶依赖。
9. `architecture:check`、最小效果测试和目标 typecheck 通过。
10. 运行时代码按白名单发布 47，并取得 API/容器/持久化或代码指纹证据。

## 4. Finance Catalog 参考切片

当前参考文件：

- `finance-catalog.controller.ts`：presentation。
- `finance-catalog.service.ts`：application。
- `FinanceCatalogRepository`：port。
- `PrismaFinanceCatalogRepository` / `InMemoryFinanceCatalogRepository`：adapters。
- `finance-catalog.types.ts`：输入规范化与映射。

[`config/architecture/module-boundaries.json`](../../config/architecture/module-boundaries.json) 已把关键依赖方向变成机器门：Controller 必须依赖 Service 且不得直接依赖 Prisma/Repository；Service 必须依赖 port 且不得引用 Prisma/Controller；adapter 不得反向引用 Service/Controller。

它只是“当前最接近模板的参考”，不是最终完成态。已知差距：

- port 与两个 adapter 仍在同一文件。
- InMemory adapter 为写审计仍依赖总 `PrismaRepository`。
- `finance-catalog.types.ts` 仍用 Nest `BadRequestException`，已作为显式历史债务记录。
- `DataController` 为其他用例直接依赖 `FinanceCatalogService`，说明跨域查询 port 尚未定义。
- Web 财务资料页面同时被 Finance 与 Master Data 组合，owner 仍需领域确认。

因此下一步不是复制目录，而是先保留这条短链路的优点，再在首个旧链路迁移中证明 port、双 adapter contract、前端领域 client 和 Shared subpath 能共同工作。

## 5. 首个旧链路建议

问题件/常用标签仍是优先候选，但开始前必须确认：

- Problem Ticket 的领域 owner。
- 客服、运营、业务、客户账号的读写范围。
- Shipment 状态由谁拥有，问题件只能提交事实还是可以直接改主状态。
- 当前真实操作入口是 Customer Service/Operations，不能只验收低频展示页。

这些决策确认后，按“一个 endpoint + 一个用例 + 两个 adapter + 一个前端入口”形成第一条垂直切片，不批量搬迁整个 Customer Service。
