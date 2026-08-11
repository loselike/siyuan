import { BadRequestException } from '@nestjs/common';
import type {
  ShipmentFinanceItemSourceType,
  WaterReceiptMatchOrdersInput,
  WaterReceiptUnmatchInput
} from '@siyuan/shared';

type UnknownRecord = Record<string, unknown>;

export function parseWaterReceiptMatchOrdersInput(value: unknown): WaterReceiptMatchOrdersInput {
  const input = asRecord(value);
  const rawMatches = input.matches;
  if (!Array.isArray(rawMatches) || rawMatches.length === 0) {
    throw new BadRequestException('请选择要匹配的应收费用');
  }

  const amountCurrency = parseAmountCurrency(input.amountCurrency);
  const exchangeRate = input.exchangeRate === undefined
    ? undefined
    : parsePositiveNumber(input.exchangeRate, '汇率必须大于 0');
  const matches = rawMatches.map((rawMatch) => {
    const match = asRecord(rawMatch, '应收费用不能为空');
    const receivableId = parseOptionalIdentifier(match.receivableId);
    const receivableFinanceItemId = parseOptionalIdentifier(match.receivableFinanceItemId);
    if (!receivableId && !receivableFinanceItemId) {
      throw new BadRequestException('应收费用不能为空');
    }
    const receivableSourceType = parseReceivableSourceType(match.receivableSourceType);
    return {
      ...(receivableId ? { receivableId } : {}),
      ...(receivableSourceType ? { receivableSourceType } : {}),
      ...(receivableFinanceItemId ? { receivableFinanceItemId } : {}),
      amount: parsePositiveNumber(match.amount, '匹配金额必须大于 0')
    };
  });

  return {
    ...(amountCurrency ? { amountCurrency } : {}),
    ...(exchangeRate !== undefined ? { exchangeRate } : {}),
    matches
  };
}

export function parseWaterReceiptUnmatchInput(value: unknown): WaterReceiptUnmatchInput {
  const input = asRecord(value);
  if (!Array.isArray(input.matchIds) || input.matchIds.length === 0) {
    throw new BadRequestException('没有可撤销的匹配记录');
  }
  const matchIds = input.matchIds.map((matchId) => {
    if (typeof matchId !== 'string' || !matchId.trim()) {
      throw new BadRequestException('没有可撤销的匹配记录');
    }
    return matchId;
  });
  const reason = parseOptionalString(input.reason);
  return {
    matchIds,
    ...(reason !== undefined ? { reason } : {})
  };
}

function asRecord(value: unknown, message = '请求数据格式错误'): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException(message);
  }
  return value as UnknownRecord;
}

function parseAmountCurrency(value: unknown): WaterReceiptMatchOrdersInput['amountCurrency'] {
  if (value === undefined) return undefined;
  if (value === 'SOURCE' || value === 'RMB') return value;
  throw new BadRequestException('匹配金额币种无效');
}

function parseReceivableSourceType(value: unknown): ShipmentFinanceItemSourceType | undefined {
  if (value === undefined) return undefined;
  if (value === 'SYSTEM' || value === 'MANUAL') return value;
  throw new BadRequestException('应收来源类型无效');
}

function parseOptionalIdentifier(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return value;
}

function parseOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new BadRequestException('请求数据格式错误');
  return value;
}

function parsePositiveNumber(value: unknown, message: string): number {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new BadRequestException(message);
  }
  return parsed;
}
