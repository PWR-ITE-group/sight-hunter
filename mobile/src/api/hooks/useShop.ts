import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listShopItems, purchase } from '../endpoints/shop';
import { queryKeys } from './queryKeys';
import { generateIdempotencyKey } from '../../utils/idempotency';

export function useShopItems() {
  return useQuery({
    queryKey: queryKeys.shopItems,
    queryFn: listShopItems,
  });
}

export function usePurchase() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (itemId: string) => purchase(itemId, generateIdempotencyKey()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shopItems });
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}
