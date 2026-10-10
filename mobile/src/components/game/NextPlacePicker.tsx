import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Compass, Flame, Dice5, ChevronRight } from 'lucide-react-native';
import { Card } from '../ui/Card';
import { Colors } from '../../constants/colors';

export interface NextOption {
  taskId: string;
  type: 'nearest' | 'popular' | 'random';
  name?: string;
  distance?: string;
  findersCount?: number;
}

export interface NextPlacePickerProps {
  options: NextOption[];
  onSelect: (taskId: string) => void;
}

export function NextPlacePicker({ options, onSelect }: NextPlacePickerProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'nearest': return <Compass size={32} color={Colors.primary} />;
      case 'popular': return <Flame size={32} color={Colors.secondary} />;
      case 'random': return <Dice5 size={32} color={Colors.warning} />;
      default: return <Compass size={32} color={Colors.primary} />;
    }
  };

  const getTitle = (opt: NextOption) => {
    if (opt.type === 'nearest') return 'Najbliższe';
    if (opt.type === 'popular') return 'Najpopularniejsze';
    if (opt.type === 'random') return 'Losowe w pobliżu';
    return '';
  };

  const getSubtitle = (opt: NextOption) => {
    if (opt.type === 'nearest') return opt.name ? `${opt.name} — ${opt.distance}` : `??? — ${opt.distance}`;
    if (opt.type === 'popular') return opt.name ? `${opt.name} (${opt.findersCount} łowców)` : `${opt.findersCount} łowców`;
    if (opt.type === 'random') return 'Zaskocz mnie!';
    return '';
  };

  return (
    <View className="w-full gap-4 mt-6">
      {options.map((opt) => (
        <TouchableOpacity key={opt.taskId} onPress={() => onSelect(opt.taskId)} activeOpacity={0.8}>
          <Card padding={16} elevation="sm">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 gap-4">
                <View className="w-12 h-12 bg-primary-light rounded-full items-center justify-center">
                  {getIcon(opt.type)}
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-app-text">{getTitle(opt)}</Text>
                  <Text className="text-sm text-text-secondary mt-1">{getSubtitle(opt)}</Text>
                </View>
              </View>
              <ChevronRight size={24} color={Colors.textTertiary} />
            </View>
          </Card>
        </TouchableOpacity>
      ))}
    </View>
  );
}
