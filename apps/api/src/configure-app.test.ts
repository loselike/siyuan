import { describe, expect, it } from 'vitest';
import { resolveCorsPolicy } from './configure-app.js';

describe('resolveCorsPolicy', () => {
  it('fails closed in production when no cross-origin client is configured', () => {
    expect(resolveCorsPolicy({ NODE_ENV: 'production' })).toEqual({
      enabled: false,
      origins: []
    });
  });

  it('allows only normalized explicit production origins', () => {
    expect(resolveCorsPolicy({
      NODE_ENV: 'production',
      CORS_ALLOWED_ORIGINS: ' https://ops.example.com/,http://localhost:5173,https://ops.example.com '
    })).toEqual({
      enabled: true,
      origins: ['https://ops.example.com', 'http://localhost:5173']
    });
  });

  it.each([
    '*',
    'https://ops.example.com/path',
    'https://user:password@ops.example.com',
    'javascript:alert(1)'
  ])('rejects an unsafe configured origin: %s', (origin) => {
    expect(() => resolveCorsPolicy({
      NODE_ENV: 'production',
      CORS_ALLOWED_ORIGINS: origin
    })).toThrow('CORS_ALLOWED_ORIGINS');
  });

  it('keeps the existing open CORS behavior outside production when no list is configured', () => {
    expect(resolveCorsPolicy({ NODE_ENV: 'development' })).toEqual({
      enabled: true,
      origins: '*'
    });
  });
});
