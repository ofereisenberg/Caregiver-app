import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid, DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../../constants/theme';
import { useCircle } from '../../hooks/useCircle';
import { useProjectList } from '../../hooks/useProjectList';
import { useTask } from '../../hooks/useTask';
import { completeTask, deleteTask, updateTask } from '../../services/tasks';
import { formatDueLabel, isTaskOverdue } from '../../utils/taskGrouping';
import { AppStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'TaskDetail'>;

type ExpandedRow = 'assignee' | 'repeat' | 'when' | 'project' | null;
type TimePickerMode = 'start' | 'end';

function formatTimeDisplay(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

function makeTodayAt(hour: number): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d;
}

function parseTimeString(t: string | null): Date | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function timeToString(t: Date | null): string | null {
  if (!t) return null;
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:00`;
}

const REPEAT_OPTIONS: { label: string; value: string | null }[] = [
  { label: 'One-off', value: null },
  { label: 'Every few days', value: 'every_few_days' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
];

function repeatLabel(value: string | null) {
  return REPEAT_OPTIONS.find((o) => o.value === value)?.label ?? 'One-off';
}

export function TaskDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { taskId } = route.params;

  const { task, loading, refresh } = useTask(taskId);
  const { members, circle } = useCircle();
  const { projects } = useProjectList(circle?.id ?? null);

  // Local editable state — initialised from task on first load
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [repeat, setRepeat] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [visibility, setVisibility] = useState<'shared' | 'private'>('shared');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [timePickerMode, setTimePickerMode] = useState<TimePickerMode | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteChanged, setNoteChanged] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [expandedRow, setExpandedRow] = useState<ExpandedRow>(null);
  const initialised = useRef(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const titleInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (task && !initialised.current) {
      initialised.current = true;
      setAssigneeId(task.assignee);
      setRepeat(task.recurrence);
      setDueDate(task.due_date ? new Date(task.due_date) : null);
      setStartTime(parseTimeString(task.start_time));
      setEndTime(parseTimeString(task.end_time));
      setVisibility(task.visibility);
      setNoteText(task.progress_note ?? '');
      setProjectId(task.project_id ?? null);
    }
  }, [task]);

  function startEditTitle() {
    setTitleInput(task?.title ?? '');
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 50);
  }

  async function handleSaveTitle() {
    const trimmed = titleInput.trim();
    if (!trimmed || trimmed === task?.title) { setEditingTitle(false); return; }
    setSavingTitle(true);
    await updateTask(taskId, { title: trimmed });
    await refresh();
    setSavingTitle(false);
    setEditingTitle(false);
  }

  function handleCancelTitle() { setEditingTitle(false); }

  async function handleClearDate() {
    setDueDate(null);
    await updateTask(taskId, { due_date: null });
  }

  function toggleRow(row: ExpandedRow) {
    setExpandedRow((prev) => (prev === row ? null : row));
  }

  async function changeAssignee(id: string | null) {
    setAssigneeId(id);
    setExpandedRow(null);
    await updateTask(taskId, { assignee: id });
  }

  async function changeRepeat(value: string | null) {
    setRepeat(value);
    setExpandedRow(null);
    await updateTask(taskId, { recurrence: value });
  }

  async function changeProject(value: string | null) {
    setProjectId(value);
    setExpandedRow(null);
    await updateTask(taskId, { project_id: value });
  }

  async function changeVisibility(value: boolean) {
    const vis = value ? 'private' : 'shared';
    setVisibility(vis);
    await updateTask(taskId, { visibility: vis });
  }

  function handleWhenPress() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: dueDate ?? new Date(),
        mode: 'date',
        onChange: async (_event, selected) => {
          if (selected) {
            setDueDate(selected);
            await updateTask(taskId, { due_date: selected.toISOString().split('T')[0] });
          }
        },
      });
    } else {
      toggleRow('when');
    }
  }

  async function handleIosDateChange(_event: DateTimePickerChangeEvent, selected: Date) {
    setDueDate(selected);
    await updateTask(taskId, { due_date: selected.toISOString().split('T')[0] });
  }

  function handleTimePress(mode: TimePickerMode) {
    const base = mode === 'start' ? (startTime ?? makeTodayAt(9)) : (endTime ?? makeTodayAt(10));
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: base,
        mode: 'time',
        is24Hour: true,
        onChange: async (_event, selected) => {
          if (!selected) return;
          if (mode === 'start') {
            setStartTime(selected);
            await updateTask(taskId, { start_time: timeToString(selected) });
          } else {
            setEndTime(selected);
            await updateTask(taskId, { end_time: timeToString(selected) });
          }
        },
      });
    } else {
      setTimePickerMode(mode);
    }
  }

  async function handleIosTimeChange(_event: DateTimePickerChangeEvent, selected: Date) {
    const mode = timePickerMode;
    setTimePickerMode(null);
    if (!mode) return;
    if (mode === 'start') {
      setStartTime(selected);
      await updateTask(taskId, { start_time: timeToString(selected) });
    } else {
      setEndTime(selected);
      await updateTask(taskId, { end_time: timeToString(selected) });
    }
  }

  async function handleClearTime() {
    setStartTime(null);
    setEndTime(null);
    await updateTask(taskId, { start_time: null, end_time: null });
  }

  async function handleSaveNote() {
    setSavingNote(true);
    await updateTask(taskId, { progress_note: noteText.trim() || null });
    setSavingNote(false);
    setNoteChanged(false);
  }

  const handleComplete = useCallback(async () => {
    await completeTask(taskId);
    navigation.goBack();
  }, [taskId, navigation]);

  function handleDelete() {
    Alert.alert(
      'Delete task',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTask(taskId);
            navigation.goBack();
          },
        },
      ],
    );
  }

  if (loading || !task) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.sage} />
      </View>
    );
  }

  const overdue = isTaskOverdue(task.due_date);
  const dueLabel = formatDueLabel(task.due_date);
  const assigneeName = assigneeId
    ? members.find((m) => m.user_id === assigneeId)?.displayName ?? null
    : null;

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={20} color={theme.colors.sage} />
        <Text style={styles.backLabel}>Tasks</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Title row */}
        <View style={styles.titleRow}>
          <TouchableOpacity style={styles.checkbox} onPress={handleComplete}>
            <View style={styles.checkboxInner} />
          </TouchableOpacity>
          {editingTitle ? (
            <View style={styles.titleEditRow}>
              <TextInput
                ref={titleInputRef}
                style={styles.titleEditInput}
                value={titleInput}
                onChangeText={setTitleInput}
                autoCapitalize="sentences"
                returnKeyType="done"
                onSubmitEditing={handleSaveTitle}
                multiline
              />
              {savingTitle ? (
                <ActivityIndicator size="small" color={theme.colors.sage} />
              ) : (
                <>
                  <TouchableOpacity onPress={handleSaveTitle} hitSlop={8}>
                    <Ionicons name="checkmark" size={22} color={theme.colors.sage} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleCancelTitle} hitSlop={8}>
                    <Ionicons name="close" size={22} color={theme.colors.textMuted} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <TouchableOpacity onPress={startEditTitle} style={styles.titleTouchable}>
              <Text style={styles.title}>{task.title}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Date badge */}
        {(dueLabel !== '' || overdue) && (
          <View style={styles.dueBadgeRow}>
            {overdue && (
              <View style={styles.overdueBadge}>
                <Text style={styles.overdueBadgeText}>Overdue</Text>
              </View>
            )}
            {dueLabel !== '' && (
              <Text style={[styles.dueText, overdue && styles.dueTextOverdue]}>{dueLabel}</Text>
            )}
          </View>
        )}

        {/* Field rows */}
        <View style={styles.fieldCard}>
          {/* Assignee */}
          <TouchableOpacity style={styles.fieldRow} onPress={() => toggleRow('assignee')}>
            <Text style={styles.fieldLabel}>Assignee</Text>
            <View style={styles.fieldValueRow}>
              <Text style={styles.fieldValue}>{assigneeName ?? 'Unassigned'}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textHairline} />
            </View>
          </TouchableOpacity>
          {expandedRow === 'assignee' && (
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, assigneeId === null && styles.chipSelected]}
                onPress={() => changeAssignee(null)}
              >
                <Text style={[styles.chipLabel, assigneeId === null && styles.chipLabelSelected]}>Unassigned</Text>
              </TouchableOpacity>
              {members.map((m) => (
                <TouchableOpacity
                  key={m.user_id}
                  style={[styles.chip, assigneeId === m.user_id && styles.chipSelected]}
                  onPress={() => changeAssignee(m.user_id)}
                >
                  <Text style={[styles.chipLabel, assigneeId === m.user_id && styles.chipLabelSelected]}>
                    {m.displayName.split(' ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.rowDivider} />

          {/* Repeat */}
          <TouchableOpacity style={styles.fieldRow} onPress={() => toggleRow('repeat')}>
            <Text style={styles.fieldLabel}>Repeat</Text>
            <View style={styles.fieldValueRow}>
              <Text style={styles.fieldValue}>{repeatLabel(repeat)}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textHairline} />
            </View>
          </TouchableOpacity>
          {expandedRow === 'repeat' && (
            <View style={styles.chipRow}>
              {REPEAT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={String(opt.value)}
                  style={[styles.chip, repeat === opt.value && styles.chipSelected]}
                  onPress={() => changeRepeat(opt.value)}
                >
                  <Text style={[styles.chipLabel, repeat === opt.value && styles.chipLabelSelected]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.rowDivider} />

          {/* When */}
          <TouchableOpacity style={styles.fieldRow} onPress={handleWhenPress}>
            <Text style={styles.fieldLabel}>When</Text>
            <View style={styles.fieldValueRow}>
              <Text style={styles.fieldValue}>{dueDate ? formatDueLabel(dueDate.toISOString().split('T')[0]) : 'No date'}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textHairline} />
            </View>
          </TouchableOpacity>
          {Platform.OS === 'ios' && expandedRow === 'when' && (
            <DateTimePicker
              value={dueDate ?? new Date()}
              mode="date"
              display="inline"
              onValueChange={handleIosDateChange}
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
                <TouchableOpacity onPress={handleClearTime} hitSlop={8}>
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
          {dueDate !== null && (
            <TouchableOpacity style={styles.clearDateRow} onPress={handleClearDate}>
              <Text style={styles.clearDateLabel}>Remove date</Text>
            </TouchableOpacity>
          )}
          <View style={styles.rowDivider} />

          {/* Visibility */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Only me</Text>
            <Switch
              value={visibility === 'private'}
              onValueChange={changeVisibility}
              trackColor={{ false: theme.colors.disabledBg, true: theme.colors.sage }}
              thumbColor={theme.colors.surfaceElevated}
            />
          </View>

          {/* Project link */}
          {projects.length > 0 && (
            <>
              <View style={styles.rowDivider} />
              <TouchableOpacity style={styles.fieldRow} onPress={() => toggleRow('project')}>
                <Text style={styles.fieldLabel}>Project</Text>
                <View style={styles.fieldValueRow}>
                  <Text style={styles.fieldValue}>
                    {projectId ? (projects.find((p) => p.id === projectId)?.title ?? 'None') : 'None'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textHairline} />
                </View>
              </TouchableOpacity>
              {expandedRow === 'project' && (
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.chip, projectId === null && styles.chipSelected]}
                    onPress={() => changeProject(null)}
                  >
                    <Text style={[styles.chipLabel, projectId === null && styles.chipLabelSelected]}>None</Text>
                  </TouchableOpacity>
                  {projects.map((proj) => (
                    <TouchableOpacity
                      key={proj.id}
                      style={[styles.chip, projectId === proj.id && styles.chipSelected]}
                      onPress={() => changeProject(proj.id)}
                    >
                      <Text style={[styles.chipLabel, projectId === proj.id && styles.chipLabelSelected]} numberOfLines={1}>
                        {proj.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {/* Navigate to project detail */}
              {projectId && (
                <TouchableOpacity
                  style={styles.projectLinkRow}
                  onPress={() => navigation.navigate('ProjectDetail', { projectId: projectId! })}
                >
                  <Ionicons name="folder-outline" size={14} color={theme.colors.sageDark} />
                  <Text style={styles.projectLinkLabel}>
                    View project
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Progress note */}
        <Text style={styles.sectionHeader}>Progress &amp; updates</Text>
        <View style={styles.noteCard}>
          <TextInput
            style={styles.noteInput}
            value={noteText}
            onChangeText={(t) => { setNoteText(t); setNoteChanged(true); }}
            placeholder="Add an update…"
            placeholderTextColor={theme.colors.textFaint}
            multiline
            textAlignVertical="top"
          />
        </View>
        {noteChanged && (
          <TouchableOpacity
            style={styles.saveNoteButton}
            onPress={handleSaveNote}
            disabled={savingNote}
          >
            {savingNote
              ? <ActivityIndicator color={theme.colors.surface} size="small" />
              : <Text style={styles.saveNoteLabel}>Save note</Text>
            }
          </TouchableOpacity>
        )}

        {/* Actions */}
        <TouchableOpacity
          style={styles.appointmentButton}
          onPress={() => navigation.navigate('AddAppointment', { taskId })}
        >
          <Ionicons name="calendar-outline" size={18} color={theme.colors.sageDark} />
          <Text style={styles.appointmentLabel}>Make an appointment</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteLabel}>Delete task</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.screen,
    paddingTop: 56,
    paddingBottom: theme.spacing.sm,
    gap: 2,
  },
  backLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.sage,
  },
  scroll: { paddingHorizontal: theme.spacing.screen, paddingBottom: 60 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  checkbox: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1.5, borderColor: theme.colors.borderMid,
    alignItems: 'center', justifyContent: 'center', marginTop: 3, flexShrink: 0,
  },
  checkboxInner: { width: 11, height: 11, borderRadius: 6 },
  title: {
    flex: 1,
    fontSize: theme.fontSize.subhead,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    lineHeight: 26,
  },
  dueBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginLeft: 38, marginBottom: theme.spacing.lg },
  overdueBadge: {
    backgroundColor: theme.colors.overdueBg,
    borderRadius: theme.borderRadius.badge,
    paddingHorizontal: theme.spacing.sm, paddingVertical: 2,
  },
  overdueBadgeText: {
    fontSize: theme.fontSize.micro, fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold, color: theme.colors.overdueFg,
    letterSpacing: theme.letterSpacing.wide, textTransform: 'uppercase',
  },
  dueText: { fontSize: theme.fontSize.small, fontFamily: theme.fontFamily.sans, color: theme.colors.textMuted },
  dueTextOverdue: { color: theme.colors.overdueFg },
  fieldCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.card,
    marginBottom: theme.spacing.xl,
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md + 2,
  },
  fieldLabel: { fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sans, color: theme.colors.textSecondary },
  fieldValueRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  fieldValue: { fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sansSemiBold, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  rowDivider: { height: 1, backgroundColor: theme.colors.divider, marginHorizontal: theme.spacing.lg },
  chipRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md,
  },
  chip: {
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.chip,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
  },
  chipSelected: { backgroundColor: theme.colors.sageTint, borderColor: theme.colors.sageLight },
  chipLabel: { fontSize: theme.fontSize.label, fontFamily: theme.fontFamily.sansMedium, fontWeight: theme.fontWeight.medium, color: theme.colors.textSecondary },
  chipLabelSelected: { color: theme.colors.sageDark },
  sectionHeader: {
    fontSize: theme.fontSize.label,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
    letterSpacing: theme.letterSpacing.wide,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.md,
  },
  noteCard: {
    backgroundColor: theme.colors.surfaceNote,
    borderRadius: theme.borderRadius.input,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    minHeight: 100,
  },
  noteInput: { fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sans, color: theme.colors.textPrimary, lineHeight: 22 },
  saveNoteButton: {
    backgroundColor: theme.colors.sage,
    borderRadius: theme.borderRadius.button,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    ...theme.shadow.sage,
  },
  saveNoteLabel: { fontSize: theme.fontSize.label, fontFamily: theme.fontFamily.sansBold, fontWeight: theme.fontWeight.bold, color: theme.colors.surface },
  appointmentButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceInfo,
    borderRadius: theme.borderRadius.button,
    paddingVertical: 13,
    marginBottom: theme.spacing.md,
  },
  appointmentLabel: { fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sansSemiBold, fontWeight: theme.fontWeight.semibold, color: theme.colors.sageDark },
  deleteButton: { alignItems: 'center', paddingVertical: theme.spacing.md },
  deleteLabel: { fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sans, color: theme.colors.overdueFg },
  titleTouchable: { flex: 1 },
  titleEditRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  titleEditInput: {
    flex: 1,
    fontSize: theme.fontSize.subhead,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    lineHeight: 26,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.sage,
    paddingVertical: 2,
  },
  clearDateRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  clearDateLabel: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.overdueFg,
  },
  projectLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  projectLinkLabel: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.sageDark,
  },
  timeRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
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
