import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Menu, MenuOption, MenuOptions, MenuTrigger } from 'react-native-popup-menu';

import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { FONT_MULTIPLIERS, FONT_SCALE_LABELS, FontScaleKey, useFontScale } from '../../contexts/FontScaleContext';
import { useProfile } from '../../hooks/useProfile';
import { useUserCircles } from '../../hooks/useUserCircles';
import { updateDisplayName, updateRemindersEnabled } from '../../services/profile';
import { ScaledText } from '../../components/ScaledText';

export function UserSettingsScreen() {
  const { session, activeCircleId, switchCircle, signOut } = useAuth();
  const navigation = useNavigation();
  const { profile, loading, reload } = useProfile();
  const { circles, refresh: refreshCircles } = useUserCircles();
  const { scaleKey, setScale } = useFontScale();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [switchingCircleId, setSwitchingCircleId] = useState<string | null>(null);
  const nameInputRef = useRef<TextInput>(null);

  useFocusEffect(
    React.useCallback(() => { refreshCircles(); }, [refreshCircles]),
  );

  async function handleCircleTap(circleId: string) {
    if (circleId !== activeCircleId) {
      setSwitchingCircleId(circleId);
      await switchCircle(circleId);
      setSwitchingCircleId(null);
    }
    navigation.navigate('CircleAdmin' as never);
  }

  function startEditName() {
    setNameInput(profile?.display_name ?? '');
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }

  async function handleSaveName() {
    if (!session?.user?.id || !nameInput.trim()) return;
    setSavingName(true);
    const { error } = await updateDisplayName(session.user.id, nameInput.trim());
    setSavingName(false);
    if (error) {
      Alert.alert('Could not save', error);
    } else {
      setEditingName(false);
      await reload();
    }
  }

  function handleCancelName() {
    setEditingName(false);
  }

  function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.sage} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <ScaledText style={styles.screenTitle}>Settings</ScaledText>

      <ScaledText style={styles.sectionLabel}>ACCOUNT</ScaledText>
      <View style={styles.card}>
        <View style={styles.row}>
          <ScaledText style={styles.rowLabel}>Name</ScaledText>
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                ref={nameInputRef}
                style={styles.nameInput}
                value={nameInput}
                onChangeText={setNameInput}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
              {savingName ? (
                <ActivityIndicator size="small" color={theme.colors.sage} />
              ) : (
                <>
                  <TouchableOpacity onPress={handleSaveName} hitSlop={8}>
                    <Ionicons name="checkmark" size={22} color={theme.colors.sage} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCancelName} hitSlop={8}>
                    <Ionicons name="close" size={22} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <TouchableOpacity style={styles.rowValueRow} onPress={startEditName}>
              <ScaledText style={styles.rowValue}>{profile?.display_name ?? ''}</ScaledText>
              <Ionicons name="pencil-outline" size={15} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.rowDivider} />
        <View style={styles.row}>
          <ScaledText style={styles.rowLabel}>Email</ScaledText>
          <ScaledText style={styles.rowValueMuted}>{session?.user?.email ?? ''}</ScaledText>
        </View>
      </View>

      <ScaledText style={styles.sectionLabel}>TEXT SIZE</ScaledText>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.scaleOptions}>
            {(Object.keys(FONT_MULTIPLIERS) as FontScaleKey[]).map((key) => {
              const active = key === scaleKey;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.scaleChip, active && styles.scaleChipActive]}
                  onPress={() => setScale(key)}
                  activeOpacity={0.75}
                >
                  <ScaledText style={[styles.scaleChipLabel, active && styles.scaleChipLabelActive]}>
                    {FONT_SCALE_LABELS[key]}
                  </ScaledText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <ScaledText style={styles.sectionLabel}>NOTIFICATIONS</ScaledText>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLabelBlock}>
            <ScaledText style={styles.rowLabel}>Reminders</ScaledText>
            <ScaledText style={styles.rowValueMuted}>Notify me before tasks and appointments</ScaledText>
          </View>
          <Switch
            value={profile?.reminders_enabled ?? false}
            onValueChange={async (enabled) => {
              if (session?.user?.id) await updateRemindersEnabled(session.user.id, enabled);
              if (enabled && Platform.OS === 'android') {
                await IntentLauncher.startActivityAsync(
                  IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                  { data: 'package:com.anonymous.caregiverapp' },
                );
              }
              reload();
            }}
            trackColor={{ false: theme.colors.disabledBg, true: theme.colors.sage }}
            thumbColor={theme.colors.surfaceElevated}
          />
        </View>
      </View>

      <ScaledText style={styles.sectionLabel}>GOOGLE CALENDAR</ScaledText>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLabelBlock}>
            <ScaledText style={styles.rowLabel}>Sync appointments</ScaledText>
            <ScaledText style={styles.comingSoon}>Coming soon</ScaledText>
          </View>
          <Switch
            value={false}
            disabled
            trackColor={{ false: theme.colors.disabledBg, true: theme.colors.sage }}
            thumbColor={theme.colors.surfaceElevated}
          />
        </View>
      </View>

      <View style={styles.sectionHeaderRow}>
        <ScaledText style={styles.sectionLabel}>CIRCLES</ScaledText>
        <Menu>
          <MenuTrigger>
            <Ionicons name="add" size={20} color={theme.colors.sage} />
          </MenuTrigger>
          <MenuOptions customStyles={circleMenuStyles}>
            <MenuOption onSelect={() => navigation.navigate('CreateCircle' as never)}>
              <ScaledText style={styles.menuItem}>Create circle</ScaledText>
            </MenuOption>
            <View style={styles.menuDivider} />
            <MenuOption onSelect={() => navigation.navigate('JoinCircle' as never)}>
              <ScaledText style={styles.menuItem}>Join with code</ScaledText>
            </MenuOption>
          </MenuOptions>
        </Menu>
      </View>
      <View style={styles.card}>
        {circles.map((circle, index) => {
          const isActive = circle.id === activeCircleId;
          const isSwitching = switchingCircleId === circle.id;
          return (
            <React.Fragment key={circle.id}>
              {index > 0 && <View style={styles.rowDivider} />}
              <TouchableOpacity
                style={styles.row}
                onPress={() => handleCircleTap(circle.id)}
                disabled={switchingCircleId !== null}
                activeOpacity={0.7}
              >
                <View style={styles.circleRowLeft}>
                  <ScaledText style={[styles.rowLabel, isActive && styles.rowLabelActive]}>
                    {circle.name}
                  </ScaledText>
                  <ScaledText style={styles.memberCount}>
                    {circle.memberCount} {circle.memberCount === 1 ? 'member' : 'members'}
                  </ScaledText>
                </View>
                {isSwitching ? (
                  <ActivityIndicator size="small" color={theme.colors.sage} />
                ) : isActive ? (
                  <Ionicons name="checkmark" size={20} color={theme.colors.sage} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textHairline} />
                )}
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <ScaledText style={styles.signOutLabel}>Sign out</ScaledText>
      </TouchableOpacity>
    </ScrollView>
  );
}

const circleMenuStyles = {
  optionsContainer: {
    width: 200,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden' as const,
  },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.canvas },
  scroll: { paddingHorizontal: theme.spacing.screen, paddingBottom: 60 },
  screenTitle: {
    fontSize: theme.fontSize.title,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    letterSpacing: theme.letterSpacing.tight,
    marginTop: 60,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md + 2,
    minHeight: 52,
  },
  rowLabelBlock: { gap: 2 },
  rowLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textSecondary,
  },
  rowValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  rowValue: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  rowValueMuted: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textMuted,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
    justifyContent: 'flex-end',
  },
  nameInput: {
    flex: 1,
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansSemiBold,
    color: theme.colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.sage,
    paddingVertical: theme.spacing.xs,
    textAlign: 'right',
    marginLeft: theme.spacing.xl,
  },
  comingSoon: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textFaint,
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginHorizontal: theme.spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  menuItem: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansMedium,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.divider,
    marginHorizontal: theme.spacing.md,
  },
  circleRowLeft: {
    gap: 2,
    flex: 1,
  },
  rowLabelActive: {
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  memberCount: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textMuted,
  },
  signOutButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  signOutLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.overdueFg,
  },
  scaleOptions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flex: 1,
  },
  scaleChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.chip,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  scaleChipActive: {
    backgroundColor: theme.colors.sageTint,
    borderColor: theme.colors.sageLight,
  },
  scaleChipLabel: {
    fontSize: theme.fontSize.label,
    fontFamily: theme.fontFamily.sansMedium,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  scaleChipLabelActive: {
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.sageDark,
  },
});
