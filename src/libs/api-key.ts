import { createHash, randomBytes } from 'node:crypto';

export const API_KEY_PREFIX = 'ebp_live_';

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function generateApiKey(): { key: string; hash: string } {
  const key = `${API_KEY_PREFIX}${randomBytes(32).toString('base64url')}`;

  return { key, hash: hashApiKey(key) };
}
