import { BadRequestException } from '@nestjs/common';

export function normalizeProblemTicketTagName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!name) throw new BadRequestException('请填写标签名称');
  if (name.length > 20) throw new BadRequestException('标签名称最多 20 个字符');
  if (/[，,]/.test(name)) throw new BadRequestException('标签名称不能包含逗号');
  return name;
}

export function normalizeProblemTicketTagSnapshot(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new BadRequestException('常用标签格式不正确');
  if (value.length > 10) throw new BadRequestException('单个问题件最多选择 10 个常用标签');
  const tags = [...new Set(value.map((item) => normalizeProblemTicketTagName(item)))];
  return tags.length ? tags : undefined;
}
