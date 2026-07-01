import { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTranslation } from 'react-i18next';

import { theme } from '../../constants/theme';
import { ScaledText } from '../../components/ScaledText';
import { useAuth } from '../../contexts/AuthContext';
import { AuthStackParamList } from '../../navigation/types';
import { getCurrentUserId, sendOtp, verifyOtp } from '../../services/auth';
import { getUserCircle } from '../../services/circle';
import { getProfile } from '../../services/profile';

type Props = NativeStackScreenProps<AuthStackParamList, 'CheckEmail'>;

export function CheckEmailScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { email } = route.params;
  const { recheckSetup } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (code.trim().length < 6) {
      setError(t('auth.errorEnterCode'));
      return;
    }
    setLoading(true);
    setError(null);

    const { error: verifyError } = await verifyOtp(email, code.trim());
    if (verifyError) {
      setLoading(false);
      setError(t('auth.errorInvalidCode'));
      return;
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      setLoading(false);
      setError(t('common.errorSomethingWrong'));
      return;
    }

    const { data: profile } = await getProfile(userId);
    if (!profile || !profile.display_name) {
      setLoading(false);
      navigation.navigate('SetupProfile');
      return;
    }

    const { data: circle } = await getUserCircle(userId);
    if (!circle) {
      setLoading(false);
      navigation.navigate('SetupCircle');
      return;
    }

    // Returning user — fully set up; trigger transition to app
    await recheckSetup();
    setLoading(false);
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    await sendOtp(email);
    setResending(false);
    setResent(true);
    setTimeout(() => setResent(false), 4000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ScaledText style={styles.title}>{t('auth.checkEmail')}</ScaledText>
        <ScaledText style={styles.subtitle}>
          {t('auth.checkEmailSubtitle', { email })}
        </ScaledText>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="12345678"
          placeholderTextColor={theme.colors.textMuted}
          value={code}
          onChangeText={(t) => { setCode(t); setError(null); }}
          keyboardType="number-pad"
          maxLength={8}
          returnKeyType="done"
          onSubmitEditing={handleVerify}
          autoFocus
        />
        {error ? <ScaledText style={styles.error}>{error}</ScaledText> : null}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.surface} />
          ) : (
            <ScaledText style={styles.buttonLabel}>{t('auth.verify')}</ScaledText>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.resendRow} onPress={handleResend} disabled={resending}>
          {resending ? (
            <ActivityIndicator size="small" color={theme.colors.sage} />
          ) : (
            <ScaledText style={styles.resendText}>
              {resent ? t('auth.resent') : t('auth.resend')}
            </ScaledText>
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
  title: {
    fontFamily: theme.fontFamily.sansBold,
    fontSize: theme.fontSize.title,
    color: theme.colors.textPrimary,
    letterSpacing: theme.letterSpacing.tight,
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    fontFamily: theme.fontFamily.sans,
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  email: {
    fontFamily: theme.fontFamily.sansMedium,
    color: theme.colors.textPrimary,
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
    fontFamily: theme.fontFamily.sansBold,
    fontSize: theme.fontSize.subhead,
    color: theme.colors.textPrimary,
    letterSpacing: theme.letterSpacing.wide,
    textAlign: 'center',
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
  resendRow: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  resendText: {
    fontFamily: theme.fontFamily.sans,
    fontSize: theme.fontSize.body,
    color: theme.colors.sage,
  },
});
