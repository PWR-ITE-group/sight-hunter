import React from 'react';
import { View, Text } from 'react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';

interface ShopItem {
  id: string;
  name: string;
  price_points: number;
}

interface PurchaseDialogProps {
  item: ShopItem | null;
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirming?: boolean;
  result?: { success: boolean; coupon_code?: string; message?: string };
}

export function PurchaseDialog({ item, visible, onConfirm, onCancel, confirming = false, result }: PurchaseDialogProps) {
  if (!item) return null;

  return (
    <BottomSheet visible={visible} onClose={onCancel} title={result ? 'Wynik transakcji' : 'Potwierdzenie'}>
      {result ? (
        <View className="items-center py-2">
          <Text className="text-4xl mb-3">{result.success ? '🎉' : '😕'}</Text>
          <Text className="text-xl font-bold text-app-text mb-2 text-center">
            {result.success ? 'Zakup udany!' : 'Nie udało się kupić'}
          </Text>
          {result.message && <Text className="text-text-secondary text-center mb-4">{result.message}</Text>}
          {result.success && result.coupon_code && (
            <View className="bg-surface p-4 rounded-xl border border-app-border w-full items-center mb-4">
              <Text className="text-text-secondary mb-2">Twój kod kuponu:</Text>
              <Text className="text-2xl font-bold text-primary">{result.coupon_code}</Text>
            </View>
          )}
          <Button title="Zamknij" onPress={onCancel} variant="primary" style={{ width: '100%', marginTop: 8 }} />
        </View>
      ) : (
        <View className="py-2">
          <Text className="text-lg text-app-text text-center mb-6">
            Kupić <Text className="font-bold">{item.name}</Text> za{' '}
            <Text className="font-bold text-primary">{item.price_points} pkt</Text>?
          </Text>
          <View className="flex-row gap-x-3">
            <Button title="Anuluj" onPress={onCancel} variant="outline" style={{ flex: 1 }} />
            <Button title="Kup" onPress={onConfirm} variant="primary" loading={confirming} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </BottomSheet>
  );
}
