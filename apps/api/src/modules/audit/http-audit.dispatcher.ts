import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Principal } from '../rbac.js';
import {
  HTTP_AUDIT_WRITER,
  type HttpAuditWriteInput,
  type HttpAuditWriter
} from './http-audit.writer.js';

const RETRY_DELAYS_MS = [100, 500] as const;
const MAX_PENDING_WRITES = 1_000;

@Injectable()
export class HttpAuditDispatcher {
  private readonly logger = new Logger(HttpAuditDispatcher.name);
  private pendingWrites = 0;

  constructor(
    @Inject(HTTP_AUDIT_WRITER)
    private readonly writer: HttpAuditWriter
  ) {}

  enqueue(principal: Principal, input: HttpAuditWriteInput) {
    if (this.pendingWrites >= MAX_PENDING_WRITES) {
      this.logger.warn('HTTP 审计后台队列已满，本次审计已丢弃');
      return;
    }
    this.pendingWrites += 1;
    void this.deliver(principal, input).finally(() => {
      this.pendingWrites -= 1;
    });
  }

  private async deliver(principal: Principal, input: HttpAuditWriteInput) {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        await this.writer.recordHttpAudit(principal, input);
        return;
      } catch {
        const retryDelay = RETRY_DELAYS_MS[attempt];
        if (retryDelay === undefined) {
          this.logger.warn('HTTP 审计后台写入持续失败，本次审计未落库');
          return;
        }
        await delay(retryDelay);
      }
    }
  }
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => globalThis.setTimeout(resolve, milliseconds));
}
