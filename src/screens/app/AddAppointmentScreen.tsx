import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../hooks/useCircle';
import { getTask } from '../../services/tasks';
import { createAppointment } from '../../services/appointments';
import { AppStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'AddAppointment'>;

const TIME_SLOTS = ['09:00', '10:00', '11:00', '11:30', '14:00', '14:30', '15:00', '16:00'];
const DURATION_OPTIONS: { label: string; minutes: number | null }[] = [
  { label: 'Not set', minutes: null },
  { label: '30 min', minutes: 30 },
  { label: '1 hr', minutes: 60 },
  { label: '1.5 hrs', minutes: 90 },
  { label: '2 hrs', minutes: 120 },
];

function getUpcomingDays(count: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDayChip(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

export function AddAppointmentScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { session } = useAuth();
  const { circle, members } = useCircle();

  const taskId = route.params?.taskId;
  const upcomingDays = getUpcomingDays(7);

  const [title, setTitle] = useState('');
  const [sourceTaskTitle, setSourceTaskTitle] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<'duration' | 'assign' | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from source task if launched via "Make an appointment"
  useEffect(() => {
    if (!taskId) return;
    getTask(taskId).then(({ data }) => {
      if (data) {
        setTitle(data.title);
        setSourceTaskTitle(data.title);
        if (data.assignee) setAssigneeId(data.assignee);
      }
    });
  }, [taskId]);

  function toggleRow(row: 'duration' | 'assign') {
    setExpandedRow((prev) => (prev === row ? null : row));
  }

  const handleAdd = useCallback(async () => {
    if (!title.trim() || !selectedDate || !selectedTime || !circle || !session?.user) return;

    setSaving(true);
    setError(null);

    const [hours, minutes] = selectedTime.split(':').map(Number);
    const startsAt = new Date(selectedDate);
    startsAt.setHours(hours, minutes, 0, 0);

    const { data: appt, error: createError } = await createAppointment({
      title: title.trim(),
      circle_id: circle.id,
      starts_at: startsAt.toISOString(),
      duration_minutes: durationMinutes,
      assignee: assigneeId,
      visibility: 'shared',
    });

    setSaving(false);

    if (createError) {
      setError(createError);
    } else if (appt) {
      navigation.replace('AppointmentDetail', { appointmentId: appt.id });
    }
  }, [title, selectedDate, selectedTime, circle, session, durationMinutes, assigneeId, navigation]);

  const canAdd = title.trim().length > 0 && selectedDate !== null && selectedTime !== null && !saving;

  return (
    <KeyboardAvoidingView style={styles.sheet} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.handle} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Source task banner */}
        {sourceTaskTitle && (
          <View style={styles.sourceBanner}>
            <Text style={styles.sourceBannerLabel}>New appointment</Text>
            <Text style={styles.sourceBannerTask} numberOfLines={1}>from "{sourceTaskTitle}"</Text>
          </View>
        )}

        <Text style={styles.heading}>New appointment</Text>

        <TextInput
          style={styles.titleInput}
          placeholder="Title"
          placeholderTextColor={theme.colors.textFaint}
          value={title}
          onChangeText={setTitle}
          autoFocus={!taskId}
          returnKeyType="done"
          multiline={false}
        />
        <View style={styles.inputDivider} />

        {/* When — date chips */}
        <Text style={styles.whenLabel}>When</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipScrollContent}>
          {upcomingDays.map((day) => {
            const selected = selectedDate !== null && isSameDay(day, selectedDate);
            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setSelectedDate(day)}
              >
                <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                  {formatDayChip(day)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Time chips */}
        <View style={styles.chipRow}>
          {TIME_SLOTS.map((time) => {
            const selected = selectedTime === time;
            return (
              <TouchableOpacity
                key={time}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => setSelectedTime(time)}
              >
                <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>{time}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.rowDivider} />

        {/* Duration */}
        <TouchableOpacity style={styles.expandRow} onPress={() => toggleRow('duration')}>
          <Text style={styles.expandRowLabel}><Text style={styles.expandRowPlus}>+ </Text>Duration</Text>
          <Text style={styles.expandRowValue}>
            {DURATION_OPTIONS.find((o) => o.minutes === durationMinutes)?.label ?? 'Not set'}
          </Text>
        </TouchableOpacity>
        {expandedRow === 'duration' && (
          <View style={styles.chipRow}>
            {DURATION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={String(opt.minutes)}
                style={[styles.chip, durationMinutes === opt.minutes && styles.chipSelected]}
                onPress={() => { setDurationMinutes(opt.minutes); setExpandedRow(null); }}
              >
                <Text style={[styles.chipLabel, durationMinutes === opt.minutes && styles.chipLabelSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.rowDivider} />

        {/* With (assignee) */}
        <TouchableOpacity style={styles.expandRow} onPress={() => toggleRow('assign')}>
          <Text style={styles.expandRowLabel}><Text style={styles.expandRowPlus}>+ </Text>With</Text>
          <Text style={styles.expandRowValue}>
            {assigneeId ? members.find((m) => m.user_id === assigneeId)?.displayName ?? 'Unassigned' : 'Unassigned'}
          </Text>
        </TouchableOpacity>
        {expandedRow === 'assign' && (
          <View style={styles.chipRow}>
            {members.map((m) => (
              <TouchableOpacity
                key={m.user_id}
                style={[styles.chip, assigneeId === m.user_id && styles.chipSelected]}
                onPress={() => { setAssigneeId(assigneeId === m.user_id ? null : m.user_id); setExpandedRow(null); }}
              >
                <Text style={[styles.chipLabel, assigneeId === m.user_id && styles.chipLabelSelected]}>
                  {m.displayName.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={!canAdd}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color={theme.colors.surface} />
            : <Text style={styles.addButtonLabel}>Add appointment</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.borderRadius.modal, borderTopRightRadius: theme.borderRadius.modal },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.borderMid, alignSelf: 'center', marginTop: theme.spacing.md, marginBottom: theme.spacing.sm },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: theme.spacing.screen, paddingBottom: 48 },
  sourceBanner: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, backgroundColor: theme.colors.sageTint, borderRadius: theme.borderRadius.chip, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, marginTop: theme.spacing.md, alignSelf: 'flex-start' },
  sourceBannerLabel: { fontSize: theme.fontSize.small, fontFamily: theme.fontFamily.sansSemiBold, fontWeight: theme.fontWeight.semibold, color: theme.colors.sageDark },
  sourceBannerTask: { fontSize: theme.fontSize.small, fontFamily: theme.fontFamily.sans, color: theme.colors.textSecondary, flexShrink: 1 },
  heading: { fontSize: theme.fontSize.subhead, fontFamily: theme.fontFamily.sansBold, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, marginTop: theme.spacing.lg, marginBottom: theme.spacing.xl },
  titleInput: { fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sans, color: theme.colors.textPrimary, paddingVertical: theme.spacing.sm },
  inputDivider: { height: 1, backgroundColor: theme.colors.border, marginBottom: theme.spacing.lg },
  whenLabel: { fontSize: theme.fontSize.label, fontFamily: theme.fontFamily.sansSemiBold, fontWeight: theme.fontWeight.semibold, color: theme.colors.textSecondary, marginBottom: theme.spacing.md },
  chipScroll: { marginBottom: theme.spacing.sm },
  chipScrollContent: { gap: theme.spacing.sm, paddingBottom: theme.spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  chip: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.borderRadius.chip, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.surface },
  chipSelected: { backgroundColor: theme.colors.sageTint, borderColor: theme.colors.sageLight },
  chipLabel: { fontSize: theme.fontSize.label, fontFamily: theme.fontFamily.sansMedium, fontWeight: theme.fontWeight.medium, color: theme.colors.textSecondary },
  chipLabelSelected: { color: theme.colors.sageDark },
  rowDivider: { height: 1, backgroundColor: theme.colors.divider, marginBottom: theme.spacing.sm },
  expandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.md },
  expandRowLabel: { fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sansSemiBold, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  expandRowPlus: { color: theme.colors.sage },
  expandRowValue: { fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sans, color: theme.colors.textMuted },
  errorText: { fontSize: theme.fontSize.small, fontFamily: theme.fontFamily.sans, color: theme.colors.overdueFg, marginBottom: theme.spacing.md },
  addButton: { backgroundColor: theme.colors.sage, borderRadius: theme.borderRadius.button, paddingVertical: 14, alignItems: 'center', marginTop: theme.spacing.lg, ...theme.shadow.sage },
  addButtonDisabled: { backgroundColor: theme.colors.disabledBg, shadowOpacity: 0, elevation: 0 },
  addButtonLabel: { fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sansBold, fontWeight: theme.fontWeight.bold, color: theme.colors.surface },
});
