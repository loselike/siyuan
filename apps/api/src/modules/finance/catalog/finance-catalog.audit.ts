import { Inject, Injectable } from '@nestjs/common';
import type { Principal } from '../../rbac.js';
import { PrismaRepository } from '../../prisma.repository.js';
import { PrismaService } from '../../prisma.service.js';

export const FINANCE_CATALOG_AUDIT_WRITER = 'FINANCE_CATALOG_AUDIT_WRITER';

export type FinanceCatalogAuditInput = {
  actorId: string;
  principal?: Principal;
  action: string;
  target: string;
  before?: unknown;
  after?: unknown;
};

export interface FinanceCatalogAuditWriter {
  write(input: FinanceCatalogAuditInput): Promise<void>;
}

@Injectable()
export class PrismaFinanceCatalogAuditWriter implements FinanceCatalogAuditWriter {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: FinanceCatalogAuditInput) {
    await this.prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        target: input.target,
        before: input.before === undefined ? undefined : (input.before as any),
        after: input.after === undefined ? undefined : (input.after as any)
      }
    });
  }
}

@Injectable()
export class LegacyFinanceCatalogAuditWriter implements FinanceCatalogAuditWriter {
  constructor(@Inject(PrismaRepository) private readonly appRepository: PrismaRepository) {}

  async write(input: FinanceCatalogAuditInput) {
    const audit = (this.appRepository as unknown as {
      audit?: (action: string, target: string, principal: Principal, before: unknown, after: unknown) => void;
    }).audit;
    if (audit && input.principal) {
      audit.call(this.appRepository, input.action, input.target, input.principal, input.before, input.after);
    }
  }
}
