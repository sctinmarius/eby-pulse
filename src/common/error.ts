import { constants as HttpStatusCodes } from 'node:http2';
import { ZodError } from 'zod';
import { type FastifyError, type FastifyReply, type FastifyRequest } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';


export class NotFoundError extends Error {
  statusCode = HttpStatusCodes.HTTP_STATUS_NOT_FOUND;
}

export const errorHandler = (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
  if (hasZodFastifySchemaValidationErrors(error)) {
    return reply.code(HttpStatusCodes.HTTP_STATUS_BAD_REQUEST).send({ error: 'Validation failed', details: error.validation });
  }
  if (error instanceof ZodError) {
    return reply.code(HttpStatusCodes.HTTP_STATUS_BAD_REQUEST).send({ error: 'Validation failed', details: error.issues });
  }
  if (error.statusCode !== undefined && error.statusCode < HttpStatusCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR) {
    return reply.code(error.statusCode).send({ error: error.message });
  }
  request.log.error(error);
  return reply.code(HttpStatusCodes.HTTP_STATUS_INTERNAL_SERVER_ERROR).send({ error: 'Internal server error' });
}
