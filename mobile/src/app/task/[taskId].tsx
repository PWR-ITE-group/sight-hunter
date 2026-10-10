import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import RiddleCard from '../../components/game/RiddleCard';
import HintDialog from '../../components/game/HintDialog';
import Button from '../../components/ui/Button';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/layout/Header';

const MOCK_TASK = {
  id: '1',
  riddle: 'Gdzie stoją cztery wieże, ale ani jednego zamku?',
  archival_photo_url: 'https://picsum.photos/400/300',
  reward_points: 150,
  reward_xp: 50,
};

export default function TaskDetailsScreen() {
  const { taskId } = useLocalSearchParams();
  const router = useRouter();
  
  const [hintVisible, setHintVisible] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);

  const handleShowHint = () => {
    if (hintsUsed < 3) {
      setHintsUsed(prev => prev + 1);
    }
    setHintVisible(true);
  };

  const handleStartCamera = () => {
    router.push('/camera');
  };

  const handleShare = () => {
    // share logic
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <Header title="Zadanie" showBack />
      <ScrollView className="flex-1 px-4 pt-4">
        <RiddleCard task={MOCK_TASK} />
        
        <View className="mb-6 flex-col gap-3">
          {[1, 2, 3].map(n => (
            <Button
              key={n}
              title={hintsUsed >= n ? `Wskazówka ${n} - użyta` : `Wskazówka ${n}`}
              variant={hintsUsed >= n ? 'secondary' : 'outline'}
              onPress={handleShowHint}
              disabled={hintsUsed >= n}
            />
          ))}
        </View>

        <Button
          title="📷 Zrób zdjęcie"
          variant="primary"
          size="lg"
          onPress={handleStartCamera}
        />
        
        <View className="items-center mt-6 mb-8">
          <Button
            title="Udostępnij"
            variant="ghost"
            onPress={handleShare}
            icon={<Feather name="share-2" size={18} color="#208AEF" style={{ marginRight: 8 }} />}
          />
        </View>
      </ScrollView>

      <HintDialog
        visible={hintVisible}
        hintText="To miejsce znajduje się blisko Odry, gdzie często spotykają się studenci."
        hintsUsed={hintsUsed}
        newRewardPoints={MOCK_TASK.reward_points - hintsUsed * 20}
        onClose={() => setHintVisible(false)}
      />
    </SafeAreaView>
  );
}
