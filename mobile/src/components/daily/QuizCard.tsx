import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface QuizOption {
  id: string;
  text: string;
}

interface QuizCardProps {
  question: {
    id: string;
    text: string;
    image_url?: string;
    options: QuizOption[];
  };
  selectedIndex?: number;
  onSelect: (index: number) => void;
}

export function QuizCard({ question, selectedIndex, onSelect }: QuizCardProps) {
  return (
    <Card className="m-4 p-4 items-stretch">
      {question.image_url && (
        <Image 
          source={{ uri: question.image_url }} 
          className="w-full h-[200px] rounded-xl mb-6 bg-border"
          contentFit="cover"
        />
      )}
      
      <Text className="text-xl font-bold text-app-text mb-6 text-center">{question.text}</Text>
      
      <View className="space-y-3 gap-y-3">
        {question.options.map((option, index) => {
          const isSelected = selectedIndex === index;
          return (
            <Button 
              key={option.id}
              title={option.text}
              onPress={() => onSelect(index)}
              variant={isSelected ? 'primary' : 'outline'}
              className="w-full justify-start"
            />
          );
        })}
      </View>
    </Card>
  );
}
