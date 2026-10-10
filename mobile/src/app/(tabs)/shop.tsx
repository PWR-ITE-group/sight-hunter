import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Card } from '../../components/ui/Card';
import { ShopItemCard } from '../../components/shop/ShopItemCard';
import { PurchaseDialog } from '../../components/shop/PurchaseDialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorBanner, errorMessage } from '../../components/ui/ErrorBanner';
import { useShopItems, usePurchase } from '../../api/hooks/useShop';
import { components } from '../../api/schema';

type ShopItem = components['schemas']['ShopItem'];

export default function ShopScreen() {
  const shop = useShopItems();
  const purchase = usePurchase();

  const [selected, setSelected] = useState<ShopItem | null>(null);
  const [result, setResult] = useState<{ success: boolean; coupon_code?: string } | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  const balance = shop.data?.balance ?? 0;
  const items = shop.data?.items ?? [];

  const handleConfirm = async () => {
    if (!selected) return;
    setError(null);
    try {
      const res = await purchase.mutateAsync(selected.id);
      setResult({ success: true, coupon_code: res.coupon_code ?? undefined });
    } catch (e) {
      setError(errorMessage(e));
      setResult({ success: false });
    }
  };

  const handleClose = () => {
    setSelected(null);
    setResult(undefined);
  };

  return (
    <View className="flex-1 bg-white">
      <View className="pt-16 bg-surface border-b border-app-border shadow-sm">
        <Text className="text-2xl font-bold text-app-text mb-4 text-center">Sklep</Text>
        <View className="px-6 pb-6">
          <Card className="items-center p-4 bg-primary-light">
            <Text className="text-text-secondary text-sm mb-1">Twój balans</Text>
            <Text className="text-3xl font-bold text-primary">💎 {balance} pkt</Text>
          </Card>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-6"
        refreshControl={<RefreshControl refreshing={shop.isRefetching} onRefresh={() => shop.refetch()} />}
      >
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} className="mb-4" />}

        {shop.isLoading ? (
          <View>
            <Skeleton className="w-full h-32 rounded-xl mb-4" />
            <Skeleton className="w-full h-32 rounded-xl mb-4" />
          </View>
        ) : shop.error ? (
          <ErrorBanner message={errorMessage(shop.error)} onRetry={() => shop.refetch()} />
        ) : (
          <>
            <Text className="text-xl font-bold text-app-text mb-4">Rolki o historii miasta</Text>
            {items.length === 0 ? (
              <EmptyState title="Wszystko odblokowane" message="Masz już każdą rolkę ze sklepu. Zajrzyj tu później." />
            ) : (
              items.map((item) => (
                <ShopItemCard
                  key={item.id}
                  item={{
                    id: item.id,
                    name: item.name,
                    description: item.description ?? '',
                    price_points: item.price_points,
                    quantity: item.quantity,
                    type: item.type,
                  }}
                  onBuy={() => setSelected(item)}
                  canAfford={balance >= item.price_points}
                />
              ))
            )}
            <View className="h-12" />
          </>
        )}
      </ScrollView>

      <PurchaseDialog
        item={selected}
        visible={!!selected}
        onConfirm={handleConfirm}
        onCancel={handleClose}
        result={result}
      />
    </View>
  );
}
