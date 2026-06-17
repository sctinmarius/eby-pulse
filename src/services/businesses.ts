import type { Business } from '../generated/prisma/client.js';

export function sanitizeBusiness(business: Business) {
  const { apiKeyHash: _apiKeyHash, ...safe } = business;

  return safe;
}
