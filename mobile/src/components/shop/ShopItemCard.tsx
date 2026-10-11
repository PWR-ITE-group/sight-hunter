import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price_points: number;
  quantity?: number;
  type: 'hint' | 'reel' | 'partner';
}

interface ShopItemCardProps {
  item: ShopItem;
  onBuy: () => void;
  canAfford: boolean;
}

export function ShopItemCard({ item, onBuy, canAfford }: ShopItemCardProps) {
  return (
    <Card className="p-4 mb-4 flex-row items-center justify-between">
      <View className="flex-1 mr-4">
        <View className="flex-row items-center mb-1">
          <Text className="text-app-text font-bold text-lg">{item.name}</Text>
          {item.quantity && <Text className="text-text-secondary ml-2">x{item.quantity}</Text>}
        </View>
        <Text className="text-text-secondary text-sm mb-3">{item.description}</Text>
        <View className="self-start">
          <Badge value={`${item.price_points} pkt`} type="points" size="sm" />
        </View>
      </View>
      
      <View className="w-24">
        <Button 
          title="Kup"
          onPress={onBuy}
          disabled={!canAfford}
          variant="primary"
          size="sm"
        />
      </View>
    </Card>
  );
}
