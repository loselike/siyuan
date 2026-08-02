import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  PayerBankAccountInput,
  PayerBankAccountListQuery,
  PayerBankAccountListResponse,
  PayerBankAccountSummary
} from '@siyuan/shared';
import type { Principal } from '../../rbac.js';
import {
  PAYER_BANK_ACCOUNT_REPOSITORY,
  type PayerBankAccountCreateData,
  type PayerBankAccountRepository,
  type PayerBankAccountRow,
  type PayerBankAccountUpdateData
} from './payer-bank-account.repository.js';

@Injectable()
export class PayerBankAccountService {
  constructor(
    @Inject(PAYER_BANK_ACCOUNT_REPOSITORY)
    private readonly repository: PayerBankAccountRepository
  ) {}

  async list(query: PayerBankAccountListQuery = {}): Promise<PayerBankAccountListResponse> {
    if (query.keyword !== undefined && typeof query.keyword !== 'string') {
      throw new BadRequestException('搜索条件格式不正确');
    }
    const rows = await this.repository.findMany(query);
    return { items: rows.map(toSummary) };
  }

  async create(principal: Principal, input: PayerBankAccountInput): Promise<PayerBankAccountSummary> {
    const data = normalizeInput(input, true) as PayerBankAccountCreateData;
    await this.ensureUniqueAccountNo(data.accountNoNormalized);
    const row = await mapUniqueAccountNoError(() => this.repository.create(data, {
      actorId: principal.id,
      principal,
      action: 'master-data.payer-bank.create',
      after: toAuditSummary
    }));
    return toSummary(row);
  }

  async update(
    principal: Principal,
    id: string,
    input: Partial<PayerBankAccountInput>
  ): Promise<PayerBankAccountSummary> {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('付款银行资料不存在');
    const data = normalizeInput(input, false) as PayerBankAccountUpdateData;
    if (data.accountNoNormalized) {
      await this.ensureUniqueAccountNo(data.accountNoNormalized, id);
    }
    const row = await mapUniqueAccountNoError(() => this.repository.update(id, data, {
      actorId: principal.id,
      principal,
      action: 'master-data.payer-bank.update',
      before: toAuditSummary(current),
      after: toAuditSummary
    }));
    return toSummary(row);
  }

  async delete(principal: Principal, id: string) {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('付款银行资料不存在');
    await this.repository.delete(id, {
      actorId: principal.id,
      principal,
      action: 'master-data.payer-bank.delete',
      before: toAuditSummary(current)
    });
    return { id, deleted: true as const };
  }

  private async ensureUniqueAccountNo(accountNoNormalized: string, excludeId?: string) {
    if (await this.repository.findByNormalizedAccountNo(accountNoNormalized, excludeId)) {
      throw new BadRequestException('付款方账号已存在');
    }
  }
}

function normalizeInput(
  input: Partial<PayerBankAccountInput>,
  requireAll: boolean
): PayerBankAccountCreateData | PayerBankAccountUpdateData {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new BadRequestException('付款银行资料格式不正确');
  }
  const data: PayerBankAccountUpdateData = {};

  if (input.bankName !== undefined || requireAll) {
    data.bankName = normalizeRequired(input.bankName, '付款方银行', 120);
  }
  if (input.accountName !== undefined || requireAll) {
    data.accountName = normalizeRequired(input.accountName, '付款方户名', 120);
  }
  if (input.accountNo !== undefined || requireAll) {
    data.accountNo = normalizeRequired(input.accountNo, '付款方账号', 80);
    data.accountNoNormalized = normalizeAccountNo(data.accountNo);
  }
  if (input.remark !== undefined) {
    if (typeof input.remark !== 'string') throw new BadRequestException('备注格式不正确');
    const remark = input.remark.trim();
    if (remark.length > 500) throw new BadRequestException('备注不能超过 500 个字符');
    data.remark = remark || null;
  }
  return data;
}

function normalizeRequired(value: unknown, label: string, maxLength: number) {
  if (typeof value !== 'string') throw new BadRequestException(`${label}格式不正确`);
  const normalized = value.trim();
  if (!normalized) throw new BadRequestException(`${label}不能为空`);
  if (normalized.length > maxLength) throw new BadRequestException(`${label}不能超过 ${maxLength} 个字符`);
  return normalized;
}

function normalizeAccountNo(accountNo: string) {
  return accountNo.replace(/[\s-]+/g, '').toUpperCase();
}

function toSummary(row: PayerBankAccountRow): PayerBankAccountSummary {
  return {
    id: row.id,
    bankName: row.bankName,
    accountName: row.accountName,
    accountNo: row.accountNo,
    remark: row.remark ?? undefined,
    createdAt: formatDate(row.createdAt),
    updatedAt: formatDate(row.updatedAt)
  };
}

function toAuditSummary(row: PayerBankAccountRow) {
  const summary = toSummary(row);
  return {
    ...summary,
    remark: summary.remark ?? null,
    accountNo: maskAccountNo(summary.accountNo)
  };
}

async function mapUniqueAccountNoError<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && 'code' in error
      && error.code === 'P2002'
    ) {
      throw new BadRequestException('付款方账号已存在');
    }
    throw error;
  }
}

function maskAccountNo(accountNo: string) {
  const compact = accountNo.replace(/\s+/g, '');
  if (compact.length <= 4) return '*'.repeat(compact.length);
  return `${'*'.repeat(Math.max(4, compact.length - 4))}${compact.slice(-4)}`;
}

function formatDate(value: string | Date) {
  return value instanceof Date ? value.toISOString() : value;
}
