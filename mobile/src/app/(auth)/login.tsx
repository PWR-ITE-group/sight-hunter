import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { Chip } from '../../components/ui/Chip';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const { mode: initialMode } = useLocalSearchParams();
  const [mode, setMode] = useState(initialMode === 'register' ? 'register' : 'login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const setTokens = useAuthStore(s => s.setTokens);

  const handleSubmit = async () => {
    // MOCK LOGIN
    await setTokens('mock-access-token', 'mock-refresh-token');
    // Root layout will redirect appropriately based on nickname existence
  };

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center' }}>
        <View className="flex-row gap-x-2 mb-8 justify-center">
          <Chip label="Logowanie" selected={mode === 'login'} onPress={() => setMode('login')} />
          <Chip label="Rejestracja" selected={mode === 'register'} onPress={() => setMode('register')} />
        </View>

        <View className="gap-y-4 mb-8">
          <TextInput label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <TextInput label="Hasło" value={password} onChangeText={setPassword} secureTextEntry />
        </View>

        <Button 
          title={mode === 'login' ? "Zaloguj się" : "Zarejestruj się"}
          onPress={handleSubmit}
          variant="primary"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
