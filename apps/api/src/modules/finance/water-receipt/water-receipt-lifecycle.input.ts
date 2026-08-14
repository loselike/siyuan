import { BadRequestException } from '@nestjs/common';
import type {
  WaterReceiptCreateInput,
  WaterReceiptMarkArrivedInput,
  WaterReceiptUpdateInput
} from '@siyuan/shared';

type UnknownRecord = Record<string, unknown>;

export function parseWaterReceiptCreateInput(value: unknown): WaterReceiptCreateInput {
  const input = asRecord(value);
  const receiptMethod = parseRequiredString(input.receiptMethod, '结算方式不能为空');
  const customerId = parseOptionalString(input.customerId);
  const customerCode = parseOptionalString(input.customerCode);
  const site = parseOptionalString(input.site);
  const currency = parseOptionalString(input.currency);
  const remark = parseOptionalString(input.remark);
  const amount = parsePositiveNumber(input.amount, '水单金额必须大于 0');
  const paymentNo = parsePaymentNo(input.paymentNo);
  const receiptDate = parseDateString(input.receiptDate, '到账日期无效');
  return {
    ...(customerId !== undefined ? { customerId } : {}),
    ...(customerCode !== undefined ? { customerCode } : {}),
    ...(site !== undefined ? { site } : {}),
    receiptMethod,
    receiptDate,
    ...(currency !== undefined ? { currency } : {}),
    amount,
    paymentNo,
    ...(remark !== undefined ? { remark } : {})
  };
}

export function parseWaterReceiptUpdateInput(value: unknown): WaterReceiptUpdateInput {
  const input = asRecord(value);
  const receiptDate = input.receiptDate === undefined || input.receiptDate === null
    ? undefined
    : parseDateString(input.receiptDate, '水单日期无效');
  const customerId = parseOptionalString(input.customerId);
  const customerCode = parseOptionalString(input.customerCode);
  const site = parseOptionalString(input.site);
  const receiptMethod = parseOptionalString(input.receiptMethod);
  const currency = parseOptionalString(input.currency);
  const paymentNo = parsePaymentNo(input.paymentNo);
  const amount = input.amount === undefined || input.amount === null
    ? undefined
    : parsePositiveNumber(input.amount, '水单金额必须大于 0');
  const remark = parseOptionalString(input.remark);
  const adjustReason = parseOptionalString(input.adjustReason);
  return {
    ...(customerId !== undefined ? { customerId } : {}),
    ...(customerCode !== undefined ? { customerCode } : {}),
    ...(site !== undefined ? { site } : {}),
    ...(receiptMethod !== undefined ? { receiptMethod } : {}),
    ...(receiptDate !== undefined ? { receiptDate } : {}),
    ...(currency !== undefined ? { currency } : {}),
    ...(amount !== undefined ? { amount } : {}),
    paymentNo,
    ...(remark !== undefined ? { remark } : {}),
    ...(adjustReason !== undefined ? { adjustReason } : {})
  };
}

export function parseWaterReceiptMarkArrivedInput(value: unknown): WaterReceiptMarkArrivedInput {
  const input = asOptionalRecord(value);
  const arrivedAt = input.arrivedAt === undefined || input.arrivedAt === null
    ? undefined
    : parseDateString(input.arrivedAt, '到账时间无效');
  const note = parseOptionalString(input.note);
  return {
    ...(arrivedAt !== undefined ? { arrivedAt } : {}),
    ...(note !== undefined ? { note } : {})
  };
}

export function parseWaterReceiptVoidInput(value: unknown): { reason?: string } {
  const input = asOptionalRecord(value);
  const reason = parseOptionalString(input.reason);
  return reason === undefined ? {} : { reason };
}

function asRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('请求数据格式错误');
  }
  return value as UnknownRecord;
}

function asOptionalRecord(value: unknown): UnknownRecord {
  if (value === undefined || value === null) return {};
  return asRecord(value);
}

function parseRequiredString(value: unknown, message: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(message);
  return value;
}

function parseOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw new BadRequestException('请求数据格式错误');
  return value;
}

function parseDateString(value: unknown, message: string): string {
  if (typeof value !== 'string' || Number.isNaN(new Date(value).getTime())) {
    throw new BadRequestException(message);
  }
  return value;
}

function parsePaymentNo(value: unknown): string {
  if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') {
    throw new BadRequestException('付款编号不能为空');
  }
  return String(value);
}

function parsePositiveNumber(value: unknown, message: string): number {
  const parsed = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) throw new BadRequestException(message);
  return parsed;
}
