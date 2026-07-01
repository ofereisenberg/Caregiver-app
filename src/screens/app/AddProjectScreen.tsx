import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../hooks/useCircle';
import { useExternalContacts } from '../../hooks/useExternalContacts';
import { createProject } from '../../services/projects';
import { ScaledText } from '../../components/ScaledText';
import { AppStackParamList } from '../../navigation/types';
import { toLocalISODate } from '../../utils/dateUtils';
import { PersonSelection, personSelectionToProjectFields, resolvePersonName } from '../../types/PersonSelection';

type Nav = NativeStackNavigationProp<AppStackParamList>;

type ExpandedRow = 'owner' | 'when' | null;

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function AddProjectScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuth();
  const { circle, members } = useCircle();
  const { contacts: externalContacts } = useExternalContacts(circle?.id ?? null);

  const titleRef = useRef<TextInput>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState<PersonSelection>(session?.user.id ? { type: 'user', id: session.user.id } : null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [onlyMe, setOnlyMe] = useState(false);
  const [expandedRow, setExpandedRow] = useState<ExpandedRow>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleRow(row: ExpandedRow) {
    setExpandedRow((prev) => (prev === row ? null : row));
  }

  function handleWhenPress() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: dueDate ?? new Date(),
        mode: 'date',
        minimumDate: new Date(),
        onChange: (_event, selected) => {
          if (selected) setDueDate(selected);
        },
      });
    } else {
      toggleRow('when');
    }
  }

  const handleAdd = useCallback(async () => {
    if (!title.trim() || !circle || !session?.user) return;

    setSaving(true);
    setError(null);

    const { data, error: createError } = await createProject({
      title: title.trim(),
      description: description.trim() || null,
      ...personSelectionToProjectFields(owner),
      due_date: dueDate ? toLocalISODate(dueDate) : null,
      visibility: onlyMe ? 'private' : 'shared',
      circle_id: circle.id,
      status: 'not_started',
    });

    setSaving(false);

    if (createError) {
      setError(createError);
    } else if (data) {
      navigation.replace('ProjectDetail', { projectId: data.id });
    }
  }, [title, description, owner, dueDate, onlyMe, circle, session, navigation]);

  const canAdd = title.trim().length > 0 && !saving;
  const ownerName = resolvePersonName(owner, members, externalContacts);

  return (
    <KeyboardAvoidingView
      style={styles.sheet}
      behavior="padding"
    >
      <View style={styles.handle} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ScaledText style={styles.heading}>New project</ScaledText>

        <TextInput
          ref={titleRef}
          style={styles.titleInput}
          placeholder="Project name"
          placeholderTextColor={theme.colors.textFaint}
          value={title}
          onChangeText={setTitle}
          autoFocus
          returnKeyType="next"
          multiline={false}
        />
        <View style={styles.inputDivider} />

        <TextInput
          style={styles.descInput}
          placeholder="Description (optional)"
          placeholderTextColor={theme.colors.textFaint}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        <View style={styles.inputDivider} />

        {/* Owner row */}
        <TouchableOpacity style={styles.expandRow} onPress={() => toggleRow('owner')}>
          <ScaledText style={styles.expandRowLabel}>
            <ScaledText style={styles.expandRowPlus}>+ </ScaledText>Owner
          </ScaledText>
          <ScaledText style={styles.expandRowValue}>{ownerName}</ScaledText>
        </TouchableOpacity>
        {expandedRow === 'owner' && (
          <View style={styles.chipRow}>
            <TouchableOpacity
              style={[styles.chip, owner === null && styles.chipSelected]}
              onPress={() => { setOwner(null); setExpandedRow(null); }}
            >
              <ScaledText style={[styles.chipLabel, owner === null && styles.chipLabelSelected]}>Unassigned</ScaledText>
            </TouchableOpacity>
            {members.map((member) => {
              const selected = owner?.type === 'user' && owner.id === member.user_id;
              return (
                <TouchableOpacity
                  key={member.user_id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => { setOwner({ type: 'user', id: member.user_id }); setExpandedRow(null); }}
                >
                  <ScaledText style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                    {member.displayName.split(' ')[0]}
                  </ScaledText>
                </TouchableOpacity>
              );
            })}
            {externalContacts.length > 0 && (
              <>
                <View style={styles.chipDivider} />
                {externalContacts.map((c) => {
                  const selected = owner?.type === 'external' && owner.id === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chip, selected && styles.chipExternalSelected]}
                      onPress={() => { setOwner({ type: 'external', id: c.id }); setExpandedRow(null); }}
                    >
                      <ScaledText style={[styles.chipLabel, selected && styles.chipLabelExternalSelected]}>
                        {c.display_name.split(' ')[0]}
                      </ScaledText>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </View>
        )}
        <View style={styles.rowDivider} />

        {/* Due date row */}
        <TouchableOpacity style={styles.expandRow} onPress={handleWhenPress}>
          <ScaledText style={styles.expandRowLabel}>
            <ScaledText style={styles.expandRowPlus}>+ </ScaledText>Due date
          </ScaledText>
          <ScaledText style={styles.expandRowValue}>{dueDate ? formatDate(dueDate) : 'None'}</ScaledText>
        </TouchableOpacity>
        {Platform.OS === 'ios' && expandedRow === 'when' && (
          <DateTimePicker
            value={dueDate ?? new Date()}
            mode="date"
            display="inline"
            minimumDate={new Date()}
            onChange={(_event, selected) => { if (selected) setDueDate(selected); }}
            style={styles.inlinePicker}
          />
        )}
        {dueDate !== null && (
          <TouchableOpacity
            style={styles.clearRow}
            onPress={() => setDueDate(null)}
          >
            <ScaledText style={styles.clearLabel}>Remove date</ScaledText>
          </TouchableOpacity>
        )}
        <View style={styles.rowDivider} />

        {/* Visibility toggle */}
        <View style={styles.toggleRow}>
          <View>
            <ScaledText style={styles.toggleLabel}>Only me</ScaledText>
            <ScaledText style={styles.toggleSubLabel}>Hidden from other circle members</ScaledText>
          </View>
          <Switch
            value={onlyMe}
            onValueChange={setOnlyMe}
            trackColor={{ false: theme.colors.disabledBg, true: theme.colors.sage }}
            thumbColor={theme.colors.surfaceElevated}
          />
        </View>

        {error && <ScaledText style={styles.errorText}>{error}</ScaledText>}

        <TouchableOpacity
          style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={!canAdd}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.surface} />
          ) : (
            <ScaledText style={styles.addButtonLabel}>Create project</ScaledText>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.modal,
    borderTopRightRadius: theme.borderRadius.modal,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderMid,
    alignSelf: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: 48,
  },
  heading: {
    fontSize: theme.fontSize.subhead,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  titleInput: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing.sm,
    minHeight: 36,
  },
  descInput: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing.sm,
    minHeight: 72,
  },
  inputDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.xl,
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
  },
  expandRowLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  expandRowPlus: { color: theme.colors.sage },
  expandRowValue: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textMuted,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.chip,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  chipSelected: {
    backgroundColor: theme.colors.sageTint,
    borderColor: theme.colors.sageLight,
  },
  chipLabel: {
    fontSize: theme.fontSize.label,
    fontFamily: theme.fontFamily.sansMedium,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  chipLabelSelected: { color: theme.colors.sageDark },
  chipExternalSelected: { backgroundColor: theme.colors.externalBg, borderColor: theme.colors.externalFg },
  chipLabelExternalSelected: { color: theme.colors.externalFg },
  chipDivider: { width: '100%' as const, height: 1, backgroundColor: theme.colors.divider, marginVertical: theme.spacing.xs },
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
  },
  inlinePicker: { marginBottom: theme.spacing.md },
  clearRow: { paddingVertical: theme.spacing.sm },
  clearLabel: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.overdueFg,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.lg,
  },
  toggleLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansMedium,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  toggleSubLabel: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textMuted,
  },
  errorText: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.overdueFg,
    marginBottom: theme.spacing.md,
  },
  addButton: {
    backgroundColor: theme.colors.sage,
    borderRadius: theme.borderRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    ...theme.shadow.sage,
  },
  addButtonDisabled: {
    backgroundColor: theme.colors.disabledBg,
    shadowOpacity: 0,
    elevation: 0,
  },
  addButtonLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.surface,
  },
});
