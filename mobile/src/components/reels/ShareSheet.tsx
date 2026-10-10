import React from 'react';
import { View, Text, Share } from 'react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Colors } from '../../constants/colors';
import { Copy, Share as ShareIcon } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

interface ShareSheetProps {
  url: string;
  visible: boolean;
  onClose: () => void;
}

export function ShareSheet({ url, visible, onClose }: ShareSheetProps) {
  const handleCopy = async () => {
    await Clipboard.setStringAsync(url);
    // Optional: show a toast or feedback
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Sprawdź to odkrycie w Łowcy Historii! ${url}`,
        url: url, // iOS only
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Udostępnij" snapPoints={[35]}>
      <View className="px-6 py-4 flex-1 items-center">
        <Text className="text-textSecondary text-center mb-6">
          Zaproś znajomych do odkrywania historii Wrocławia razem z Tobą!
        </Text>
        
        <View className="flex-row items-center bg-surface p-3 rounded-lg border border-border mb-6 w-full">
          <Text className="flex-1 text-app-text text-sm mr-3" numberOfLines={1} ellipsizeMode="tail">
            {url}
          </Text>
          <Button 
            title=""
            icon={<Copy color={Colors.primary} size={20} />}
            onPress={handleCopy}
            variant="ghost"
          />
        </View>

        <Button 
          title="Udostępnij systemowo"
          icon={<ShareIcon color={Colors.background} size={20} />}
          onPress={handleShare}
          variant="primary"
          className="w-full"
        />
      </View>
    </BottomSheet>
  );
}
