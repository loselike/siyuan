import { createHash } from 'node:crypto';

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function getPasswordStrengthError(password: string): string | undefined {
  if (password.length < 8) {
    return '密码长度需大于或等于 8 位';
  }
  const typeCount = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^a-zA-Z0-9]/.test(password)
  ].filter(Boolean).length;
  if (typeCount < 3) {
    return '密码至少包含大写字母、小写字母、数字、特殊字符中的 3 类';
  }
  return undefined;
}
