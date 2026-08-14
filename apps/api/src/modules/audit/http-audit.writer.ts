import type { Principal } from '../rbac.js';

export const HTTP_AUDIT_WRITER = Symbol('HTTP_AUDIT_WRITER');

export type HttpAuditWriteInput = {
  id: string;
  method: string;
  path: string;
  result: 'SUCCESS' | 'FAILED';
  durationMs: number;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
};

export interface HttpAuditWriter {
  recordHttpAudit(principal: Principal, input: HttpAuditWriteInput): Promise<void>;
}
