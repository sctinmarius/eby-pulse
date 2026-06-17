import type { FastifyReply, FastifyRequest } from 'fastify';
import { constants as HttpStatusCodes } from 'node:http2';
import type { Business } from '../generated/prisma/client.js';
import { API_KEY_PREFIX, hashApiKey } from './api-key.js';
import { prisma } from './prisma.js';

declare module 'fastify' {
  interface FastifyRequest {
    business: Business;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  const key = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

  if (!key || !key.startsWith(API_KEY_PREFIX)) {
    return reply
      .code(HttpStatusCodes.HTTP_STATUS_UNAUTHORIZED)
      .send({ error: 'Missing or invalid API key' });
  }

  const business = await prisma.business.findUnique({ where: { apiKeyHash: hashApiKey(key) } });
  if (!business) {
    return reply
      .code(HttpStatusCodes.HTTP_STATUS_UNAUTHORIZED)
      .send({ error: 'Missing or invalid API key' });
  }

  request.business = business;
}
