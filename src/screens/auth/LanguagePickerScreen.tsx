import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { theme } from '../../constants/theme';
import { ScaledText } from '../../components/ScaledText';
import { AuthStackParamList } from '../../navigation/types';
import { AppLanguage, resolveDeviceLanguage, setPendingLanguage } from '../../i18n';
import i18n from '../../i18n';

type Props = NativeStackScreenProps<AuthStackParamList, 'LanguagePicker'>;

const LANGUAGE_OPTIONS: { value: AppLanguage; label: string; sublabel: string }[] = [
  { value: 'de', label: 'Deutsch', sublabel: 'German' },
  { value: 'en', label: 'English', sublabel: 'Englisch' },
];

export function LanguagePickerScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<AppLanguage>(resolveDeviceLanguage);

  const handleSelect = async (lang: AppLanguage) => {
    setSelected(lang);
    await i18n.changeLanguage(lang);
    setPendingLanguage(lang);
  };

  const handleContinue = () => {
    navigation.navigate('EnterEmail');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ScaledText style={styles.appName}>Care for Mutti</ScaledText>
        <ScaledText style={styles.heading}>{t('language.screenTitle')}</ScaledText>
      </View>

      <View style={styles.options}>
        {LANGUAGE_OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => handleSelect(opt.value)}
              activeOpacity={0.7}
            >
              <ScaledText style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                {opt.label}
              </ScaledText>
              <ScaledText style={[styles.cardSublabel, isSelected && styles.cardSublabelSelected]}>
                {opt.sublabel}
              </ScaledText>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleContinue} activeOpacity={0.8}>
        <ScaledText style={styles.buttonLabel}>{t('language.continue')}</ScaledText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
    paddingHorizontal: theme.spacing.screen,
    justifyContent: 'center',
    gap: theme.spacing.xxl,
  },
  header: {
    gap: theme.spacing.sm,
  },
  appName: {
    fontFamily: theme.fontFamily.sansBold,
    fontSize: theme.fontSize.title,
    color: theme.colors.textPrimary,
    letterSpacing: theme.letterSpacing.tight,
  },
  heading: {
    fontFamily: theme.fontFamily.sans,
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
  },
  options: {
    gap: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.cardLg,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.xxs,
  },
  cardSelected: {
    borderColor: theme.colors.sage,
    backgroundColor: theme.colors.sageTint,
  },
  cardLabel: {
    fontFamily: theme.fontFamily.sansSemiBold,
    fontSize: theme.fontSize.subhead,
    color: theme.colors.textPrimary,
  },
  cardLabelSelected: {
    color: theme.colors.sageDark,
  },
  cardSublabel: {
    fontFamily: theme.fontFamily.sans,
    fontSize: theme.fontSize.small,
    color: theme.colors.textMuted,
  },
  cardSublabelSelected: {
    color: theme.colors.sage,
  },
  button: {
    backgroundColor: theme.colors.sage,
    borderRadius: theme.borderRadius.button,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadow.sage,
  },
  buttonLabel: {
    fontFamily: theme.fontFamily.sansBold,
    fontSize: theme.fontSize.body,
    color: theme.colors.surface,
  },
});
