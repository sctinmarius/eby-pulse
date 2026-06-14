import { describe, expect, it } from 'vitest';
import { API_KEY_PREFIX, generateApiKey, hashApiKey } from '../../src/lib/api-key.js';

describe('api-key', () => {
  it('generates keys with the ebp_live_ prefix and enough entropy', () => {
    const { key } = generateApiKey();
    expect(key.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(key.length).toBeGreaterThan(API_KEY_PREFIX.length + 40);
  });

  it('generates unique keys', () => {
    expect(generateApiKey().key).not.toBe(generateApiKey().key);
  });

  it('hashes deterministically and returns the matching hash', () => {
    const { key, hash } = generateApiKey();
    expect(hashApiKey(key)).toBe(hash);
    expect(hashApiKey(key)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashApiKey(key + 'x')).not.toBe(hash);
  });
});