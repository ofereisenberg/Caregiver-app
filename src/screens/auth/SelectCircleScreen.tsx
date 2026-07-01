import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';

import { theme } from '../../constants/theme';
import { ScaledText } from '../../components/ScaledText';
import { useAuth } from '../../contexts/AuthContext';
import { getUserCircles } from '../../services/circle';
import { Tables } from '../../types/database';

type CareCircle = Tables<'care_circle'>;

export function SelectCircleScreen() {
  const { t } = useTranslation();
  const { session, switchCircle, recheckSetup } = useAuth();
  const [circles, setCircles] = useState<CareCircle[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user.id) return;
    getUserCircles(session.user.id).then(({ data }) => {
      setCircles(data);
      setLoading(false);
    });
  }, [session?.user.id]);

  async function handleSelect(circleId: string) {
    setSwitching(circleId);
    await switchCircle(circleId);
    await recheckSetup();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ScaledText style={styles.title}>{t('auth.selectCircleTitle')}</ScaledText>
        <ScaledText style={styles.subtitle}>{t('auth.selectCircleSubtitle')}</ScaledText>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.sage} />
      ) : (
        <View style={styles.list}>
          {circles.map((circle) => (
            <TouchableOpacity
              key={circle.id}
              style={styles.row}
              onPress={() => handleSelect(circle.id)}
              disabled={switching !== null}
              activeOpacity={0.7}
            >
              <ScaledText style={styles.rowLabel}>{circle.name}</ScaledText>
              {switching === circle.id ? (
                <ActivityIndicator size="small" color={theme.colors.sage} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textHairline} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
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
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontFamily: theme.fontFamily.sans,
    fontSize: theme.fontSize.body,
    color: theme.colors.textSecondary,
  },
  list: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md + 2,
    minHeight: 52,
  },
  rowLabel: {
    fontFamily: theme.fontFamily.sans,
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
  },
});
