import React from 'react';
import { View, Text } from 'react-native';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

interface QuizResultProps {
  score: number;
  total: number;
  pointsAwarded: number;
  correct: { questionId: string; optionIndex: number; isCorrect: boolean }[];
}

export function QuizResult({ score, total, pointsAwarded, correct }: QuizResultProps) {
  return (
    <View className="flex-1 px-4 py-8 items-center bg-surface">
      <Text className="text-3xl font-bold text-app-text mb-2">Twój wynik</Text>
      
      <View className="items-center justify-center bg-primaryLight w-32 h-32 rounded-full mb-6">
        <Text className="text-4xl font-bold text-primary">{score}/{total}</Text>
      </View>
      
      {pointsAwarded > 0 && (
        <View className="mb-8 scale-125">
          <Badge value={`+${pointsAwarded} pkt`} type="points" size="md" />
        </View>
      )}

      <Card className="w-full mt-4 p-4">
        <Text className="text-lg font-bold text-app-text mb-4">Podsumowanie</Text>
        <View className="gap-y-3">
          {correct.map((item, index) => (
            <View key={item.questionId} className="flex-row items-center justify-between p-3 bg-surface rounded-lg">
              <Text className="text-app-text font-medium flex-1">Pytanie {index + 1}</Text>
              {item.isCorrect ? (
                <CheckCircle2 color={Colors.success} size={24} />
              ) : (
                <XCircle color={Colors.error} size={24} />
              )}
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}
