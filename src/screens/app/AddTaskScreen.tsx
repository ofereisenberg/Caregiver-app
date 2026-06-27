import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../hooks/useCircle';
import { createTask } from '../../services/tasks';
import { AppStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'AddTask'>;

type ExpandedRow = 'repeat' | 'assign' | 'when' | null;
type RepeatValue = 'every_few_days' | 'weekly' | 'monthly' | null;

const REPEAT_OPTIONS: { label: string; value: RepeatValue }[] = [
  { label: 'Every few days', value: 'every_few_days' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

type TimePickerMode = 'start' | 'end';

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTimeDisplay(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

function makeTodayAt(hour: number): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}

function timeToString(t: Date | null): string | null {
  if (!t) return null;
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:00`;
}

export function AddTaskScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { session } = useAuth();
  const { circle, members } = useCircle();

  const titleRef = useRef<TextInput>(null);
  const [title, setTitle] = useState('');
  const [repeat, setRepeat] = useState<RepeatValue>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [timePickerMode, setTimePickerMode] = useState<TimePickerMode | null>(null);
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

  function handleTimePress(mode: TimePickerMode) {
    const base = mode === 'start' ? (startTime ?? makeTodayAt(9)) : (endTime ?? makeTodayAt(10));
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: base,
        mode: 'time',
        is24Hour: true,
        onChange: (_event, selected) => {
          if (!selected) return;
          if (mode === 'start') setStartTime(selected);
          else setEndTime(selected);
        },
      });
    } else {
      setTimePickerMode(mode);
    }
  }

  function handleIosTimeChange(_event: unknown, selected?: Date) {
    const mode = timePickerMode;
    setTimePickerMode(null);
    if (!selected || !mode) return;
    if (mode === 'start') setStartTime(selected);
    else setEndTime(selected);
  }

  const handleAdd = useCallback(async () => {
    if (!title.trim() || !circle || !session?.user) return;

    setSaving(true);
    setError(null);

    const { error: createError } = await createTask({
      title: title.trim(),
      circle_id: circle.id,
      recurrence: repeat,
      assignee: assigneeId,
      due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
      start_time: timeToString(startTime),
      end_time: timeToString(endTime),
      visibility: onlyMe ? 'private' : 'shared',
      parent_appointment_id: route.params?.parentAppointmentId ?? null,
    });

    setSaving(false);

    if (createError) {
      setError(createError);
    } else {
      navigation.goBack();
    }
  }, [title, circle, session, repeat, assigneeId, dueDate, onlyMe, route.params, navigation]);

  const canAdd = title.trim().length > 0 && !saving;

  return (
    <KeyboardAvoidingView
      style={styles.sheet}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Pull handle */}
      <View style={styles.handle} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>What needs doing?</Text>

        {/* Title input */}
        <TextInput
          ref={titleRef}
          style={styles.titleInput}
          placeholder="Task title"
          placeholderTextColor={theme.colors.textFaint}
          value={title}
          onChangeText={setTitle}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={canAdd ? handleAdd : undefined}
          multiline={false}
        />
        <View style={styles.inputDivider} />

        {/* Repeat row */}
        <TouchableOpacity style={styles.expandRow} onPress={() => toggleRow('repeat')}>
          <Text style={styles.expandRowLabel}>
            <Text style={styles.expandRowPlus}>+ </Text>Repeat
          </Text>
          <Text style={styles.expandRowValue}>
            {repeat
              ? REPEAT_OPTIONS.find((o) => o.value === repeat)?.label ?? 'One-off'
              : 'One-off'}
          </Text>
        </TouchableOpacity>
        {expandedRow === 'repeat' && (
          <View style={styles.chipRow}>
            {REPEAT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, repeat === opt.value && styles.chipSelected]}
                onPress={() => {
                  setRepeat(repeat === opt.value ? null : opt.value);
                  setExpandedRow(null);
                }}
              >
                <Text style={[styles.chipLabel, repeat === opt.value && styles.chipLabelSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.rowDivider} />

        {/* Assign row */}
        <TouchableOpacity style={styles.expandRow} onPress={() => toggleRow('assign')}>
          <Text style={styles.expandRowLabel}>
            <Text style={styles.expandRowPlus}>+ </Text>Assign
          </Text>
          <Text style={styles.expandRowValue}>
            {assigneeId
              ? members.find((m) => m.user_id === assigneeId)?.displayName ?? 'Unassigned'
              : 'Unassigned'}
          </Text>
        </TouchableOpacity>
        {expandedRow === 'assign' && (
          <View style={styles.chipRow}>
            {members.map((member) => {
              const selected = assigneeId === member.user_id;
              return (
                <TouchableOpacity
                  key={member.user_id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => {
                    setAssigneeId(selected ? null : member.user_id);
                    setExpandedRow(null);
                  }}
                >
                  <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                    {member.displayName.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        <View style={styles.rowDivider} />

        {/* When row */}
        <TouchableOpacity style={styles.expandRow} onPress={handleWhenPress}>
          <Text style={styles.expandRowLabel}>
            <Text style={styles.expandRowPlus}>+ </Text>When
          </Text>
          <Text style={styles.expandRowValue}>
            {dueDate ? formatDate(dueDate) : 'No date'}
          </Text>
        </TouchableOpacity>
        {Platform.OS === 'ios' && expandedRow === 'when' && (
          <DateTimePicker
            value={dueDate ?? new Date()}
            mode="date"
            display="inline"
            minimumDate={new Date()}
            onChange={(_event, selected) => {
              if (selected) setDueDate(selected);
            }}
            style={styles.inlinePicker}
          />
        )}
        {dueDate !== null && (
          <View style={styles.timeRangeRow}>
            <TouchableOpacity style={styles.timePill} onPress={() => handleTimePress('start')}>
              <Text style={styles.timePillText}>{startTime ? formatTimeDisplay(startTime) : '–:––'}</Text>
            </TouchableOpacity>
            <Ionicons name="arrow-forward" size={14} color={theme.colors.textMuted} />
            <TouchableOpacity style={styles.timePill} onPress={() => handleTimePress('end')}>
              <Text style={styles.timePillText}>{endTime ? formatTimeDisplay(endTime) : '–:––'}</Text>
            </TouchableOpacity>
            {(startTime !== null || endTime !== null) && (
              <TouchableOpacity onPress={() => { setStartTime(null); setEndTime(null); }} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}
        {Platform.OS === 'ios' && timePickerMode !== null && (
          <DateTimePicker
            value={timePickerMode === 'start' ? (startTime ?? makeTodayAt(9)) : (endTime ?? makeTodayAt(10))}
            mode="time"
            display="spinner"
            minuteInterval={5}
            onChange={handleIosTimeChange}
          />
        )}
        <View style={styles.rowDivider} />

        {/* Only me toggle */}
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Only me</Text>
            <Text style={styles.toggleSubLabel}>Hidden from other circle members</Text>
          </View>
          <Switch
            value={onlyMe}
            onValueChange={setOnlyMe}
            trackColor={{ false: theme.colors.disabledBg, true: theme.colors.sage }}
            thumbColor={theme.colors.surfaceElevated}
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Add button */}
        <TouchableOpacity
          style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={!canAdd}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.surface} />
          ) : (
            <Text style={styles.addButtonLabel}>Add task</Text>
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
  scroll: {
    flex: 1,
  },
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
  expandRowPlus: {
    color: theme.colors.sage,
  },
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
  chipLabelSelected: {
    color: theme.colors.sageDark,
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
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
  inlinePicker: {
    marginBottom: theme.spacing.md,
  },
  timeRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  timePill: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.chip,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.canvas,
  },
  timePillText: {
    fontSize: theme.fontSize.label,
    fontFamily: theme.fontFamily.sansMedium,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
});
