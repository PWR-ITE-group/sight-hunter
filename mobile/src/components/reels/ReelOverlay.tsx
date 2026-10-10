import React from 'react';
import { View, Text } from 'react-native';
import { IconButton } from '../ui/IconButton';
import { Heart, MessageCircle, Share2 } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import Animated, { useAnimatedStyle, withSpring, useSharedValue, withSequence } from 'react-native-reanimated';

interface ReelOverlayProps {
  likesCount: number;
  likedByMe: boolean;
  /** The feed doesn't carry a comment count; shown only when known. */
  commentsCount?: number;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
}

export function ReelOverlay({ likesCount, likedByMe, commentsCount, onLike, onComment, onShare }: ReelOverlayProps) {
  const scale = useSharedValue(1);

  const handleLike = () => {
    scale.value = withSequence(withSpring(1.2), withSpring(1));
    onLike();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View className="absolute bottom-20 right-4 items-center">
      <View className="items-center mb-6">
        <Animated.View style={animatedStyle}>
          <IconButton
            icon={
              <Heart
                color={likedByMe ? Colors.error : Colors.background}
                fill={likedByMe ? Colors.error : 'transparent'}
                size={28}
              />
            }
            onPress={handleLike}
            size={50}
            color="rgba(0,0,0,0.3)"
          />
        </Animated.View>
        <Text className="text-white text-sm font-bold mt-1">{likesCount}</Text>
      </View>

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
