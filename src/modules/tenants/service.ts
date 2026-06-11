import type { Product } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';

export class NotFoundError extends Error {
  statusCode = 404;
}

/** Fetches a product only if it belongs to the given business — the tenant-isolation gate. */
export async function getOwnedProduct(productId: string, businessId: string): Promise<Product> {
  const product = await prisma.product.findFirst({ where: { id: productId, businessId } });
  if (!product) throw new NotFoundError('Product not found');
  return product;
}
