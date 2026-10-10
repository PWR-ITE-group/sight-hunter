import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'expo-router';

export default function NicknameScreen() {
  const [nickname, setNickname] = useState('');
  const setUser = useAuthStore(s => s.setUser);
  const router = useRouter();

  const handleSubmit = () => {
    setUser({ id: '1', email: 'test@example.com', nickname, points: 0, xp: 0, ref_code: 'REF-123' });
    // Root layout will redirect to (tabs) since user has nickname
  };

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-background px-6 py-12 justify-center">
      <Text className="text-3xl font-bold text-app-text mb-2">Jak masz na imię, łowco?</Text>
      <Text className="text-textSecondary mb-8">Wybierz pseudonim, który zobaczą inni gracze</Text>

      <View className="mb-8">
        <TextInput label="Pseudonim" value={nickname} onChangeText={setNickname} />
      </View>

      <Button 
        title="Dalej"
        onPress={handleSubmit}
        disabled={nickname.length < 3}
        variant="primary"
      />
    </KeyboardAvoidingView>
  );
}
