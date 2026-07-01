import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTranslation } from 'react-i18next';

import { fmtWeekdayDate, fmtTime } from '../../utils/formatters';
import { theme } from '../../constants/theme';
import { useCircle } from '../../hooks/useCircle';
import { useExternalContacts } from '../../hooks/useExternalContacts';
import { useProjectList } from '../../hooks/useProjectList';
import { useAppointment } from '../../hooks/useAppointment';
import { deleteAppointment, updateAppointment } from '../../services/appointments';
import { completeTask } from '../../services/tasks';
import { ScaledText } from '../../components/ScaledText';
import { AppStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'AppointmentDetail'>;


export function AppointmentDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { appointmentId } = route.params;

  const { appointment, prepTasks, loading, refresh } = useAppointment(appointmentId);
  const { members, circle } = useCircle();
  const { contacts: externalContacts } = useExternalContacts(circle?.id ?? null);
  const { projects } = useProjectList(circle?.id ?? null);

  const [projectPickerOpen, setProjectPickerOpen] = useState(false);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  async function handleChangeProject(value: string | null) {
    setProjectPickerOpen(false);
    await updateAppointment(appointmentId, { project_id: value }, appointment?.invitee_ids ?? [], appointment?.external_invitee_ids ?? []);
    refresh();
  }

  const userInvitees = (appointment?.invitee_ids ?? [])
    .map((id) => ({ id, name: members.find((m) => m.user_id === id)?.displayName ?? null, isExternal: false as const }))
    .filter((n): n is { id: string; name: string; isExternal: false } => n.name !== null);

  const externalInvitees = (appointment?.external_invitee_ids ?? [])
    .map((id) => ({ id, name: externalContacts.find((c) => c.id === id)?.display_name ?? null, isExternal: true as const }))
    .filter((n): n is { id: string; name: string; isExternal: true } => n.name !== null);

  const allInvitees = [...userInvitees, ...externalInvitees];

  const completedCount = prepTasks.filter((t) => t.completed).length;

  async function handleCompletePrep(taskId: string) {
    await completeTask(taskId);
    refresh();
  }

  function formatWhen(startsAt: string, endsAt: string | null, isFullDay: boolean): string {
    if (isFullDay) return `${fmtWeekdayDate(startsAt)} · ${t('appointments.allDay')}`;
    const timeRange = endsAt ? `${fmtTime(startsAt)} – ${fmtTime(endsAt)}` : fmtTime(startsAt);
    return `${fmtWeekdayDate(startsAt)} · ${timeRange}`;
  }

  function formatRecurrence(recurrence: string | null): string {
    if (!recurrence) return t('common.none');
    const map: Record<string, string> = {
      daily: t('appointments.recurrenceDaily'),
      weekly: t('appointments.recurrenceWeekly'),
      monthly: t('appointments.recurrenceMonthly'),
      yearly: t('appointments.recurrenceYearly'),
    };
    return map[recurrence] ?? recurrence;
  }

  function formatReminder(minutes: number | null): string {
    if (minutes === null) return t('appointments.reminderNone');
    if (minutes === 0) return t('appointments.reminderAtStart');
    if (minutes < 60) return t('appointments.reminderMinutesBefore', { count: minutes });
    if (minutes === 60) return t('appointments.reminderHourBefore');
    if (minutes < 1440) return t('appointments.reminderHoursBefore', { count: minutes / 60 });
    if (minutes === 1440) return t('appointments.reminderDayBefore');
    return t('appointments.reminderDaysBefore', { count: minutes / 1440 });
  }

  function handleDelete() {
    Alert.alert(t('appointments.deleteTitle'), t('common.cannotBeUndone'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: async () => {
          await deleteAppointment(appointmentId);
          navigation.goBack();
        },
      },
    ]);
  }

  if (loading || !appointment) {
    return <View style={styles.centered}><ActivityIndicator color={theme.colors.sage} /></View>;
  }

  const recurrenceLabel = formatRecurrence(appointment.recurrence);
  const reminderLabel = formatReminder(appointment.reminder_offset_minutes);

  return (
    <View style={styles.container}>
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.sage} />
          <ScaledText style={styles.backLabel}>{t('common.back')}</ScaledText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('AddAppointment', { appointmentId })}
        >
          <Ionicons name="pencil-outline" size={18} color={theme.colors.sage} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.titleArea}>
          <View style={styles.apptIcon}>
            <Ionicons name="calendar" size={18} color={theme.colors.sage} />
          </View>
          <ScaledText style={styles.title}>{appointment.title}</ScaledText>
        </View>
        <ScaledText style={styles.dateText}>
          {formatWhen(appointment.starts_at, appointment.ends_at, appointment.is_full_day)}
        </ScaledText>
        {appointment.details ? (
          <ScaledText style={styles.detailsText}>{appointment.details}</ScaledText>
        ) : null}

        <View style={styles.fieldCard}>
          <View style={styles.fieldRow}>
            <ScaledText style={styles.fieldLabel}>With</ScaledText>
            <View style={styles.fieldValueRow}>
              {allInvitees.map(({ id, name, isExternal }) => (
                <View key={id} style={[styles.assigneeAvatar, isExternal && styles.assigneeAvatarExternal]}>
                  <Text style={[styles.assigneeAvatarText, isExternal && styles.assigneeAvatarTextExternal]}>
                    {name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              ))}
              <ScaledText style={styles.fieldValue}>
                {allInvitees.length > 0 ? allInvitees.map((i) => i.name).join(', ') : t('appointments.nobody')}
              </ScaledText>
            </View>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.fieldRow}>
            <ScaledText style={styles.fieldLabel}>{t('appointments.locationLabel')}</ScaledText>
            <ScaledText style={[styles.fieldValue, !appointment.location && styles.fieldValueMuted]} numberOfLines={2}>
              {appointment.location ?? t('common.none')}
            </ScaledText>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.fieldRow}>
            <ScaledText style={styles.fieldLabel}>{t('appointments.repeatLabel')}</ScaledText>
            <ScaledText style={[styles.fieldValue, !appointment.recurrence && styles.fieldValueMuted]}>
              {recurrenceLabel}
            </ScaledText>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.fieldRow}>
            <ScaledText style={styles.fieldLabel}>{t('appointments.reminderLabel')}</ScaledText>
            <ScaledText style={[styles.fieldValue, appointment.reminder_offset_minutes === null && styles.fieldValueMuted]}>
              {reminderLabel}
            </ScaledText>
          </View>
          <View style={styles.rowDivider} />
          <View style={styles.fieldRow}>
            <ScaledText style={styles.fieldLabel}>{t('appointments.visibilityLabel')}</ScaledText>
            <ScaledText style={styles.fieldValue}>
              {appointment.visibility === 'private' ? t('tasks.onlyMe') : t('common.shared')}
            </ScaledText>
          </View>
          {projects.length > 0 && (
            <>
              <View style={styles.rowDivider} />
              <TouchableOpacity style={styles.fieldRow} onPress={() => setProjectPickerOpen((v) => !v)}>
                <ScaledText style={styles.fieldLabel}>{t('tasks.projectLabel')}</ScaledText>
                <View style={styles.fieldValueRow}>
                  <ScaledText style={styles.fieldValue}>
                    {appointment.project_id
                      ? (projects.find((p) => p.id === appointment.project_id)?.title ?? t('common.none'))
                      : t('common.none')}
                  </ScaledText>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textHairline} />
                </View>
              </TouchableOpacity>
              {projectPickerOpen && (
                <View style={styles.projectChipRow}>
                  <TouchableOpacity
                    style={[styles.chip, !appointment.project_id && styles.chipSelected]}
                    onPress={() => handleChangeProject(null)}
                  >
                    <ScaledText style={[styles.chipLabel, !appointment.project_id && styles.chipLabelSelected]}>{t('common.none')}</ScaledText>
                  </TouchableOpacity>
                  {projects.map((proj) => (
                    <TouchableOpacity
                      key={proj.id}
                      style={[styles.chip, appointment.project_id === proj.id && styles.chipSelected]}
                      onPress={() => handleChangeProject(proj.id)}
                    >
                      <ScaledText style={[styles.chipLabel, appointment.project_id === proj.id && styles.chipLabelSelected]} numberOfLines={1}>
                        {proj.title}
                      </ScaledText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {appointment.project_id && (
                <TouchableOpacity
                  style={styles.projectLinkRow}
                  onPress={() => navigation.navigate('ProjectDetail', { projectId: appointment.project_id! })}
                >
                  <Ionicons name="folder-outline" size={14} color={theme.colors.sageDark} />
                  <ScaledText style={styles.projectLinkLabel}>{t('tasks.viewProject')}</ScaledText>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={styles.sectionHeaderRow}>
          <ScaledText style={styles.sectionHeader}>{t('appointments.prepTasksSection')}</ScaledText>
          {prepTasks.length > 0 && (
            <ScaledText style={styles.prepCount}>{t('appointments.prepCount', { completed: completedCount, total: prepTasks.length })}</ScaledText>
          )}
        </View>

        <View style={styles.prepCard}>
          {prepTasks.map((task) => (
            <TouchableOpacity
              key={task.id}
              style={styles.prepRow}
              onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
              activeOpacity={0.7}
            >
              <TouchableOpacity
                style={[styles.prepCheckbox, task.completed && styles.prepCheckboxDone]}
                onPress={() => !task.completed && handleCompletePrep(task.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {task.completed && <Ionicons name="checkmark" size={14} color={theme.colors.surface} />}
              </TouchableOpacity>
              <ScaledText style={[styles.prepTitle, task.completed && styles.prepTitleDone]}>
                {task.title}
              </ScaledText>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textHairline} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.addPrepRow}
            onPress={() => navigation.navigate('AddTask', { parentAppointmentId: appointmentId })}
          >
            <Ionicons name="add-circle-outline" size={20} color={theme.colors.sage} />
            <ScaledText style={styles.addPrepLabel}>{t('appointments.addPrepTaskButton')}</ScaledText>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <ScaledText style={styles.deleteLabel}>{t('appointments.deleteButton')}</ScaledText>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingBottom: theme.spacing.sm },
  backRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing.screen, gap: 2 },
  editButton: { paddingHorizontal: theme.spacing.screen, paddingVertical: theme.spacing.sm },
  backLabel: { fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sans, color: theme.colors.sage },
  scroll: { paddingHorizontal: theme.spacing.screen, paddingBottom: 60 },
  titleArea: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  apptIcon: { width: 32, height: 32, borderRadius: theme.borderRadius.badge, backgroundColor: theme.colors.sageTint, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  title: { flex: 1, fontSize: theme.fontSize.subhead, fontFamily: theme.fontFamily.sansBold, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, lineHeight: 26 },
  dateText: { fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sansMedium, fontWeight: theme.fontWeight.medium, color: theme.colors.textSecondary, marginLeft: 44, marginBottom: theme.spacing.md },
  detailsText: { fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sans, color: theme.colors.textSecondary, marginLeft: 44, marginBottom: theme.spacing.xl, lineHeight: 22 },
  durationText: { fontFamily: theme.fontFamily.sans, fontWeight: theme.fontWeight.regular, color: theme.colors.textMuted },
  fieldCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.card, marginBottom: theme.spacing.xl, overflow: 'hidden' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md + 2 },
  fieldLabel: { fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sans, color: theme.colors.textSecondary },
  fieldValueRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  fieldValue: { fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sansSemiBold, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  fieldValueMuted: { fontFamily: theme.fontFamily.sans, fontWeight: theme.fontWeight.regular, color: theme.colors.textMuted },
  assigneeAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.sageTint, alignItems: 'center', justifyContent: 'center' },
  assigneeAvatarText: { fontSize: theme.fontSize.micro, fontFamily: theme.fontFamily.sansBold, fontWeight: theme.fontWeight.bold, color: theme.colors.sageDark },
  assigneeAvatarExternal: { backgroundColor: theme.colors.externalBg },
  assigneeAvatarTextExternal: { color: theme.colors.externalFg },
  rowDivider: { height: 1, backgroundColor: theme.colors.divider, marginHorizontal: theme.spacing.lg },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  sectionHeader: { fontSize: theme.fontSize.label, fontFamily: theme.fontFamily.sansSemiBold, fontWeight: theme.fontWeight.semibold, color: theme.colors.textMuted, letterSpacing: theme.letterSpacing.wide, textTransform: 'uppercase' },
  prepCount: { fontSize: theme.fontSize.small, fontFamily: theme.fontFamily.sans, color: theme.colors.textMuted },
  prepCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.card, marginBottom: theme.spacing.xl, overflow: 'hidden' },
  prepRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  prepCheckbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: theme.colors.borderMid, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  prepCheckboxDone: { backgroundColor: theme.colors.sage, borderColor: theme.colors.sage },
  prepTitle: { flex: 1, fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sans, color: theme.colors.textPrimary },
  prepTitleDone: { textDecorationLine: 'line-through', color: theme.colors.textMuted },
  addPrepRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md },
  addPrepLabel: { fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sansMedium, fontWeight: theme.fontWeight.medium, color: theme.colors.sage },
  deleteButton: { alignItems: 'center', paddingVertical: theme.spacing.md },
  deleteLabel: { fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sans, color: theme.colors.overdueFg },
  projectChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.chip,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  chipSelected: { backgroundColor: theme.colors.sageTint, borderColor: theme.colors.sageLight },
  chipLabel: { fontSize: theme.fontSize.label, fontFamily: theme.fontFamily.sansMedium, fontWeight: theme.fontWeight.medium, color: theme.colors.textSecondary },
  chipLabelSelected: { color: theme.colors.sageDark },
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
});
