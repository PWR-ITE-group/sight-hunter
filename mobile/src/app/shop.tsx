import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Card } from '../components/ui/Card';
import { ShopItemCard } from '../components/shop/ShopItemCard';
import { PurchaseDialog } from '../components/shop/PurchaseDialog';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';

const MOCK_ITEMS = [
  { id: '1', name: 'Zestaw Wskazówek', description: '3 dodatkowe wskazówki do wykorzystania w dowolnym momencie.', price_points: 300, quantity: 3, type: 'hint' as const },
  { id: '2', name: 'Pojedyncza Wskazówka', description: '1 wskazówka awaryjna.', price_points: 120, quantity: 1, type: 'hint' as const },
  { id: '3', name: 'Kawa zniżka -20%', description: 'Zniżka na kawę w kawiarni "Stara Pączkarnia".', price_points: 800, type: 'partner' as const }
];

export default function ShopScreen() {
  const [balance, setBalance] = useState(1250);
  const [selectedItem, setSelectedItem] = useState<typeof MOCK_ITEMS[0] | null>(null);
  const [purchaseResult, setPurchaseResult] = useState<{ success: boolean; coupon_code?: string } | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const handleConfirm = () => {
    if (selectedItem) {
      setBalance(prev => prev - selectedItem.price_points);
      setPurchaseResult({ 
        success: true, 
        coupon_code: selectedItem.type === 'partner' ? 'CAFE-2026' : undefined 
      });
    }
  };

  const handleClose = () => {
    setSelectedItem(null);
    setPurchaseResult(undefined);
  };

  const hints = MOCK_ITEMS.filter(i => i.type === 'hint');
  const partners = MOCK_ITEMS.filter(i => i.type === 'partner');

  return (
    <View className="flex-1 bg-background">
      <View className="pt-16 pb-6 px-6 bg-surface border-b border-border shadow-sm">
        <Text className="text-2xl font-bold text-app-text mb-4 text-center">Sklep</Text>
        <Card className="items-center p-4 bg-primaryLight border-none shadow-none">
          <Text className="text-textSecondary text-sm mb-1">Twój balans</Text>
          <Text className="text-3xl font-bold text-primary">💎 {balance} pkt</Text>
        </Card>
      </View>

      <ScrollView 
        className="flex-1 px-4 pt-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View>
            <Text className="text-xl font-bold text-app-text mb-4">Wskazówki</Text>
            <Skeleton className="w-full h-32 rounded-xl mb-4" />
            <Skeleton className="w-full h-32 rounded-xl mb-4" />
          </View>
        ) : (
          <>
            <Text className="text-xl font-bold text-app-text mb-4">Wskazówki</Text>
            {hints.length === 0 ? (
              <EmptyState title="Brak wskazówek" message="Sklep ze wskazówkami jest pusty." />
            ) : (
              hints.map(item => (
                <ShopItemCard 
                  key={item.id}
                  item={item}
                  onBuy={() => setSelectedItem(item)}
                  canAfford={balance >= item.price_points}
                />
              ))
            )}

            <Text className="text-xl font-bold text-app-text mb-4 mt-4">Partnerzy (Kupony)</Text>
            {partners.length === 0 ? (
              <EmptyState title="Brak kuponów" message="Brak dostępnych partnerów." />
            ) : (
              partners.map(item => (
                <ShopItemCard 
                  key={item.id}
                  item={item}
                  onBuy={() => setSelectedItem(item)}
                  canAfford={balance >= item.price_points}
                />
              ))
            )}
            <View className="h-12" />
          </>
        )}
      </ScrollView>

      <PurchaseDialog 
        item={selectedItem}
        visible={!!selectedItem}
        onConfirm={handleConfirm}
        onCancel={handleClose}
        result={purchaseResult}
      />
    </View>
  );
}
