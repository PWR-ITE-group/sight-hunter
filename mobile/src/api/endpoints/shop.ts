import { components } from '../schema';
import { apiClient } from '../client';

type ShopItem = components['schemas']['ShopItem'];

export async function listShopItems(): Promise<{ balance: number; items: ShopItem[] }> {
  return apiClient('GET', '/shop/items');
}

export async function purchase(
  itemId: string,
  idempotencyKey: string
): Promise<{ balance: number; item: ShopItem; coupon_code?: string | null }> {
  return apiClient('POST', '/shop/purchases', {
    body: { item_id: itemId },
    headers: { 'Idempotency-Key': idempotencyKey }
  });
}
