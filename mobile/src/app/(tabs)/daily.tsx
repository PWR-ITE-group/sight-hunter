import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { QuizCard } from '../../components/daily/QuizCard';
import { QuizResult } from '../../components/daily/QuizResult';
import { Button } from '../../components/ui/Button';
import { formatDate } from '../../utils/formatters';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

const MOCK_QUESTIONS = [
  {
    id: 'q1',
    text: 'W którym roku wybudowano Halę Stulecia?',
    image_url: 'https://images.unsplash.com/photo-1627885408713-9a3b680cbf37?q=80&w=1280&auto=format&fit=crop',
    options: [
      { id: 'o1', text: '1911-1913' },
      { id: 'o2', text: '1920-1922' },
      { id: 'o3', text: '1899-1901' },
      { id: 'o4', text: '1935-1937' },
    ]
  },
  {
    id: 'q2',
    text: 'Ile krasnali znajduje się obecnie we Wrocławiu? (stan na 2024)',
    options: [
      { id: 'o1', text: 'Około 100' },
      { id: 'o2', text: 'Ponad 800' },
      { id: 'o3', text: 'Dokładnie 400' },
      { id: 'o4', text: 'Około 250' },
    ]
  }
];

export default function DailyTab() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResult, setShowResult] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      setAnswers({});
      setShowResult(false);
      setCurrentStep(0);
    }, 1500);
  };

  const handleSelect = (index: number) => {
    setAnswers(prev => ({ ...prev, [MOCK_QUESTIONS[currentStep].id]: index }));
  };

  const handleNext = () => {
    if (currentStep < MOCK_QUESTIONS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setShowResult(true);
    }
  };

  if (showResult) {
    const mockResults = MOCK_QUESTIONS.map(q => ({
      questionId: q.id,
      optionIndex: answers[q.id],
      isCorrect: (answers[q.id] || 0) % 2 === 0 // Mock correctness using pure logic
    }));
    const score = mockResults.filter(r => r.isCorrect).length;

    return (
      <QuizResult 
        score={score}
        total={MOCK_QUESTIONS.length}
        pointsAwarded={score * 10}
        correct={mockResults}
      />
    );
  }

  const currentQuestion = MOCK_QUESTIONS[currentStep];
  const isAnswered = answers[currentQuestion.id] !== undefined;

  return (
    <View className="flex-1 bg-background">
      <View className="pt-16 pb-4 px-6 items-center bg-surface border-b border-border shadow-sm">
        <Text className="text-2xl font-bold text-app-text">Quiz dnia</Text>
        <Text className="text-textSecondary">{formatDate(new Date().toISOString())}</Text>
      </View>

      <ScrollView 
        className="flex-1 pt-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View className="px-6">
            <Skeleton className="w-32 h-6 mb-4" />
            <Skeleton className="w-full h-48 rounded-xl mb-4" />
            <Skeleton className="w-full h-16 rounded-xl mb-2" />
            <Skeleton className="w-full h-16 rounded-xl mb-2" />
            <Skeleton className="w-full h-16 rounded-xl mb-2" />
            <Skeleton className="w-full h-16 rounded-xl mb-2" />
          </View>
        ) : MOCK_QUESTIONS.length === 0 ? (
          <EmptyState title="Brak quizu" message="Dzisiaj nie ma żadnego quizu. Wróć jutro!" />
        ) : (
          <>
            <View className="px-6 mb-2">
              <Text className="text-textSecondary text-sm font-bold">Pytanie {currentStep + 1} z {MOCK_QUESTIONS.length}</Text>
            </View>

        <QuizCard 
          question={currentQuestion}
          selectedIndex={answers[currentQuestion.id]}
          onSelect={handleSelect}
        />

            <View className="px-6 py-6">
              <Button 
                title={currentStep === MOCK_QUESTIONS.length - 1 ? "Sprawdź odpowiedzi" : "Następne pytanie"}
                onPress={handleNext}
                disabled={!isAnswered}
                variant="primary"
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
