# 变更路径到最小验证

`npm run validation:select -- <changed-path...>` 根据 [`config/validation/path-test-map.json`](../config/validation/path-test-map.json) 输出建议，不自动执行命令。

默认原则：

- 每个独立业务切片只选择一条最接近用户效果的定向测试。
- 再选择一条能阻止明显回归的安全门；跨 Shared、权限或治理边界时才扩大。
- Prisma 路径直接标记 `MODEL_ESCALATION_REQUIRED`，不让低成本模型继续试错。
- 结果中的 `<closest-domain-test>` 是明确提醒：未建立领域映射时必须先选真实样本，不能退化为全量测试。
- 多个互不相同的切片同时变化时会各给一条效果证据；同一命令自动去重。

新增领域切片时，应同时补一条精确 path rule 和 selector self-test；不要仅依赖 `api` / `web` 的兜底规则。

首个巨型测试支持拆分已将 Finance Catalog 的 fixture、reset 和请求处理从 `appTestHarness.tsx` 移入领域 fixture；后续按同一方式逐个迁移，不一次重写整个 harness。
