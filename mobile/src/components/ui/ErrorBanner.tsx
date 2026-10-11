import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { ApiClientError } from '../../api/client';

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/** Player-facing text for an error: the API already answers in Polish, the rest is generic. */
export function errorMessage(error: unknown, fallback = 'Coś poszło nie tak. Spróbuj ponownie.'): string {
  if (error instanceof ApiClientError) return error.message || fallback;
  if (error instanceof TypeError) return 'Brak połączenia z serwerem.';
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function ErrorBanner({ message, onRetry, onDismiss, className = '' }: ErrorBannerProps) {
  return (
    <View className={`flex-row items-center bg-error rounded-xl px-4 py-3 ${className}`}>
      <Text className="flex-1 text-white text-base">{message}</Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          className="ml-3 px-3 py-1.5 rounded-lg border border-white"
          hitSlop={6}
        >
          <Text className="text-white font-semibold text-sm">Spróbuj ponownie</Text>
        </Pressable>
      )}
      {onDismiss && (
        <Pressable onPress={onDismiss} className="ml-2 p-1" hitSlop={8}>
          <X color="#FFFFFF" size={18} />
        </Pressable>
      )}
    </View>
  );
}

export default ErrorBanner;
