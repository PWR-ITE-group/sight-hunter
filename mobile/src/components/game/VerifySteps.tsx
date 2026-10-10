import React from 'react';
import { View, Text } from 'react-native';
import { MapPin, Camera, Check, X } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { ProgressBar } from '../ui/ProgressBar';

export type VerifyStatus = 'uploading' | 'gps_check' | 'clip_check' | 'accepted' | 'rejected';

export interface VerifyStepsProps {
  status: VerifyStatus;
  gpsProgress?: number;
  clipProgress?: number;
  reason?: 'wrong_place' | 'not_matched' | null;
  wrongPlaceName?: string | null;
}

export function VerifySteps({
  status,
  gpsProgress = 0,
  clipProgress = 0,
  reason,
  wrongPlaceName,
}: VerifyStepsProps) {
  const isGpsDone = status === 'clip_check' || status === 'accepted' || status === 'rejected';

  return (
    <View className="w-full gap-6">
      {/* Крок 1 — GPS */}
      <View className="flex-row items-center gap-4">
        <View className="w-12 h-12 rounded-full bg-primary-light items-center justify-center">
          {isGpsDone ? (
            <Check size={24} color={Colors.success} />
          ) : (
            <MapPin size={24} color={Colors.primary} />
          )}
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-app-text mb-2">
            {isGpsDone ? 'Lokalizacja OK' : 'Sprawdzam lokalizację...'}
          </Text>
          {!isGpsDone && <ProgressBar progress={gpsProgress} />}
        </View>
      </View>

      {/* Крок 2 — CLIP */}
      {(status === 'clip_check' || status === 'accepted' || status === 'rejected') && (
        <View className="flex-row items-center gap-4">
          <View className="w-12 h-12 rounded-full bg-primary-light items-center justify-center">
            {status === 'accepted' ? (
              <Check size={24} color={Colors.success} />
            ) : status === 'rejected' ? (
              <X size={24} color={Colors.error} />
            ) : (
              <Camera size={24} color={Colors.primary} />
            )}
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-app-text mb-2">
              {status === 'accepted'
                ? 'Zdjęcie pasuje'
                : status === 'rejected'
                  ? 'Zdjęcie nie pasuje'
                  : 'Porównuję zdjęcie...'}
            </Text>
            {status === 'clip_check' && <ProgressBar progress={clipProgress} />}
          </View>
        </View>
      )}

      {/* Результат */}
      {status === 'accepted' && (
        <View className="items-center mt-8">
          <View className="w-24 h-24 rounded-full bg-success/20 items-center justify-center mb-4">
            <Check size={48} color={Colors.success} />
          </View>
          <Text className="text-2xl font-bold text-success">Znaleziono!</Text>
        </View>
      )}

      {status === 'rejected' && (
        <View className="items-center mt-8">
          <View className="w-24 h-24 rounded-full bg-error/20 items-center justify-center mb-4">
            <X size={48} color={Colors.error} />
          </View>
          {reason === 'wrong_place' && wrongPlaceName && (
            <>
              <Text className="text-xl font-bold text-error mb-2 text-center">To jest {wrongPlaceName}!</Text>
              <Text className="text-base text-text-secondary text-center">Szukaj dalej...</Text>
            </>
          )}
          {reason === 'not_matched' && (
            <Text className="text-xl font-bold text-error text-center">Nie rozpoznano — spróbuj ponownie</Text>
          )}
        </View>
      )}
    </View>
  );
}
