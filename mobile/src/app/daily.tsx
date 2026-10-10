import React, { useState } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { QuizCard } from '../components/daily/QuizCard';
import { QuizResult } from '../components/daily/QuizResult';
import { Button } from '../components/ui/Button';
import Header from '../components/layout/Header';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner, errorMessage } from '../components/ui/ErrorBanner';
import { formatDate } from '../utils/formatters';
import { useDailyGame, useStartDailyGame, useSubmitDailyAnswers } from '../api/hooks/useDailyGame';
import { ApiClientError } from '../api/client';

export default function DailyTab() {
  const game = useDailyGame();
  const startGame = useStartDailyGame();
  const submit = useSubmitDailyAnswers();

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const header = (
    <View className="pt-12 bg-surface border-b border-app-border shadow-sm">
      <Header title="Quiz dnia" showBack />
      <Text className="text-text-secondary text-center pb-3">
        {formatDate(game.data?.date ?? new Date().toISOString())}
      </Text>
    </View>
  );

  // The mini-game is the first feature on the cut list; the API may simply not have it yet.
  const notAvailable = game.error instanceof ApiClientError && game.error.status === 404;

  if (game.isLoading) {
    return (
      <View className="flex-1 bg-white">
        {header}
        <View className="px-6 pt-6">
          <Skeleton className="w-32 h-6 mb-4" />
          <Skeleton className="w-full h-48 rounded-xl mb-4" />
          <Skeleton className="w-full h-16 rounded-xl mb-2" />
          <Skeleton className="w-full h-16 rounded-xl mb-2" />
        </View>
      </View>
    );
  }

  if (notAvailable || (game.data && game.data.questions.length === 0)) {
    return (
      <View className="flex-1 bg-white">
        {header}
        <EmptyState title="Quiz wkrótce" message="Codzienny quiz o historii Wrocławia pojawi się już niedługo. Tymczasem ruszaj w miasto!" />
      </View>
    );
  }

  if (game.error || !game.data) {
    return (
      <View className="flex-1 bg-white">
        {header}
        <View className="p-6">
          <ErrorBanner message={errorMessage(game.error)} onRetry={() => game.refetch()} />
        </View>
      </View>
    );
  }

  const data = game.data;
  const questions = data.questions;

  if (data.played && data.result) {
    const correctByQuestion = new Map(data.result.correct.map((c) => [c.question_id, c.option_index]));
    return (
      <QuizResult
        score={data.result.score}
        total={questions.length}
        pointsAwarded={data.result.points_awarded}
        correct={questions.map((q) => ({
          questionId: q.id,
          optionIndex: answers[q.id] ?? -1,
          isCorrect: answers[q.id] !== undefined && correctByQuestion.get(q.id) === answers[q.id],
        }))}
      />
    );
  }

  const current = questions[currentStep];
  const isAnswered = answers[current.id] !== undefined;
  const isLast = currentStep === questions.length - 1;

  const handleSelect = (index: number) => {
    if (Object.keys(answers).length === 0 && !startGame.isPending) {
      startGame.mutate(undefined, { onError: (e) => setError(errorMessage(e)) });
    }
    setAnswers((prev) => ({ ...prev, [current.id]: index }));
  };

  const handleNext = async () => {
    if (!isLast) {
      setCurrentStep((s) => s + 1);
      return;
    }
    setError(null);
    try {
      await submit.mutateAsync(
        questions.map((q) => ({ question_id: q.id, option_index: answers[q.id] }))
      );
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <View className="flex-1 bg-white">
      {header}
      <ScrollView
        className="flex-1 pt-4"
        refreshControl={<RefreshControl refreshing={game.isRefetching} onRefresh={() => game.refetch()} />}
      >
        {error && (
          <View className="px-6 mb-4">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />
          </View>
        )}
        <View className="px-6 mb-2">
          <Text className="text-text-secondary text-sm font-bold">
            Pytanie {currentStep + 1} z {questions.length}
          </Text>
        </View>

        <QuizCard
          question={{
            id: current.id,
            text: current.text,
            image_url: current.image_url ?? undefined,
            options: current.options.map((text, i) => ({ id: `${current.id}-${i}`, text })),
          }}
          selectedIndex={answers[current.id]}
          onSelect={handleSelect}
        />

        <View className="px-6 py-6">
          <Button
            title={isLast ? 'Sprawdź odpowiedzi' : 'Następne pytanie'}
            onPress={handleNext}
            disabled={!isAnswered}
            loading={submit.isPending}
            variant="primary"
          />
        </View>
      </ScrollView>
    </View>
  );
}
