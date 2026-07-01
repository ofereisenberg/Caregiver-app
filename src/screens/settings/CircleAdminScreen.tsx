import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { theme } from '../../constants/theme';
import { ScaledText } from '../../components/ScaledText';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../hooks/useCircle';
import { useExternalContacts } from '../../hooks/useExternalContacts';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
}

export function CircleAdminScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { session } = useAuth();
  const { circle, members, loading } = useCircle();
  const { contacts } = useExternalContacts(circle?.id ?? null);
  const { t } = useTranslation();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.sage} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={20} color={theme.colors.sage} />
        <ScaledText style={styles.backLabel}>{t('settings.screenTitle')}</ScaledText>
      </TouchableOpacity>

      <ScaledText style={styles.screenTitle}>{circle?.name ?? t('circleAdmin.defaultName')}</ScaledText>

      <ScaledText style={styles.sectionLabel}>{t('circleAdmin.membersSection')}</ScaledText>
      <View style={styles.card}>
        {members.map((m, index) => {
          const isSelf = m.user_id === session?.user?.id;
          return (
            <React.Fragment key={m.user_id}>
              <View style={styles.memberRow}>
                <View style={[styles.avatar, isSelf && styles.avatarSelf]}>
                  <Text style={[styles.avatarText, isSelf && styles.avatarTextSelf]}>
                    {initials(m.displayName)}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <ScaledText style={styles.memberName}>
                    {m.displayName || t('circleAdmin.unnamed')}{isSelf ? ` (${t('circleAdmin.you')})` : ''}
                  </ScaledText>
                  <ScaledText style={styles.memberRole}>
                    {m.role === 'admin' ? t('circleAdmin.roleAdmin') : t('circleAdmin.roleMember')}
                  </ScaledText>
                </View>
              </View>
              {index < members.length - 1 && <View style={styles.rowDivider} />}
            </React.Fragment>
          );
        })}
      </View>

      <ScaledText style={styles.sectionLabel}>{t('circleAdmin.externalContactsSection')}</ScaledText>
      <View style={styles.card}>
        {contacts.map((contact, index) => (
          <React.Fragment key={contact.id}>
            <TouchableOpacity
              style={styles.memberRow}
              onPress={() => navigation.navigate('AddEditExternalContact', { contactId: contact.id })}
            >
              <View style={[styles.avatar, styles.avatarExternal]}>
                <Text style={[styles.avatarText, styles.avatarTextExternal]}>
                  {initials(contact.display_name)}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <ScaledText style={styles.memberName}>{contact.display_name}</ScaledText>
                {contact.email ? (
                  <ScaledText style={styles.memberRole}>{contact.email}</ScaledText>
                ) : (
                  <ScaledText style={styles.memberRole}>{t('circleAdmin.external')}</ScaledText>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textHairline} />
            </TouchableOpacity>
            {index < contacts.length - 1 && <View style={styles.rowDivider} />}
          </React.Fragment>
        ))}
        {contacts.length > 0 && <View style={styles.rowDivider} />}
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('AddEditExternalContact' as never)}
        >
          <ScaledText style={[styles.rowLabel, styles.addLabel]}>{t('circleAdmin.addExternalContact')}</ScaledText>
        </TouchableOpacity>
      </View>

      <ScaledText style={styles.sectionLabel}>{t('circleAdmin.invitesSection')}</ScaledText>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('InviteManagement' as never)}
        >
          <ScaledText style={styles.rowLabel}>{t('circleAdmin.manageInvites')}</ScaledText>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textHairline} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.canvas },
  scroll: { paddingHorizontal: theme.spacing.screen, paddingBottom: 60 },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: theme.spacing.sm,
    gap: 2,
  },
  backLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.sage,
  },
  screenTitle: {
    fontSize: theme.fontSize.title,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    letterSpacing: theme.letterSpacing.tight,
    marginBottom: theme.spacing.xl,
  },
  sectionLabel: {
    fontSize: theme.fontSize.micro,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
    letterSpacing: theme.letterSpacing.wide,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.card,
    marginBottom: theme.spacing.xl,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: theme.borderRadius.avatar,
    backgroundColor: theme.colors.sageTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelf: { backgroundColor: theme.colors.sage },
  avatarExternal: { backgroundColor: theme.colors.externalBg },
  avatarText: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.sageDark,
  },
  avatarTextSelf: { color: theme.colors.surface },
  avatarTextExternal: { color: theme.colors.externalFg },
  memberInfo: { flex: 1 },
  memberName: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansMedium,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  memberRole: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textMuted,
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginHorizontal: theme.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md + 2,
  },
  rowLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textSecondary,
  },
  addLabel: {
    color: theme.colors.sage,
  },
});
