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
  result?: { success: boolean; coupon_code?: string };
}

export function PurchaseDialog({ item, visible, onConfirm, onCancel, result }: PurchaseDialogProps) {
  if (!item) return null;

  return (
    <BottomSheet visible={visible} onClose={onCancel} title={result ? "Wynik transakcji" : "Potwierdzenie"} snapPoints={[40]}>
      <View className="px-6 py-4 flex-1">
        {result ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-xl font-bold text-app-text mb-4 text-center">
              {result.success ? "Zakup udany!" : "Wystąpił błąd"}
            </Text>
            {result.success && result.coupon_code && (
              <View className="bg-surface p-4 rounded-lg border border-border w-full items-center mb-6">
                <Text className="text-textSecondary mb-2">Twój kod kuponu:</Text>
                <Text className="text-2xl font-bold text-primary">{result.coupon_code}</Text>
              </View>
            )}
            <Button title="Zamknij" onPress={onCancel} variant="primary" className="w-full" />
          </View>
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-lg text-app-text text-center mb-8">
              Kupić <Text className="font-bold">{item.name}</Text> za <Text className="font-bold text-primary">{item.price_points} pkt</Text>?
            </Text>
            
            <View className="flex-row gap-x-4 w-full">
              <View className="flex-1">
                <Button title="Anuluj" onPress={onCancel} variant="ghost" />
              </View>
              <View className="flex-1">
                <Button title="Kup" onPress={onConfirm} variant="primary" />
              </View>
            </View>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}
