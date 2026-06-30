import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { theme } from '../../constants/theme';
import { ScaledText } from '../../components/ScaledText';
import { useAuth } from '../../contexts/AuthContext';
import { AuthStackParamList } from '../../navigation/types';
import { sendOtp } from '../../services/auth';

type Props = NativeStackScreenProps<AuthStackParamList, 'EnterEmail'>;

export function EnterEmailScreen({ navigation }: Props) {
  const { setupStage } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Route forward if re-entering this screen mid-setup (e.g. app restart after OTP sent)
  useEffect(() => {
    if (setupStage === 'needs_profile') navigation.navigate('SetupProfile');
    else if (setupStage === 'needs_circle') navigation.navigate('SetupCircle');
    else if (setupStage === 'needs_active_circle') navigation.navigate('SelectCircle');
  }, [setupStage, navigation]);

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: sendError } = await sendOtp(trimmed);
    setLoading(false);
    if (sendError) {
      setError(sendError);
      return;
    }
    navigation.navigate('CheckEmail', { email: trimmed });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ScaledText style={styles.appName}>Care for Mutti</ScaledText>
        <ScaledText style={styles.tagline}>Sign in to your care circle</ScaledText>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor={theme.colors.textMuted}
          value={email}
          onChangeText={(t) => { setEmail(t); setError(null); }}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        {error ? <ScaledText style={styles.error}>{error}</ScaledText> : null}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.surface} />
          ) : (
            <ScaledText style={styles.buttonLabel}>Send sign-in link</ScaledText>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
    paddingHorizontal: theme.spacing.screen,
    justifyContent: 'center',
  },
  header: {
    marginBottom: theme.spacing.xxl,
  },
  appName: {
    fontFamily: theme.fontFamily.sansBold,
    fontSize: theme.fontSize.title,
    color: theme.colors.textPrimary,
    letterSpacing: theme.letterSpacing.tight,
    marginBottom: theme.spacing.xs,
  },
  tagline: {
    fontFamily: theme.fontFamily.sans,
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
  },
  form: {
    gap: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.input,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    fontFamily: theme.fontFamily.sans,
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
  },
  error: {
    fontFamily: theme.fontFamily.sans,
    fontSize: theme.fontSize.small,
    color: theme.colors.overdueFg,
  },
  button: {
    backgroundColor: theme.colors.sage,
    borderRadius: theme.borderRadius.button,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadow.sage,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.disabledBg,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonLabel: {
    fontFamily: theme.fontFamily.sansBold,
    fontSize: theme.fontSize.body,
    color: theme.colors.surface,
  },
});
