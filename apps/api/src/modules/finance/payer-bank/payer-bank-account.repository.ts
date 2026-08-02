import { Inject, Injectable } from '@nestjs/common';
import type {
  PayerBankAccountListQuery
} from '@siyuan/shared';
import type { Principal } from '../../rbac.js';
import { PrismaService } from '../../prisma.service.js';
import { PrismaRepository } from '../../prisma.repository.js';

export const PAYER_BANK_ACCOUNT_REPOSITORY = 'PAYER_BANK_ACCOUNT_REPOSITORY';

export type PayerBankAccountRow = {
  id: string;
  bankName: string;
  accountName: string;
  accountNo: string;
  accountNoNormalized: string;
  remark?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type PayerBankAccountCreateData = Omit<
  PayerBankAccountRow,
  'id' | 'createdAt' | 'updatedAt'
>;

export type PayerBankAccountUpdateData = Partial<PayerBankAccountCreateData>;

export interface PayerBankAccountAuditContext {
  actorId: string;
  principal?: Principal;
  action: string;
  before?: unknown;
  after?: (row: PayerBankAccountRow) => unknown;
}

export interface PayerBankAccountRepository {
  findMany(query: PayerBankAccountListQuery): Promise<PayerBankAccountRow[]>;
  findById(id: string): Promise<PayerBankAccountRow | null>;
  findByNormalizedAccountNo(accountNoNormalized: string, excludeId?: string): Promise<PayerBankAccountRow | null>;
  create(data: PayerBankAccountCreateData, audit: PayerBankAccountAuditContext): Promise<PayerBankAccountRow>;
  update(id: string, data: PayerBankAccountUpdateData, audit: PayerBankAccountAuditContext): Promise<PayerBankAccountRow>;
  delete(id: string, audit: PayerBankAccountAuditContext): Promise<PayerBankAccountRow>;
}

@Injectable()
export class PrismaPayerBankAccountRepository implements PayerBankAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: PayerBankAccountListQuery) {
    const keyword = query.keyword?.trim();
    return (this.prisma as any).payerBankAccount.findMany({
      where: keyword ? {
        OR: [
          { bankName: { contains: keyword, mode: 'insensitive' } },
          { accountName: { contains: keyword, mode: 'insensitive' } },
          { remark: { contains: keyword, mode: 'insensitive' } }
        ]
      } : undefined,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }]
    });
  }

  async findById(id: string) {
    return (this.prisma as any).payerBankAccount.findUnique({ where: { id } });
  }

  async findByNormalizedAccountNo(accountNoNormalized: string, excludeId?: string) {
    return (this.prisma as any).payerBankAccount.findFirst({
      where: {
        accountNoNormalized,
        ...(excludeId ? { id: { not: excludeId } } : {})
      }
    });
  }

  async create(data: PayerBankAccountCreateData, audit: PayerBankAccountAuditContext) {
    return this.prisma.$transaction(async (transaction) => {
      const row = await (transaction as any).payerBankAccount.create({ data });
      await transaction.auditLog.create({
        data: buildAuditData(audit, row)
      });
      return row;
    });
  }

  async update(id: string, data: PayerBankAccountUpdateData, audit: PayerBankAccountAuditContext) {
    return this.prisma.$transaction(async (transaction) => {
      const row = await (transaction as any).payerBankAccount.update({ where: { id }, data });
      await transaction.auditLog.create({
        data: buildAuditData(audit, row)
      });
      return row;
    });
  }

  async delete(id: string, audit: PayerBankAccountAuditContext) {
    return this.prisma.$transaction(async (transaction) => {
      const row = await (transaction as any).payerBankAccount.delete({ where: { id } });
      await transaction.auditLog.create({
        data: buildAuditData(audit, row)
      });
      return row;
    });
  }
}

@Injectable()
export class InMemoryPayerBankAccountRepository implements PayerBankAccountRepository {
  constructor(@Inject(PrismaRepository) private readonly appRepository: PrismaRepository) {}

  private rows: PayerBankAccountRow[] = [];

  async findMany(query: PayerBankAccountListQuery) {
    const keyword = query.keyword?.trim().toLowerCase();
    return [...this.rows]
      .filter((row) => !keyword || [
        row.bankName,
        row.accountName,
        row.remark
      ].some((value) => (value ?? '').toLowerCase().includes(keyword)))
      .sort((left, right) => formatTimestamp(right.updatedAt).localeCompare(formatTimestamp(left.updatedAt)));
  }

  async findById(id: string) {
    return this.rows.find((row) => row.id === id) ?? null;
  }

  async findByNormalizedAccountNo(accountNoNormalized: string, excludeId?: string) {
    return this.rows.find((row) =>
      row.accountNoNormalized === accountNoNormalized && row.id !== excludeId
    ) ?? null;
  }

  async create(data: PayerBankAccountCreateData, audit: PayerBankAccountAuditContext) {
    const timestamp = new Date().toISOString();
    const row: PayerBankAccountRow = {
      id: `payer-bank-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.rows.push(row);
    await this.writeAudit(audit, row);
    return row;
  }

  async update(id: string, data: PayerBankAccountUpdateData, audit: PayerBankAccountAuditContext) {
    const current = await this.findById(id);
    if (!current) throw new Error('payer bank account row not found');
    const next = { ...current, ...data, updatedAt: new Date().toISOString() };
    this.rows = this.rows.map((row) => row.id === id ? next : row);
    await this.writeAudit(audit, next);
    return next;
  }

  async delete(id: string, audit: PayerBankAccountAuditContext) {
    const current = await this.findById(id);
    if (!current) throw new Error('payer bank account row not found');
    this.rows = this.rows.filter((row) => row.id !== id);
    await this.writeAudit(audit, current);
    return current;
  }

  private async writeAudit(input: PayerBankAccountAuditContext, row: PayerBankAccountRow) {
    const audit = (this.appRepository as unknown as {
      audit?: (action: string, target: string, principal: Principal, before: unknown, after: unknown) => void;
    }).audit;
    if (audit && input.principal) {
      audit.call(
        this.appRepository,
        input.action,
        `payerBankAccount:${row.id}`,
        input.principal,
        input.before,
        input.after?.(row)
      );
    }
  }
}

function buildAuditData(audit: PayerBankAccountAuditContext, row: PayerBankAccountRow) {
  return {
    actorId: audit.actorId,
    action: audit.action,
    target: `payerBankAccount:${row.id}`,
    before: audit.before === undefined ? undefined : audit.before as any,
    after: audit.after === undefined ? undefined : audit.after(row) as any
  };
}

function formatTimestamp(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value;
}
