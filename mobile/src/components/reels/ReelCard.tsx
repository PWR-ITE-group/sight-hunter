import React from 'react';
import { View, Text, Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ReelOverlay } from './ReelOverlay';
import { Button } from '../ui/Button';
import { Lock, Users } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

const { height, width } = Dimensions.get('window');
// Calculate height considering bottom tab bar approximately
const ITEM_HEIGHT = height - 80;

interface ReelCardProps {
  reel: any;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onView: () => void;
  onUnlock?: () => void;
}

export function ReelCard({ reel, onLike, onComment, onShare, onView, onUnlock }: ReelCardProps) {
  React.useEffect(() => {
    // Mock view count increment when reel mounts
    onView();
  }, [onView]);

  return (
    <View style={{ height: ITEM_HEIGHT, width }} className="bg-black justify-center items-center relative">
      <Image 
        source={{ uri: reel?.thumbnail_url || 'https://images.unsplash.com/photo-1512314889357-e157c22f938d?q=80&w=1280&auto=format&fit=crop' }} 
        className="absolute w-full h-full"
        contentFit="cover"
        blurRadius={reel?.locked ? 20 : 0}
      />
      
      {reel?.locked && (
        <View className="absolute inset-0 bg-black/40 justify-center items-center px-6">
          <View className="bg-white/10 p-6 rounded-3xl items-center border border-white/20 w-full max-w-sm">
            <View className="bg-white/20 p-4 rounded-full mb-4">
              <Lock color={Colors.background} size={32} />
            </View>
            <Text className="text-white text-xl font-bold mb-2 text-center">Zablokowane Odkrycie</Text>
            <Text className="text-white/80 text-center mb-6">Rozwiąż zadanie w tym miejscu lub odblokuj za punkty, aby obejrzeć historię.</Text>
            <Button 
              title={`Kup za ${reel?.price_points || 100} pkt`}
              onPress={onUnlock || (() => {})}
              variant="primary"
              className="w-full"
            />
          </View>
        </View>
      )}

      {!reel?.locked && (
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          className="absolute bottom-0 w-full h-1/2 justify-end px-4 pb-8"
        >
          <View className="w-3/4 mb-4">
            <Text className="text-white text-2xl font-bold mb-2 drop-shadow-lg">{reel?.title || 'Tajemnica Rynku'}</Text>
            <View className="flex-row items-center">
              <Users color="rgba(255,255,255,0.8)" size={16} />
              <Text className="text-white/80 text-sm ml-1 font-medium">{reel?.finders_count || 0} łowców odkryło</Text>
            </View>
          </View>
        </LinearGradient>
      )}

      {!reel?.locked && (
        <ReelOverlay 
          reel={reel}
          onLike={onLike}
          onComment={onComment}
          onShare={onShare}
        />
      )}
    </View>
  );
}
