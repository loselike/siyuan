import { createHash, randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';

const PASSWORD_HASH_SCHEME = 'scrypt';
const PASSWORD_HASH_KEY_LENGTH = 64;
const PASSWORD_HASH_SALT_BYTES = 16;
const PASSWORD_HASH_COST = 16384;
const PASSWORD_HASH_BLOCK_SIZE = 8;
const PASSWORD_HASH_PARALLELIZATION = 1;
const PASSWORD_HASH_MAX_MEMORY = 64 * 1024 * 1024;

export function hashPassword(password: string): string {
  const salt = randomBytes(PASSWORD_HASH_SALT_BYTES);
  const derivedKey = deriveScryptKey(password, salt, PASSWORD_HASH_COST, PASSWORD_HASH_BLOCK_SIZE, PASSWORD_HASH_PARALLELIZATION);
  return [PASSWORD_HASH_SCHEME, PASSWORD_HASH_COST, PASSWORD_HASH_BLOCK_SIZE, PASSWORD_HASH_PARALLELIZATION, salt.toString('base64url'), derivedKey.toString('base64url')].join('$');
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith(`${PASSWORD_HASH_SCHEME}$`)) return verifyScryptPassword(password, storedHash);
  return verifyLegacySha256Password(password, storedHash);
}

export function passwordHashNeedsRehash(storedHash: string): boolean {
  const parsed = parseScryptHash(storedHash);
  return !parsed || parsed.cost !== PASSWORD_HASH_COST || parsed.blockSize !== PASSWORD_HASH_BLOCK_SIZE || parsed.parallelization !== PASSWORD_HASH_PARALLELIZATION || parsed.derivedKey.length !== PASSWORD_HASH_KEY_LENGTH;
}

async function verifyScryptPassword(password: string, storedHash: string): Promise<boolean> {
  const parsed = parseScryptHash(storedHash);
  if (!parsed) return false;
  if (parsed.cost !== PASSWORD_HASH_COST || parsed.blockSize !== PASSWORD_HASH_BLOCK_SIZE || parsed.parallelization !== PASSWORD_HASH_PARALLELIZATION || parsed.salt.length !== PASSWORD_HASH_SALT_BYTES || parsed.derivedKey.length !== PASSWORD_HASH_KEY_LENGTH) return false;
  try {
    const candidate = await deriveScryptKeyAsync(password, parsed.salt, parsed.cost, parsed.blockSize, parsed.parallelization, parsed.derivedKey.length);
    return candidate.length === parsed.derivedKey.length && timingSafeEqual(candidate, parsed.derivedKey);
  } catch {
    return false;
  }
}

function verifyLegacySha256Password(password: string, storedHash: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(storedHash)) return false;
  const candidate = Buffer.from(createHash('sha256').update(password).digest('hex'), 'hex');
  const expected = Buffer.from(storedHash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function parseScryptHash(storedHash: string) {
  const [scheme, costText, blockSizeText, parallelizationText, saltText, derivedKeyText, ...extra] = storedHash.split('$');
  if (scheme !== PASSWORD_HASH_SCHEME || extra.length > 0) return undefined;
  const cost = Number(costText);
  const blockSize = Number(blockSizeText);
  const parallelization = Number(parallelizationText);
  if (!Number.isInteger(cost) || cost < 2 || (cost & (cost - 1)) !== 0) return undefined;
  if (!Number.isInteger(blockSize) || blockSize < 1 || blockSize > 32) return undefined;
  if (!Number.isInteger(parallelization) || parallelization < 1 || parallelization > 16) return undefined;
  try {
    const salt = Buffer.from(saltText, 'base64url');
    const derivedKey = Buffer.from(derivedKeyText, 'base64url');
    if (salt.length < 16 || derivedKey.length < 32 || derivedKey.length > 128) return undefined;
    return { cost, blockSize, parallelization, salt, derivedKey };
  } catch {
    return undefined;
  }
}

function deriveScryptKey(password: string, salt: Buffer, cost: number, blockSize: number, parallelization: number, keyLength = PASSWORD_HASH_KEY_LENGTH) {
  return scryptSync(password, salt, keyLength, { N: cost, r: blockSize, p: parallelization, maxmem: PASSWORD_HASH_MAX_MEMORY });
}

function deriveScryptKeyAsync(password: string, salt: Buffer, cost: number, blockSize: number, parallelization: number, keyLength: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keyLength, { N: cost, r: blockSize, p: parallelization, maxmem: PASSWORD_HASH_MAX_MEMORY }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
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

export function generateTemporaryPassword(): string {
  return `Sy!${randomBytes(12).toString('base64url')}7a`;
}
