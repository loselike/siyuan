# 报价查价功能权限细分

- 状态：已完成本地实现，未发布 47。
- 范围：报价查价的细粒度权限定义、旧权限兼容、前端入口与敏感字段裁剪、后端接口 RBAC、价格表行字段裁剪及 Prisma 初始化 migration。
- 验证：`app.pricing.e2e.test.ts -t "enforces saved fine-grained|automatically serves the latest successful Dubai"`、API/Web typecheck、`git diff --check` 均通过。
- 说明：完整历史 pricing e2e 文件仍有与本任务无关的既有顺序/价格夹具断言失败，未改动报价算法或历史夹具。
