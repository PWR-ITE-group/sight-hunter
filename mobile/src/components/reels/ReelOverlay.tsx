import React from 'react';
import { View, Text } from 'react-native';
import { IconButton } from '../ui/IconButton';
import { MessageCircle, Share2, Users } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

interface ReelOverlayProps {
  /** How many players found the reel's place; undefined for public reels, which have no place. */
  findersCount?: number;
  /** The feed doesn't carry a comment count; shown only when known. */
  commentsCount?: number;
  onComment: () => void;
  onShare: () => void;
}

export function ReelOverlay({ findersCount, commentsCount, onComment, onShare }: ReelOverlayProps) {
  return (
    <View className="absolute bottom-20 right-4 items-center">
      {findersCount !== undefined && (
        <View className="items-center mb-6" accessibilityLabel={`${findersCount} łowców odkryło`}>
          <View
            className="justify-center items-center rounded-full"
            style={{ width: 50, height: 50, backgroundColor: 'rgba(0,0,0,0.3)' }}
          >
            <Users color={Colors.background} size={28} />
          </View>
          <Text className="text-white text-sm font-bold mt-1">{findersCount}</Text>
        </View>
      )}

      <View className="items-center mb-6">
        <IconButton
          icon={<MessageCircle color={Colors.background} size={28} />}
          onPress={onComment}
          size={50}
          color="rgba(0,0,0,0.3)"
        />
        {commentsCount !== undefined && (
          <Text className="text-white text-sm font-bold mt-1">{commentsCount}</Text>
        )}
      </View>

      <View className="items-center">
        <IconButton
          icon={<Share2 color={Colors.background} size={28} />}
          onPress={onShare}
          size={50}
          color="rgba(0,0,0,0.3)"
        />
      </View>
    </View>
  );
}
