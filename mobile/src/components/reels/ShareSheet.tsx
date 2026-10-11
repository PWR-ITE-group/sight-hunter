import React, { useState } from 'react';
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
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Sprawdź to odkrycie w Łowcach Historii! ${url}`, url });
    } catch {
      // The player closed the system sheet; nothing to report.
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Udostępnij">
      <View className="py-2 items-center">
        <Text className="text-text-secondary text-center mb-5">
          Zaproś znajomych do odkrywania historii Wrocławia razem z Tobą!
        </Text>

        <View className="flex-row items-center bg-paper p-3 rounded-xl border border-app-border mb-5 w-full">
          <Text className="flex-1 text-app-text text-sm mr-3" numberOfLines={1} ellipsizeMode="middle">
            {url}
          </Text>
          <Button
            title={copied ? 'Skopiowano' : 'Kopiuj'}
            icon={<Copy color={Colors.primary} size={16} />}
            onPress={handleCopy}
            variant="ghost"
            size="sm"
          />
        </View>

        <Button
          title="Udostępnij"
          icon={<ShareIcon color="#FFFFFF" size={20} />}
          onPress={handleShare}
          variant="primary"
          style={{ width: '100%' }}
        />
      </View>
    </BottomSheet>
  );
}
