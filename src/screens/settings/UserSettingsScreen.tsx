import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../hooks/useCircle';
import { useProfile } from '../../hooks/useProfile';
import { updateDisplayName } from '../../services/profile';

export function UserSettingsScreen() {
  const { session, signOut } = useAuth();
  const navigation = useNavigation();
  const { members } = useCircle();
  const { profile, loading, reload } = useProfile();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const nameInputRef = useRef<TextInput>(null);

  const isAdmin = members.find((m) => m.user_id === session?.user?.id)?.role === 'admin';

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
      <Text style={styles.screenTitle}>Settings</Text>

      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Name</Text>
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
              <Text style={styles.rowValue}>{profile?.display_name ?? ''}</Text>
              <Ionicons name="pencil-outline" size={15} color={theme.colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.rowDivider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValueMuted}>{session?.user?.email ?? ''}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>GOOGLE CALENDAR</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowLabelBlock}>
            <Text style={styles.rowLabel}>Sync appointments</Text>
            <Text style={styles.comingSoon}>Coming soon</Text>
          </View>
          <Switch
            value={false}
            disabled
            trackColor={{ false: theme.colors.disabledBg, true: theme.colors.sage }}
            thumbColor={theme.colors.surfaceElevated}
          />
        </View>
      </View>

      {isAdmin && (
        <>
          <Text style={styles.sectionLabel}>CIRCLE</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('CircleAdmin' as never)}
            >
              <Text style={styles.rowLabel}>Circle settings</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textHairline} />
            </TouchableOpacity>
          </View>
        </>
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutLabel}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

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
});
