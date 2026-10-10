import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView } from 'react-native';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { ErrorBanner, errorMessage } from '../../components/ui/ErrorBanner';
import { useSetNickname } from '../../api/hooks/useMe';
import { ApiClientError } from '../../api/client';
import { validateNickname } from '../../utils/validators';

export default function NicknameScreen() {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const setNicknameMutation = useSetNickname();

  const validation = nickname.length > 0 ? validateNickname(nickname) : null;

  const handleSubmit = async () => {
    const problem = validateNickname(nickname);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    try {
      await setNicknameMutation.mutateAsync(nickname.trim());
      // The auth guard sends the player on once the user has a nickname.
    } catch (e) {
      if (e instanceof ApiClientError && e.code === 'nickname_taken') {
        setError('Ten pseudonim jest już zajęty');
        return;
      }
      setError(errorMessage(e));
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-white px-6 py-12 justify-center">
      <Text className="text-3xl font-bold text-app-text mb-2">Jak masz na imię, łowco?</Text>
      <Text className="text-text-secondary mb-8">Wybierz pseudonim, który zobaczą inni gracze</Text>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} className="mb-4" />}

      <View className="mb-2">
        <TextInput label="Pseudonim" value={nickname} onChangeText={setNickname} error={validation ?? undefined} />
      </View>
      <Text className="text-text-tertiary text-right text-xs mb-8">{nickname.length}/24</Text>

      <Button
        title="Dalej"
        onPress={handleSubmit}
        disabled={nickname.trim().length < 3 || !!validation}
        loading={setNicknameMutation.isPending}
        variant="primary"
      />
    </KeyboardAvoidingView>
  );
}
