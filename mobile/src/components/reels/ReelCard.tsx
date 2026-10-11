import React, { useEffect } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Lock } from 'lucide-react-native';
import { ReelOverlay } from './ReelOverlay';
import { Button } from '../ui/Button';
import { Colors } from '../../constants/colors';
import { components } from '../../api/schema';

export type Reel = components['schemas']['Reel'];

const { width } = Dimensions.get('window');

interface ReelCardProps {
  reel: Reel;
  /** Full item height; the feed passes the window height minus the tab bar. */
  height: number;
  /** Only the visible card plays; the others stay paused (feed rule from the architecture doc). */
  isActive: boolean;
  onComment: () => void;
  onShare: () => void;
  onUnlock?: () => void;
  unlocking?: boolean;
}

function ReelVideo({ url, isActive }: { url: string; isActive: boolean }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  return (
    <VideoView
      player={player}
      style={{ position: 'absolute', width: '100%', height: '100%' }}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

export function ReelCard({
  reel,
  height,
  isActive,
  onComment,
  onShare,
  onUnlock,
  unlocking = false,
}: ReelCardProps) {
  const canPlay = !reel.locked && !!reel.playback_url;

  return (
    <View style={{ height, width }} className="bg-black justify-center items-center relative">
      {canPlay && <ReelVideo url={reel.playback_url!} isActive={isActive} />}

      {reel.locked && (
        <View className="absolute inset-0 bg-black/60 justify-center items-center px-6">
          <View className="bg-white/10 p-6 rounded-3xl items-center border border-white/20 w-full max-w-sm">
            <View className="bg-white/20 p-4 rounded-full mb-4">
              <Lock color={Colors.background} size={32} />
            </View>
            <Text className="text-white text-xl font-bold mb-2 text-center">{reel.title}</Text>
            <Text className="text-white/80 text-center mb-6">
              {reel.kind === 'reward'
                ? 'Znajdź to miejsce, aby odblokować jego historię.'
                : 'Odblokuj tę rolkę za punkty.'}
            </Text>
            {reel.kind === 'public' && reel.price_points != null && onUnlock && (
              <Button
                title={`Kup za ${reel.price_points} pkt`}
                onPress={onUnlock}
                loading={unlocking}
                variant="primary"
                className="w-full"
              />
            )}
          </View>
        </View>
      )}

      {!reel.locked && (
        <>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={{
              position: 'absolute',
              bottom: 0,
              width: '100%',
              height: '50%',
              justifyContent: 'flex-end',
              paddingHorizontal: 16,
              paddingBottom: 32,
            }}
          >
            <View className="w-3/4 mb-4">
              <Text className="text-white text-2xl font-bold mb-2">{reel.title}</Text>
            </View>
          </LinearGradient>

          <ReelOverlay
            findersCount={reel.kind === 'reward' ? reel.finders_count : undefined}
            onComment={onComment}
            onShare={onShare}
          />
        </>
      )}
    </View>
  );
}
