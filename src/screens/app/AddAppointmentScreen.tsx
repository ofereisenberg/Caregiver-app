import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../hooks/useCircle';
import { useProjectList } from '../../hooks/useProjectList';
import { useVacations } from '../../hooks/useVacations';
import { getTask } from '../../services/tasks';
import { createAppointment, getAppointment, updateAppointment } from '../../services/appointments';
import { ReminderPicker } from '../../components/ReminderPicker';
import { ScaledText } from '../../components/ScaledText';
import { AppStackParamList } from '../../navigation/types';
import { toLocalISODate } from '../../utils/dateUtils';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'AddAppointment'>;
type PickerMode = 'start-date' | 'end-date' | 'start-time' | 'end-time';
type ExpandedRow = 'location' | 'repeat' | 'assign' | 'project' | 'reminder';

const RECURRENCE_OPTIONS: { label: string; value: string | null }[] = [
  { label: "Don't repeat", value: null },
  { label: 'Every day', value: 'daily' },
  { label: 'Every week', value: 'weekly' },
  { label: 'Every month', value: 'monthly' },
  { label: 'Every year', value: 'yearly' },
];

function getInitialStart(dateParam?: string): Date {
  const d = dateParam ? new Date(dateParam + 'T00:00:00') : new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

function formatDateDisplay(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTimeDisplay(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function AddAppointmentScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { session } = useAuth();
  const { circle, members } = useCircle();
  const { projects } = useProjectList(circle?.id ?? null);

  const taskId = route.params?.taskId;
  const dateParam = route.params?.date;
  const appointmentId = route.params?.appointmentId;
  const isEditMode = !!appointmentId;

  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [sourceTaskTitle, setSourceTaskTitle] = useState<string | null>(null);
  const [isFullDay, setIsFullDay] = useState(false);
  const [startDate, setStartDate] = useState<Date>(() => getInitialStart(dateParam));
  const [endDate, setEndDate] = useState<Date>(() => {
    const s = getInitialStart(dateParam);
    s.setHours(s.getHours() + 1);
    return s;
  });
  const [pickerMode, setPickerMode] = useState<PickerMode | null>(null);
  const [location, setLocation] = useState('');
  const [recurrence, setRecurrence] = useState<string | null>(null);
  const [inviteeIds, setInviteeIds] = useState<string[]>(() => session?.user.id ? [session.user.id] : []);
  const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<'shared' | 'private'>('shared');
  const [projectId, setProjectId] = useState<string | null>(route.params?.projectId ?? null);
  const [expandedRow, setExpandedRow] = useState<ExpandedRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locationInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!taskId) return;
    getTask(taskId).then(({ data }) => {
      if (data) {
        setTitle(data.title);
        setSourceTaskTitle(data.title);
        if (data.assignee) setInviteeIds([data.assignee]);
      }
    });
  }, [taskId]);

  useEffect(() => {
    if (!appointmentId) return;
    getAppointment(appointmentId).then(({ data }) => {
      if (!data) return;
      setTitle(data.title);
      setDetails(data.details ?? '');
      setIsFullDay(data.is_full_day);
      setStartDate(new Date(data.starts_at));
      if (data.ends_at) setEndDate(new Date(data.ends_at));
      setLocation(data.location ?? '');
      setRecurrence(data.recurrence ?? null);
      setInviteeIds(data.invitee_ids);
      setReminderOffsetMinutes(data.reminder_offset_minutes ?? null);
      setVisibility(data.visibility ?? 'shared');
    });
  }, [appointmentId]);

  function handlePickerChange(_event: DateTimePickerChangeEvent, date: Date) {
    setPickerMode(null); // Android auto-dismisses; this cleans up for both platforms

    switch (pickerMode) {
      case 'start-date': {
        const next = new Date(startDate);
        next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        setStartDate(next);
        // Push end date forward if it's now before start
        if (endDate < next) {
          const nextEnd = new Date(endDate);
          nextEnd.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
          setEndDate(nextEnd);
        }
        break;
      }
      case 'end-date': {
        const next = new Date(endDate);
        next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        if (next >= startDate) setEndDate(next);
        break;
      }
      case 'start-time': {
        const next = new Date(startDate);
        next.setHours(date.getHours(), date.getMinutes(), 0, 0);
        setStartDate(next);
        // Auto-push end time forward if it's now <= start
        if (endDate <= next) {
          const nextEnd = new Date(next);
          nextEnd.setHours(nextEnd.getHours() + 1);
          setEndDate(nextEnd);
        }
        break;
      }
      case 'end-time': {
        const next = new Date(endDate);
        next.setHours(date.getHours(), date.getMinutes(), 0, 0);
        if (next > startDate) setEndDate(next);
        break;
      }
    }
  }

  function toggleRow(row: ExpandedRow) {
    const next = expandedRow === row ? null : row;
    setExpandedRow(next);
    if (next === 'location') {
      setTimeout(() => locationInputRef.current?.focus(), 100);
    }
  }

  const handleAdd = useCallback(async () => {
    if (!title.trim() || !circle || !session?.user) return;
    if (!isFullDay && endDate <= startDate) return;

    setSaving(true);
    setError(null);

    let startsAt: Date;
    let endsAt: Date;

    if (isFullDay) {
      startsAt = new Date(startDate);
      startsAt.setHours(0, 0, 0, 0);
      endsAt = new Date(endDate);
      endsAt.setHours(23, 59, 59, 999);
    } else {
      startsAt = new Date(startDate);
      endsAt = new Date(endDate);
    }

    if (isEditMode && appointmentId) {
      const { error: updateError } = await updateAppointment(appointmentId, {
        title: title.trim(),
        details: details.trim() || null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        is_full_day: isFullDay,
        location: location.trim() || null,
        recurrence,
        visibility,
        reminder_offset_minutes: reminderOffsetMinutes,
      }, inviteeIds);
      setSaving(false);
      if (updateError) {
        setError(updateError);
      } else {
        navigation.goBack();
      }
    } else {
      const { data: appt, error: createError } = await createAppointment({
        title: title.trim(),
        details: details.trim() || null,
        circle_id: circle.id,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        is_full_day: isFullDay,
        location: location.trim() || null,
        recurrence,
        visibility,
        project_id: projectId,
        reminder_offset_minutes: reminderOffsetMinutes,
      }, inviteeIds);
      setSaving(false);
      if (createError) {
        setError(createError);
      } else if (appt) {
        navigation.replace('AppointmentDetail', { appointmentId: appt.id });
      }
    }
  }, [title, details, isFullDay, startDate, endDate, location, recurrence, inviteeIds, visibility, reminderOffsetMinutes, circle, session, navigation, isEditMode, appointmentId]);

  const { vacations } = useVacations(circle?.id ?? null);

  const vacationWarning = useMemo(() => {
    if (inviteeIds.length === 0) return null;
    const startDateKey = toLocalISODate(startDate);
    const onVacation = vacations.find(
      (v) => inviteeIds.includes(v.user_id) && v.start_date <= startDateKey && v.end_date >= startDateKey,
    );
    if (!onVacation) return null;
    const name = members.find((m) => m.user_id === onVacation.user_id)?.displayName ?? 'Assignee';
    return `⚠️ ${name} is on vacation on this date`;
  }, [inviteeIds, startDate, vacations, members]);

  const canAdd = title.trim().length > 0 && (isFullDay || endDate > startDate) && !saving;

  const recurrenceLabel = RECURRENCE_OPTIONS.find((o) => o.value === recurrence)?.label ?? "Don't repeat";
  const inviteeLabel = inviteeIds.length === 0
    ? 'Nobody'
    : inviteeIds
        .map((id) => members.find((m) => m.user_id === id)?.displayName.split(' ')[0] ?? id)
        .join(', ');

  const pickerValue = pickerMode === 'start-date' || pickerMode === 'start-time' ? startDate : endDate;

  return (
    <KeyboardAvoidingView style={styles.sheet} behavior="padding">
      <View style={styles.handle} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {sourceTaskTitle && (
          <View style={styles.sourceBanner}>
            <ScaledText style={styles.sourceBannerLabel}>New appointment</ScaledText>
            <ScaledText style={styles.sourceBannerTask} numberOfLines={1}>from "{sourceTaskTitle}"</ScaledText>
          </View>
        )}

        <ScaledText style={styles.heading}>{isEditMode ? 'Edit appointment' : 'New appointment'}</ScaledText>

        {/* Title */}
        <TextInput
          style={styles.titleInput}
          placeholder="Title"
          placeholderTextColor={theme.colors.textFaint}
          value={title}
          onChangeText={setTitle}
          autoFocus={!taskId}
          returnKeyType="next"
          multiline={false}
        />
        <View style={styles.inputDivider} />
        <TextInput
          style={styles.detailsInput}
          placeholder="Notes"
          placeholderTextColor={theme.colors.textFaint}
          value={details}
          onChangeText={setDetails}
          multiline
          returnKeyType="default"
          textAlignVertical="top"
        />
        <View style={styles.inputDivider} />

        {/* Date / time card — Google Calendar style */}
        <View style={styles.dateTimeCard}>
          {/* All day toggle */}
          <View style={styles.allDayRow}>
            <Ionicons name="time-outline" size={18} color={theme.colors.textMuted} />
            <ScaledText style={styles.allDayLabel}>All day</ScaledText>
            <Switch
              value={isFullDay}
              onValueChange={setIsFullDay}
              trackColor={{ false: theme.colors.borderMid, true: theme.colors.sage }}
              thumbColor={theme.colors.surface}
            />
          </View>

          <View style={styles.cardDivider} />

          {/* Start → End */}
          <View style={styles.dateTimeRow}>
            {/* Start */}
            <View style={styles.dateTimeCol}>
              <TouchableOpacity onPress={() => setPickerMode('start-date')}>
                <ScaledText style={styles.pickerDate}>{formatDateDisplay(startDate)}</ScaledText>
              </TouchableOpacity>
              {!isFullDay && (
                <TouchableOpacity onPress={() => setPickerMode('start-time')}>
                  <ScaledText style={styles.pickerTime}>{formatTimeDisplay(startDate)}</ScaledText>
                </TouchableOpacity>
              )}
            </View>

            <Ionicons name="arrow-forward" size={16} color={theme.colors.textMuted} style={styles.arrowIcon} />

            {/* End */}
            <View style={styles.dateTimeCol}>
              <TouchableOpacity onPress={() => setPickerMode('end-date')}>
                <ScaledText style={styles.pickerDate}>{formatDateDisplay(endDate)}</ScaledText>
              </TouchableOpacity>
              {!isFullDay && (
                <TouchableOpacity onPress={() => setPickerMode('end-time')}>
                  <ScaledText style={styles.pickerTime}>{formatTimeDisplay(endDate)}</ScaledText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View style={styles.rowDivider} />

        {/* Location */}
        <TouchableOpacity style={styles.expandRow} onPress={() => toggleRow('location')}>
          <ScaledText style={styles.expandRowLabel}>
            <ScaledText style={styles.expandRowPlus}>+ </ScaledText>Location
          </ScaledText>
          {location.length > 0 && (
            <ScaledText style={styles.expandRowValue} numberOfLines={1}>{location}</ScaledText>
          )}
        </TouchableOpacity>
        {expandedRow === 'location' && (
          <TextInput
            ref={locationInputRef}
            style={styles.locationInput}
            placeholder="Address or place name"
            placeholderTextColor={theme.colors.textFaint}
            value={location}
            onChangeText={setLocation}
            returnKeyType="done"
            onSubmitEditing={() => setExpandedRow(null)}
          />
        )}
        <View style={styles.rowDivider} />

        {/* Repeat */}
        <TouchableOpacity style={styles.expandRow} onPress={() => toggleRow('repeat')}>
          <ScaledText style={styles.expandRowLabel}>
            <ScaledText style={styles.expandRowPlus}>+ </ScaledText>Repeat
          </ScaledText>
          <ScaledText style={styles.expandRowValue}>{recurrenceLabel}</ScaledText>
        </TouchableOpacity>
        {expandedRow === 'repeat' && (
          <View style={styles.optionList}>
            {RECURRENCE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={String(opt.value)}
                style={[styles.optionRow, recurrence === opt.value && styles.optionRowSelected]}
                onPress={() => { setRecurrence(opt.value); setExpandedRow(null); }}
              >
                <ScaledText style={[styles.optionLabel, recurrence === opt.value && styles.optionLabelSelected]}>
                  {opt.label}
                </ScaledText>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.rowDivider} />

        {/* With (assignee) */}
        <TouchableOpacity style={styles.expandRow} onPress={() => toggleRow('assign')}>
          <ScaledText style={styles.expandRowLabel}>
            <ScaledText style={styles.expandRowPlus}>+ </ScaledText>With
          </ScaledText>
          <ScaledText style={styles.expandRowValue}>{inviteeLabel}</ScaledText>
        </TouchableOpacity>
        {expandedRow === 'assign' && (
          <View style={styles.chipRow}>
            {members.map((m) => {
              const selected = inviteeIds.includes(m.user_id);
              return (
                <TouchableOpacity
                  key={m.user_id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setInviteeIds(
                    selected
                      ? inviteeIds.filter((id) => id !== m.user_id)
                      : [...inviteeIds, m.user_id]
                  )}
                >
                  <ScaledText style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                    {m.displayName.split(' ')[0]}
                  </ScaledText>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.rowDivider} />
        <ReminderPicker
          value={reminderOffsetMinutes}
          onChange={setReminderOffsetMinutes}
          isExpanded={expandedRow === 'reminder'}
          onToggle={() => toggleRow('reminder')}
        />

        <View style={styles.rowDivider} />
        <View style={styles.visibilityRow}>
          <ScaledText style={styles.expandRowLabel}>Only me</ScaledText>
          <Switch
            value={visibility === 'private'}
            onValueChange={(v) => setVisibility(v ? 'private' : 'shared')}
            trackColor={{ false: theme.colors.borderMid, true: theme.colors.sage }}
            thumbColor={theme.colors.surface}
          />
        </View>

        {/* Link to project */}
        {projects.length > 0 && (
          <>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.expandRow} onPress={() => toggleRow('project')}>
              <ScaledText style={styles.expandRowLabel}>
                <ScaledText style={styles.expandRowPlus}>+ </ScaledText>Project
              </ScaledText>
              <ScaledText style={styles.expandRowValue}>
                {projectId ? (projects.find((p) => p.id === projectId)?.title ?? 'None') : 'None'}
              </ScaledText>
            </TouchableOpacity>
            {expandedRow === 'project' && (
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, projectId === null && styles.chipSelected]}
                  onPress={() => { setProjectId(null); setExpandedRow(null); }}
                >
                  <ScaledText style={[styles.chipLabel, projectId === null && styles.chipLabelSelected]}>None</ScaledText>
                </TouchableOpacity>
                {projects.filter((p) => p.status !== 'done').map((proj) => (
                  <TouchableOpacity
                    key={proj.id}
                    style={[styles.chip, projectId === proj.id && styles.chipSelected]}
                    onPress={() => { setProjectId(proj.id); setExpandedRow(null); }}
                  >
                    <ScaledText style={[styles.chipLabel, projectId === proj.id && styles.chipLabelSelected]} numberOfLines={1}>
                      {proj.title}
                    </ScaledText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {vacationWarning && <ScaledText style={styles.warningText}>{vacationWarning}</ScaledText>}
        {error && <ScaledText style={styles.errorText}>{error}</ScaledText>}

        <TouchableOpacity
          style={[styles.addButton, !canAdd && styles.addButtonDisabled]}
          onPress={handleAdd}
          disabled={!canAdd}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color={theme.colors.surface} />
            : <ScaledText style={styles.addButtonLabel}>{isEditMode ? 'Save changes' : 'Add appointment'}</ScaledText>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* Native date/time picker — renders as dialog on Android */}
      {pickerMode !== null && (
        <DateTimePicker
          value={pickerValue}
          mode={pickerMode.includes('date') ? 'date' : 'time'}
          display={pickerMode.includes('time') ? 'spinner' : 'default'}
          minuteInterval={5}
          minimumDate={pickerMode === 'end-date' ? startDate : undefined}
          onValueChange={handlePickerChange}
          onDismiss={() => setPickerMode(null)}
        />
      )}
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
  scrollContent: { paddingHorizontal: theme.spacing.screen, paddingBottom: 48 },
  sourceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.sageTint,
    borderRadius: theme.borderRadius.chip,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.md,
    alignSelf: 'flex-start',
  },
  sourceBannerLabel: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.sageDark,
  },
  sourceBannerTask: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textSecondary,
    flexShrink: 1,
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
  },
  detailsInput: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing.sm,
    minHeight: 60,
  },
  inputDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  // Date/time card
  dateTimeCard: {
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.borderRadius.card,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
  },
  allDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  allDayLabel: {
    flex: 1,
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textPrimary,
  },
  cardDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  dateTimeCol: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  pickerDate: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansMedium,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.sage,
  },
  pickerTime: {
    fontSize: theme.fontSize.subhead,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  arrowIcon: {
    flexShrink: 0,
  },
  // Expandable rows
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginBottom: theme.spacing.sm,
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
    flexShrink: 1,
    marginLeft: theme.spacing.md,
  },
  locationInput: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.chip,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  optionList: {
    borderRadius: theme.borderRadius.card,
    overflow: 'hidden',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  optionRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  optionRowSelected: { backgroundColor: theme.colors.sageTint },
  optionLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textPrimary,
  },
  optionLabelSelected: {
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.sageDark,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
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
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  warningText: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.overdueFg,
    backgroundColor: theme.colors.overdueBg,
    borderRadius: theme.borderRadius.badge,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
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
