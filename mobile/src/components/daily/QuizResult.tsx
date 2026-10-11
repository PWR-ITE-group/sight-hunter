import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react-native';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Colors } from '../../constants/colors';

export interface QuizResultItem {
  questionId: string;
  question: string;
  /** Player's answer, or null when unknown (result shown after a reload). */
  answer: string | null;
  correctAnswer: string;
  /** null when the player's pick is unknown (opened later on another device). */
  isCorrect: boolean | null;
}

interface QuizResultProps {
  score: number;
  total: number;
  pointsAwarded: number;
  items: QuizResultItem[];
}

export function QuizResult({ score, total, pointsAwarded, items }: QuizResultProps) {
  const emoji = score === total ? '🎉' : score >= total / 2 ? '👍' : '😅';

  return (
    <ScrollView className="flex-1 bg-paper" contentContainerStyle={{ padding: 16, paddingBottom: 40, alignItems: 'center' }}>
      <Text className="text-4xl mt-4 mb-2">{emoji}</Text>
      <Text className="text-3xl font-bold text-app-text mb-2">Twój wynik</Text>

      <View className="items-center justify-center bg-primary-light w-32 h-32 rounded-full mb-5">
        <Text className="text-4xl font-bold text-primary">
          {score}/{total}
        </Text>
      </View>

      {pointsAwarded > 0 && (
        <View className="mb-6">
          <Badge value={`+${pointsAwarded} pkt`} type="points" size="md" />
        </View>
      )}

      <Card className="w-full" padding={20}>
        <Text className="text-lg font-bold text-app-text mb-4">Podsumowanie</Text>
        <View className="gap-y-3">
          {items.map((item, index) => (
            <View key={item.questionId} className="p-4 bg-paper rounded-xl">
              <View className="flex-row items-start">
                <View className="mr-3 mt-0.5">
                  {item.isCorrect === null ? (
                    <HelpCircle color={Colors.textTertiary} size={22} />
                  ) : item.isCorrect ? (
                    <CheckCircle2 color={Colors.success} size={22} />
                  ) : (
                    <XCircle color={Colors.error} size={22} />
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-text-secondary text-xs font-bold uppercase mb-1">
                    Pytanie {index + 1}
                    {item.isCorrect === null ? '' : item.isCorrect ? ' · Poprawnie' : ' · Niepoprawnie'}
                  </Text>
                  <Text className="text-app-text font-medium mb-2">{item.question}</Text>
                  {item.answer !== null && item.isCorrect === false && (
                    <Text className="text-error text-sm">Twoja odpowiedź: {item.answer}</Text>
                  )}
                  <Text className="text-success text-sm">Poprawna odpowiedź: {item.correctAnswer}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}
