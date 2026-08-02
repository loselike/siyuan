# Safe Test Runner

- 状态：`done`
- 目的：避免 Codex 或本地测试断流后遗留高耗能 `vitest` worker。

## 使用

```bash
npm run test:web:safe -- --run src/modules/finance/finance.test.tsx -t "录单草稿箱"
```

自定义命令：

```bash
npm run test:safe -- npm test -w @siyuan/web -- --run src/modules/routing/routing.test.tsx -t "目标用例"
```

默认 120 秒超时，可临时调整：

```bash
SAFE_TEST_TIMEOUT_MS=300000 npm run test:web:safe -- --run src/modules/pricing/pricing.test.tsx -t "目标用例"
```

## 约束

- 不改原有 `test`、`test:web:*`、`dev`、`build` 命令。
- 安全 runner 会强制 Vitest 使用单个 thread、关闭测试文件并发，并固定 test/hook timeout 为 30 秒；调用参数不能恢复默认多 worker。
- 超时、终端中断或子进程提前退出后，runner 都会检查并清理整个进程组；最终明确输出 `PASS` 或 `FAIL` 及退出码。
