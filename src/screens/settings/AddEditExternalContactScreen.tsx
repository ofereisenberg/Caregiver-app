import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../../constants/theme';
import { ScaledText } from '../../components/ScaledText';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../hooks/useCircle';
import {
  createExternalContact,
  updateExternalContact,
  deleteExternalContact,
  getExternalContacts,
} from '../../services/externalContacts';
import { ExternalContact } from '../../types/ExternalContact';
import { AppStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'AddEditExternalContact'>;

export function AddEditExternalContactScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { session } = useAuth();
  const { circle } = useCircle();

  const contactId = route.params?.contactId;
  const isEditMode = !!contactId;

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [existing, setExisting] = useState<ExternalContact | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditMode || !circle) return;
    getExternalContacts(circle.id).then(({ data }) => {
      const contact = data.find((c) => c.id === contactId) ?? null;
      if (contact) {
        setExisting(contact);
        setDisplayName(contact.display_name);
        setEmail(contact.email ?? '');
        setNotes(contact.notes ?? '');
      }
      setLoading(false);
    });
  }, [isEditMode, contactId, circle]);

  const isOwner = !isEditMode || existing?.created_by === session?.user?.id;

  const handleSave = useCallback(async () => {
    if (!displayName.trim() || !circle) return;
    setSaving(true);
    setError(null);

    const input = {
      display_name: displayName.trim(),
      email: email.trim() || null,
      notes: notes.trim() || null,
    };

    const { error: saveError } = isEditMode && contactId
      ? await updateExternalContact(contactId, input)
      : await createExternalContact(circle.id, input);

    setSaving(false);
    if (saveError) {
      setError(saveError);
    } else {
      navigation.goBack();
    }
  }, [displayName, email, notes, circle, isEditMode, contactId, navigation]);

  function handleDelete() {
    if (!contactId) return;
    Alert.alert(
      'Remove contact',
      `Remove ${existing?.display_name ?? 'this contact'} from the circle?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error: deleteError } = await deleteExternalContact(contactId);
            if (deleteError) {
              setError(deleteError);
            } else {
              navigation.goBack();
            }
          },
        },
      ],
    );
  }

  const canSave = displayName.trim().length > 0 && !saving;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.sage} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.sage} />
          <ScaledText style={styles.backLabel}>Circle</ScaledText>
        </TouchableOpacity>

        <ScaledText style={styles.screenTitle}>
          {isEditMode ? 'Edit contact' : 'Add external contact'}
        </ScaledText>

        <ScaledText style={styles.sectionLabel}>NAME</ScaledText>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Full name or role (e.g. Dr. Müller)"
            placeholderTextColor={theme.colors.textFaint}
            value={displayName}
            onChangeText={setDisplayName}
            autoFocus={!isEditMode}
          />
        </View>

        <ScaledText style={styles.sectionLabel}>EMAIL (OPTIONAL)</ScaledText>
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="For future invite to the circle"
            placeholderTextColor={theme.colors.textFaint}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <ScaledText style={styles.sectionLabel}>NOTES (OPTIONAL)</ScaledText>
        <View style={styles.card}>
          <TextInput
            style={[styles.input, styles.notesInput]}
            placeholder="Phone number, availability, etc."
            placeholderTextColor={theme.colors.textFaint}
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        {error && <ScaledText style={styles.errorText}>{error}</ScaledText>}

        <TouchableOpacity
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.surface} />
          ) : (
            <ScaledText style={styles.saveButtonLabel}>
              {isEditMode ? 'Save changes' : 'Add contact'}
            </ScaledText>
          )}
        </TouchableOpacity>

        {isEditMode && isOwner && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <ScaledText style={styles.deleteButtonLabel}>Remove from circle</ScaledText>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.canvas },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: theme.spacing.screen, paddingBottom: 60 },
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
  input: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md + 2,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.overdueFg,
    marginBottom: theme.spacing.md,
  },
  saveButton: {
    backgroundColor: theme.colors.sage,
    borderRadius: theme.borderRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    ...theme.shadow.sage,
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.disabledBg,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.surface,
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  deleteButtonLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.overdueFg,
  },
});
