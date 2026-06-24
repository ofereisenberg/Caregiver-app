import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { AuthStackParamList } from '../../navigation/types';
import {
  CircleMemberWithName,
  createInvite,
  getActiveInvite,
  getCircleMembers,
  getUserCircle,
} from '../../services/circle';

type Props = NativeStackScreenProps<AuthStackParamList, 'InviteManagement'>;

export function InviteManagementScreen(_props: Props) {
  const { session, recheckSetup } = useAuth();
  const [circleId, setCircleId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [members, setMembers] = useState<CircleMemberWithName[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingInvite, setGeneratingInvite] = useState(false);

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    const { data: circle } = await getUserCircle(session.user.id);
    if (!circle) return;
    setCircleId(circle.id);

    const [inviteResult, membersResult] = await Promise.all([
      getActiveInvite(circle.id),
      getCircleMembers(circle.id),
    ]);

    setInviteCode(inviteResult.data?.token ?? null);
    setMembers(membersResult.data);
    setLoading(false);
  }, [session]);

  useEffect(() => { load(); }, [load]);

  const handleGenerateInvite = async () => {
    if (!circleId) return;
    setGeneratingInvite(true);
    const { data } = await createInvite(circleId);
    setInviteCode(data?.token ?? null);
    setGeneratingInvite(false);
  };

  const handleShare = async () => {
    if (!inviteCode) return;
    await Share.share({ message: `Join our care circle! Invite code: ${inviteCode}` });
  };

  const handleDone = async () => {
    await recheckSetup();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.sage} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Invite family members</Text>
        <Text style={styles.subtitle}>
          Share this code with anyone you want in the circle. It's valid for 7 days.
        </Text>
      </View>

      <View style={styles.inviteCard}>
        {inviteCode ? (
          <>
            <Text style={styles.inviteCode}>{inviteCode}</Text>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.8}>
              <Text style={styles.shareButtonLabel}>Share code</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.button, generatingInvite && styles.buttonDisabled]}
            onPress={handleGenerateInvite}
            disabled={generatingInvite}
            activeOpacity={0.8}
          >
            {generatingInvite ? (
              <ActivityIndicator color={theme.colors.surface} />
            ) : (
              <Text style={styles.buttonLabel}>Generate invite code</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {members.length > 0 && (
        <View style={styles.membersSection}>
          <Text style={styles.sectionLabel}>CIRCLE MEMBERS</Text>
          {members.map((m) => (
            <View key={m.user_id} style={styles.memberRow}>
              <Text style={styles.memberName}>{m.displayName || 'Unnamed'}</Text>
              <Text style={styles.memberRole}>{m.role}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.8}>
        <Text style={styles.doneButtonLabel}>Start using the app</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.xxl,
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
    lineHeight: 22,
  },
  inviteCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
    ...theme.shadow.lift,
  },
  inviteCode: {
    fontFamily: theme.fontFamily.sansBold,
    fontSize: 28,
    color: theme.colors.textPrimary,
    letterSpacing: 6,
  },
  shareButton: {
    backgroundColor: theme.colors.sageTint,
    borderRadius: theme.borderRadius.buttonSm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
  },
  shareButtonLabel: {
    fontFamily: theme.fontFamily.sansSemiBold,
    fontSize: theme.fontSize.label,
    color: theme.colors.sageDark,
  },
  button: {
    backgroundColor: theme.colors.sage,
    borderRadius: theme.borderRadius.button,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
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
  membersSection: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  sectionLabel: {
    fontFamily: theme.fontFamily.sansSemiBold,
    fontSize: theme.fontSize.micro,
    color: theme.colors.textMuted,
    letterSpacing: theme.letterSpacing.wide,
    marginBottom: theme.spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.card,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  memberName: {
    fontFamily: theme.fontFamily.sansMedium,
    fontSize: theme.fontSize.body,
    color: theme.colors.textPrimary,
  },
  memberRole: {
    fontFamily: theme.fontFamily.sans,
    fontSize: theme.fontSize.small,
    color: theme.colors.textMuted,
  },
  doneButton: {
    marginTop: 'auto',
    marginBottom: theme.spacing.xl,
    backgroundColor: theme.colors.sage,
    borderRadius: theme.borderRadius.button,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadow.sage,
  },
  doneButtonLabel: {
    fontFamily: theme.fontFamily.sansBold,
    fontSize: theme.fontSize.body,
    color: theme.colors.surface,
  },
});
