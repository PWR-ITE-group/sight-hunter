import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProgressBar } from '../ui/ProgressBar';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { Colors } from '../../constants/colors';

export interface VerifyStepsProps {
  status: 'uploading' | 'gps_check' | 'clip_check' | 'accepted' | 'rejected';
  gpsProgress?: number;
  clipProgress?: number;
  reason?: 'wrong_place' | 'not_matched' | null;
  wrongPlaceName?: string | null;
}

export default function VerifySteps({
  status,
  gpsProgress = 0,
  clipProgress = 0,
  reason,
  wrongPlaceName,
}: VerifyStepsProps) {
  // Helpers to determine step states
  const isGpsChecking = status === 'gps_check' || status === 'uploading';
  const isGpsOk = status === 'clip_check' || status === 'accepted' || (status === 'rejected' && reason !== 'wrong_place');
  const isGpsFailed = status === 'rejected' && reason === 'wrong_place';

  const isClipChecking = status === 'clip_check';
  const isClipOk = status === 'accepted';
  const isClipFailed = status === 'rejected' && reason === 'not_matched';

  return (
    <View style={styles.container}>
      
      {/* GPS Step */}
      <View style={styles.stepContainer}>
        {isGpsChecking && (
          <>
            <Text style={styles.stepIcon}>📍</Text>
            <Text style={styles.stepText}>Sprawdzam lokalizację...</Text>
            <View style={styles.progressWrapper}>
              <ProgressBar progress={gpsProgress} animated />
            </View>
          </>
        )}
        {isGpsOk && (
          <Text style={styles.successText}>✅ Lokalizacja OK</Text>
        )}
        {isGpsFailed && (
          <Text style={styles.errorText}>❌ Zła lokalizacja</Text>
        )}
      </View>

      {/* CLIP Step */}
      {(status === 'clip_check' || status === 'accepted' || (status === 'rejected' && reason === 'not_matched')) && (
        <View style={styles.stepContainer}>
          {isClipChecking && (
            <>
              <Text style={styles.stepIcon}>📷</Text>
              <Text style={styles.stepText}>Porównuję zdjęcie...</Text>
              <View style={styles.progressWrapper}>
                <ProgressBar progress={clipProgress} animated />
              </View>
            </>
          )}
          {isClipOk && (
            <Text style={styles.successText}>✅ Zdjęcie OK</Text>
          )}
          {isClipFailed && (
            <Text style={styles.errorText}>❌ Zdjęcie odrzucone</Text>
          )}
        </View>
      )}

      {/* Final Result */}
      {status === 'accepted' && (
        <View style={styles.resultContainer}>
          <View style={[styles.bigIconContainer, { backgroundColor: '#22C55E20' }]}>
            <Text style={styles.bigIcon}>✅</Text>
          </View>
          <Text style={[styles.resultTitle, { color: Colors.success }]}>Znaleziono!</Text>
        </View>
      )}

      {status === 'rejected' && (
        <View style={styles.resultContainer}>
          <View style={[styles.bigIconContainer, { backgroundColor: '#EF444420' }]}>
            <Text style={styles.bigIcon}>❌</Text>
          </View>
          
          {reason === 'wrong_place' && (
            <>
              <Text style={styles.resultTitle}>
                To jest {wrongPlaceName || 'inne miejsce'}!
              </Text>
              <Text style={styles.resultSubtitle}>Szukaj dalej...</Text>
            </>
          )}
          
          {reason === 'not_matched' && (
            <Text style={styles.resultTitle}>Nie rozpoznano — spróbuj ponownie</Text>
          )}
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: Spacing.xl,
  },
  stepContainer: {
    alignItems: 'center',
    width: '100%',
    marginVertical: Spacing.md,
  },
  stepIcon: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  stepText: {
    ...Typography.body,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  progressWrapper: {
    width: '80%',
    maxWidth: 300,
  },
  successText: {
    ...Typography.bodyBold,
    color: Colors.success,
  },
  errorText: {
    ...Typography.bodyBold,
    color: Colors.error,
  },
  resultContainer: {
    alignItems: 'center',
    marginTop: Spacing.xxxl,
  },
  bigIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  bigIcon: {
    fontSize: 80,
  },
  resultTitle: {
    ...Typography.h2,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  resultSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
