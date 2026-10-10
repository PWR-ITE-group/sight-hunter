import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { Button } from '../../components/ui/Button';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();
  
  return (
    <View className="flex-1 bg-primaryLight items-center justify-center px-6">
      <View className="items-center mb-12">
        <Text className="text-4xl font-bold text-primary mb-2 text-center">Łowcy Historii</Text>
        <Text className="text-lg text-textSecondary text-center">Odkryj historię Wrocławia</Text>
      </View>
      
      <View className="w-full gap-y-4">
        <Button 
          title="Zarejestruj się"
          onPress={() => router.push('/(auth)/login?mode=register')}
          variant="primary"
        />
        <Button 
          title="Zaloguj się"
          onPress={() => router.push('/(auth)/login?mode=login')}
          variant="outline"
        />
      </View>
    </View>
  );
}
