import { NotFoundError } from '../common/error.js';
import type { Product } from '../generated/prisma/client.js';
import { prisma } from '../libs/prisma.js';

export async function getOwnedProduct(productId: string, businessId: string): Promise<Product> {
  const product = await prisma.product.findFirst({ where: { id: productId, businessId } });
  if (!product) {
    throw new NotFoundError('Product not found');
  }

  return product;
}
