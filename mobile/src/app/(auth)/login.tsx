import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { Chip } from '../../components/ui/Chip';
import { ErrorBanner, errorMessage } from '../../components/ui/ErrorBanner';
import { useLogin, useRegister, usePasswordReset } from '../../api/hooks/useAuth';
import { ApiClientError } from '../../api/client';
import { validateEmail, validatePassword } from '../../utils/validators';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const { mode: initialMode } = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>(initialMode === 'register' ? 'register' : 'login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [refCode, setRefCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const login = useLogin();
  const register = useRegister();
  const passwordReset = usePasswordReset();
  const busy = login.isPending || register.isPending;

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
    setFieldErrors({});
  };

  const handleSubmit = async () => {
    const emailError = validateEmail(email);
    const passwordError = mode === 'register' ? validatePassword(password) : password ? null : 'Podaj hasło';
    setFieldErrors({ email: emailError ?? undefined, password: passwordError ?? undefined });
    if (emailError || passwordError) return;

    setError(null);
    setInfo(null);
    try {
      if (mode === 'login') {
        await login.mutateAsync({ email: email.trim(), password });
      } else {
        await register.mutateAsync({
          email: email.trim(),
          password,
          ...(refCode.trim() ? { ref_code: refCode.trim().toUpperCase() } : {}),
        });
      }
      // The root layout's auth guard moves on to nickname / tabs.
    } catch (e) {
      if (e instanceof ApiClientError && e.code === 'email_taken') {
        switchMode('login');
        setInfo('To konto już istnieje — zaloguj się.');
        return;
      }
      setError(errorMessage(e));
    }
  };

  const handleForgot = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setFieldErrors({ email: emailError });
      return;
    }
    try {
      await passwordReset.mutateAsync(email.trim());
      setInfo('Jeśli konto istnieje, wysłaliśmy link do zmiany hasła.');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-white">
      <ScrollView
        contentContainerStyle={{ padding: 24, flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row gap-x-2 mb-8 justify-center">
          <Chip label="Logowanie" selected={mode === 'login'} onPress={() => switchMode('login')} />
          <Chip label="Rejestracja" selected={mode === 'register'} onPress={() => switchMode('register')} />
        </View>

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} className="mb-4" />}
        {info && (
          <View className="bg-primary-light rounded-xl px-4 py-3 mb-4">
            <Text className="text-primary">{info}</Text>
          </View>
        )}

        <View className="mb-4">
          <TextInput
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            error={fieldErrors.email}
          />
          <TextInput
            label="Hasło"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={fieldErrors.password}
          />
          {mode === 'register' && (
            <TextInput label="Kod polecenia (opcjonalnie)" value={refCode} onChangeText={setRefCode} />
          )}
        </View>

        <Button
          title={mode === 'login' ? 'Zaloguj się' : 'Zarejestruj się'}
          onPress={handleSubmit}
          loading={busy}
          variant="primary"
        />

        {mode === 'login' && (
          <Pressable onPress={handleForgot} className="mt-6 items-center" disabled={passwordReset.isPending}>
            <Text className="text-text-secondary">Zapomniałeś hasła?</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
