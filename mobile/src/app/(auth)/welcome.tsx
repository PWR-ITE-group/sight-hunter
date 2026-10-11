import React from 'react';
import { View, Text } from 'react-native';
import { Button } from '../../components/ui/Button';
import { useRouter } from 'expo-router';

export default function WelcomeScreen() {
  const router = useRouter();
  
  return (
    <View className="flex-1 bg-primary-light items-center justify-center px-6">
      <View className="items-center mb-12">
        <Text className="text-4xl font-bold text-primary mb-2 text-center">Sight Hunters</Text>
        <Text className="text-lg text-text-secondary text-center">Odkryj historię Wrocławia</Text>
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
