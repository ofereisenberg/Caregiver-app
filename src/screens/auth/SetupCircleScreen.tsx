import { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useTranslation } from 'react-i18next';

import { theme } from '../../constants/theme';
import { ScaledText } from '../../components/ScaledText';
import { useAuth } from '../../contexts/AuthContext';
import { AuthStackParamList } from '../../navigation/types';
import { createCareCircle, joinCircleWithToken } from '../../services/circle';

type Props = NativeStackScreenProps<AuthStackParamList, 'SetupCircle'>;
type Tab = 'create' | 'join';

export function SetupCircleScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { recheckSetup } = useAuth();
  const [tab, setTab] = useState<Tab>('create');
  const [circleName, setCircleName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
  };

  const handleCreate = async () => {
    const name = circleName.trim();
    if (!name) {
      setError(t('auth.errorCircleName'));
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: createError } = await createCareCircle(name);
    setLoading(false);
    if (createError || !data) {
      setError(createError ?? t('auth.errorCreateCircle'));
      return;
    }
    navigation.navigate('InviteManagement');
  };

  const handleJoin = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      setError(t('auth.errorEnterInviteCode'));
      return;
    }
    setLoading(true);
    setError(null);
    const { error: joinError } = await joinCircleWithToken(code);
    setLoading(false);
    if (joinError) {
      setError(joinError);
      return;
    }
    await recheckSetup();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ScaledText style={styles.title}>{t('auth.setupCircleTitle')}</ScaledText>
        <ScaledText style={styles.subtitle}>{t('auth.setupCircleSubtitle')}</ScaledText>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'create' && styles.tabActive]}
          onPress={() => switchTab('create')}
          activeOpacity={0.8}
        >
          <ScaledText style={[styles.tabLabel, tab === 'create' && styles.tabLabelActive]}>{t('auth.tabCreate')}</ScaledText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'join' && styles.tabActive]}
          onPress={() => switchTab('join')}
          activeOpacity={0.8}
        >
          <ScaledText style={[styles.tabLabel, tab === 'join' && styles.tabLabelActive]}>{t('auth.tabJoin')}</ScaledText>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        {tab === 'create' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder={t('auth.circleNamePlaceholder')}
              placeholderTextColor={theme.colors.textMuted}
              value={circleName}
              onChangeText={(t) => { setCircleName(t); setError(null); }}
              autoCapitalize="sentences"
              returnKeyType="done"
              onSubmitEditing={handleCreate}
              autoFocus
            />
            {error ? <ScaledText style={styles.error}>{error}</ScaledText> : null}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.surface} />
              ) : (
                <ScaledText style={styles.buttonLabel}>{t('auth.createCircleButton')}</ScaledText>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={[styles.input, styles.inputCode]}
              placeholder={t('auth.inviteCodePlaceholder')}
              placeholderTextColor={theme.colors.textMuted}
              value={inviteCode}
              onChangeText={(t) => { setInviteCode(t); setError(null); }}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleJoin}
              autoFocus
            />
            {error ? <ScaledText style={styles.error}>{error}</ScaledText> : null}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleJoin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.surface} />
              ) : (
                <ScaledText style={styles.buttonLabel}>{t('auth.joinCircle')}</ScaledText>
              )}
            </TouchableOpacity>
          </>
        )}
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
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontFamily: theme.fontFamily.sansBold,
    fontSize: theme.fontSize.title,
    color: theme.colors.textPrimary,
    letterSpacing: theme.letterSpacing.tight,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontFamily: theme.fontFamily.sans,
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.chip,
    padding: 3,
    marginBottom: theme.spacing.xl,
    ...theme.shadow.lift,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    borderRadius: theme.borderRadius.chip - 1,
  },
  tabActive: {
    backgroundColor: theme.colors.surfaceElevated,
    ...theme.shadow.lift,
  },
  tabLabel: {
    fontFamily: theme.fontFamily.sansSemiBold,
    fontSize: theme.fontSize.label,
    color: theme.colors.textMuted,
  },
  tabLabelActive: {
    color: theme.colors.sageDark,
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
  inputCode: {
    fontFamily: theme.fontFamily.sansBold,
    fontSize: theme.fontSize.subhead,
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
});
