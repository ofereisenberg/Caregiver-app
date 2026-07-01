import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';
import { fmtWeekdayDate, fmtTime } from '../../utils/formatters';

import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../hooks/useCircle';
import { useExternalContacts } from '../../hooks/useExternalContacts';
import { useProjectList } from '../../hooks/useProjectList';
import { useVacations } from '../../hooks/useVacations';
import { createTask } from '../../services/tasks';
import { PersonSelection, personSelectionToTaskFields, resolvePersonName } from '../../types/PersonSelection';
import { ReminderPicker } from '../../components/ReminderPicker';
import { ScaledText } from '../../components/ScaledText';
import { AppStackParamList } from '../../navigation/types';
import { toLocalISODate } from '../../utils/dateUtils';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'AddTask'>;

type ExpandedRow = 'repeat' | 'assign' | 'when' | 'project' | 'reminder' | null;
type RepeatValue = 'every_few_days' | 'weekly' | 'monthly' | null;

const REPEAT_VALUES: RepeatValue[] = ['every_few_days', 'weekly', 'monthly'];

type TimePickerMode = 'start' | 'end';

const formatDate = fmtWeekdayDate;
const formatTimeDisplay = fmtTime;

function makeTodayAt(hour: number): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}

function timeToString(t: Date | null): string | null {
  if (!t) return null;
  return `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}:00`;
}

export function AddTaskScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { session } = useAuth();
  const { circle, members } = useCircle();
  const { contacts: externalContacts } = useExternalContacts(circle?.id ?? null);
  const { projects } = useProjectList(circle?.id ?? null);
  const { vacations } = useVacations(circle?.id ?? null);

  const titleRef = useRef<TextInput>(null);
  const [title, setTitle] = useState('');
  const [repeat, setRepeat] = useState<RepeatValue>(null);
  const [assignee, setAssignee] = useState<PersonSelection>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [timePickerMode, setTimePickerMode] = useState<TimePickerMode | null>(null);
  const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState<number | null>(null);
  const [onlyMe, setOnlyMe] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(route.params?.projectId ?? null);
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
        onValueChange: (_event, selected) => {
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
        onValueChange: (_event, selected) => {
          if (!selected) return;
          if (mode === 'start') setStartTime(selected);
          else setEndTime(selected);
        },
      });
    } else {
      setTimePickerMode(mode);
    }
  }

  function handleIosTimeChange(_event: DateTimePickerChangeEvent, selected: Date) {
    const mode = timePickerMode;
    setTimePickerMode(null);
    if (!mode) return;
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
      ...personSelectionToTaskFields(assignee),
      due_date: dueDate ? toLocalISODate(dueDate) : null,
      start_time: timeToString(startTime),
      end_time: timeToString(endTime),
      visibility: onlyMe ? 'private' : 'shared',
      reminder_offset_minutes: reminderOffsetMinutes,
      parent_appointment_id: route.params?.parentAppointmentId ?? null,
      project_id: projectId,
    });

    setSaving(false);

    if (createError) {
      setError(createError);
    } else {
      navigation.goBack();
    }
  }, [title, circle, session, repeat, assignee, dueDate, onlyMe, reminderOffsetMinutes, route.params, navigation]);

  function repeatLabel(value: RepeatValue): string {
    if (!value) return t('tasks.repeatOneOff');
    const map: Record<string, string> = {
      every_few_days: t('tasks.repeatEveryFewDays'),
      weekly: t('tasks.repeatWeekly'),
      monthly: t('tasks.repeatMonthly'),
    };
    return map[value] ?? t('tasks.repeatOneOff');
  }

  const vacationWarning = useMemo(() => {
    if (!assignee || assignee.type !== 'user' || !dueDate) return null;
    const dueDateKey = toLocalISODate(dueDate);
    const onVacation = vacations.find(
      (v) => v.user_id === assignee.id && v.start_date <= dueDateKey && v.end_date >= dueDateKey,
    );
    if (!onVacation) return null;
    const name = members.find((m) => m.user_id === assignee.id)?.displayName ?? 'Assignee';
    return `⚠️ ${name} is on vacation on this date`;
  }, [assignee, dueDate, vacations, members]);

  const canAdd = title.trim().length > 0 && !saving;

  return (
    <KeyboardAvoidingView
      style={styles.sheet}
      behavior="padding"
    >
      {/* Pull handle */}
      <View style={styles.handle} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ScaledText style={styles.heading}>{t('tasks.addHeading')}</ScaledText>

        {/* Title input */}
        <TextInput
          ref={titleRef}
          style={styles.titleInput}
          placeholder={t('tasks.titlePlaceholder')}
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
          <ScaledText style={styles.expandRowLabel}>
            <ScaledText style={styles.expandRowPlus}>+ </ScaledText>{t('tasks.repeatLabel')}
          </ScaledText>
          <ScaledText style={styles.expandRowValue}>{repeatLabel(repeat)}</ScaledText>
        </TouchableOpacity>
        {expandedRow === 'repeat' && (
          <View style={styles.chipRow}>
            {REPEAT_VALUES.map((value) => (
              <TouchableOpacity
                key={value}
                style={[styles.chip, repeat === value && styles.chipSelected]}
                onPress={() => {
                  setRepeat(repeat === value ? null : value);
                  setExpandedRow(null);
                }}
              >
                <ScaledText style={[styles.chipLabel, repeat === value && styles.chipLabelSelected]}>
                  {repeatLabel(value)}
                </ScaledText>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={styles.rowDivider} />

        {/* Assign row */}
        <TouchableOpacity style={styles.expandRow} onPress={() => toggleRow('assign')}>
          <ScaledText style={styles.expandRowLabel}>
            <ScaledText style={styles.expandRowPlus}>+ </ScaledText>{t('tasks.assignLabel')}
          </ScaledText>
          <ScaledText style={styles.expandRowValue}>
            {resolvePersonName(assignee, members, externalContacts)}
          </ScaledText>
        </TouchableOpacity>
        {expandedRow === 'assign' && (
          <View style={styles.chipRow}>
            {members.map((member) => {
              const selected = assignee?.type === 'user' && assignee.id === member.user_id;
              return (
                <TouchableOpacity
                  key={member.user_id}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => {
                    setAssignee(selected ? null : { type: 'user', id: member.user_id });
                    setExpandedRow(null);
                  }}
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
                {externalContacts.map((contact) => {
                  const selected = assignee?.type === 'external' && assignee.id === contact.id;
                  return (
                    <TouchableOpacity
                      key={contact.id}
                      style={[styles.chip, selected && styles.chipExternalSelected]}
                      onPress={() => {
                        setAssignee(selected ? null : { type: 'external', id: contact.id });
                        setExpandedRow(null);
                      }}
                    >
                      <ScaledText style={[styles.chipLabel, selected && styles.chipLabelExternalSelected]}>
                        {contact.display_name.split(' ')[0]}
                      </ScaledText>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </View>
        )}
        <View style={styles.rowDivider} />

        {/* When row */}
        <TouchableOpacity style={styles.expandRow} onPress={handleWhenPress}>
          <ScaledText style={styles.expandRowLabel}>
            <ScaledText style={styles.expandRowPlus}>+ </ScaledText>{t('tasks.whenLabel')}
          </ScaledText>
          <ScaledText style={styles.expandRowValue}>
            {dueDate ? formatDate(dueDate) : t('tasks.noDate')}
          </ScaledText>
        </TouchableOpacity>
        {Platform.OS === 'ios' && expandedRow === 'when' && (
          <DateTimePicker
            value={dueDate ?? new Date()}
            mode="date"
            display="inline"
            minimumDate={new Date()}
            onValueChange={(_e, date) => { if (date) setDueDate(date); }}
            style={styles.inlinePicker}
          />
        )}
        {dueDate !== null && (
          <View style={styles.timeRangeRow}>
            <TouchableOpacity style={styles.timePill} onPress={() => handleTimePress('start')}>
              <ScaledText style={styles.timePillText}>{startTime ? formatTimeDisplay(startTime) : '–:––'}</ScaledText>
            </TouchableOpacity>
            <Ionicons name="arrow-forward" size={14} color={theme.colors.textMuted} />
            <TouchableOpacity style={styles.timePill} onPress={() => handleTimePress('end')}>
              <ScaledText style={styles.timePillText}>{endTime ? formatTimeDisplay(endTime) : '–:––'}</ScaledText>
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
            onValueChange={handleIosTimeChange}
            onDismiss={() => setTimePickerMode(null)}
          />
        )}
        <View style={styles.rowDivider} />
        <ReminderPicker
          value={reminderOffsetMinutes}
          onChange={(v) => {
            if (!startTime) return;
            setReminderOffsetMinutes(v);
          }}
          isExpanded={expandedRow === 'reminder' && startTime !== null}
          onToggle={() => { if (startTime) toggleRow('reminder'); }}
          disabled={startTime === null}
        />

        <View style={styles.rowDivider} />

        {/* Only me toggle */}
        <View style={styles.toggleRow}>
          <View>
            <ScaledText style={styles.toggleLabel}>{t('tasks.onlyMe')}</ScaledText>
            <ScaledText style={styles.toggleSubLabel}>{t('tasks.onlyMeSubtitle')}</ScaledText>
          </View>
          <Switch
            value={onlyMe}
            onValueChange={setOnlyMe}
            trackColor={{ false: theme.colors.disabledBg, true: theme.colors.sage }}
            thumbColor={theme.colors.surfaceElevated}
          />
        </View>

        {/* Link to project */}
        {projects.length > 0 && (
          <>
            <View style={styles.rowDivider} />
            <TouchableOpacity style={styles.expandRow} onPress={() => toggleRow('project')}>
              <ScaledText style={styles.expandRowLabel}>
                <ScaledText style={styles.expandRowPlus}>+ </ScaledText>{t('tasks.projectLabel')}
              </ScaledText>
              <ScaledText style={styles.expandRowValue}>
                {projectId ? (projects.find((p) => p.id === projectId)?.title ?? t('common.none')) : t('common.none')}
              </ScaledText>
            </TouchableOpacity>
            {expandedRow === 'project' && (
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, projectId === null && styles.chipSelected]}
                  onPress={() => { setProjectId(null); setExpandedRow(null); }}
                >
                  <ScaledText style={[styles.chipLabel, projectId === null && styles.chipLabelSelected]}>{t('common.none')}</ScaledText>
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
            <ScaledText style={styles.addButtonLabel}>{t('tasks.addButton')}</ScaledText>
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
  chipExternalSelected: {
    backgroundColor: theme.colors.externalBg,
    borderColor: theme.colors.externalFg,
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
  chipLabelExternalSelected: {
    color: theme.colors.externalFg,
  },
  chipDivider: {
    width: '100%',
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: theme.spacing.xs,
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
