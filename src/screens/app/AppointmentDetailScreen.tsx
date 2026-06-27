import React, { useCallback } from 'react';
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

import { theme } from '../../constants/theme';
import { useCircle } from '../../hooks/useCircle';
import { useAppointment } from '../../hooks/useAppointment';
import { deleteAppointment } from '../../services/appointments';
import { completeTask } from '../../services/tasks';
import { AppStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'AppointmentDetail'>;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatWhen(startsAt: string, endsAt: string | null, isFullDay: boolean): string {
  if (isFullDay) return `${formatDate(startsAt)} · All day`;
  const timeRange = endsAt ? `${formatTime(startsAt)} – ${formatTime(endsAt)}` : formatTime(startsAt);
  return `${formatDate(startsAt)} · ${timeRange}`;
}

function formatRecurrence(recurrence: string | null): string | null {
  const labels: Record<string, string> = {
    daily: 'Every day',
    weekly: 'Every week',
    monthly: 'Every month',
    yearly: 'Every year',
  };
  return recurrence ? (labels[recurrence] ?? recurrence) : null;
}

export function AppointmentDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { appointmentId } = route.params;

  const { appointment, prepTasks, loading, refresh } = useAppointment(appointmentId);
  const { members } = useCircle();

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const inviteeNames = (appointment?.invitee_ids ?? [])
    .map((id) => members.find((m) => m.user_id === id)?.displayName ?? null)
    .filter((n): n is string => n !== null);

  const completedCount = prepTasks.filter((t) => t.completed).length;

  async function handleCompletePrep(taskId: string) {
    await completeTask(taskId);
    refresh();
  }

  function handleDelete() {
    Alert.alert('Delete appointment', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
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

  return (
    <View style={styles.container}>
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.sage} />
          <Text style={styles.backLabel}>Back</Text>
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
          <Text style={styles.title}>{appointment.title}</Text>
        </View>
        <Text style={styles.dateText}>
          {formatWhen(appointment.starts_at, appointment.ends_at, appointment.is_full_day)}
        </Text>

        <View style={styles.fieldCard}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>With</Text>
            <View style={styles.fieldValueRow}>
              {inviteeNames.map((name) => (
                <View key={name} style={styles.assigneeAvatar}>
                  <Text style={styles.assigneeAvatarText}>{name.charAt(0).toUpperCase()}</Text>
                </View>
              ))}
              <Text style={styles.fieldValue}>
                {inviteeNames.length > 0 ? inviteeNames.join(', ') : 'Nobody'}
              </Text>
            </View>
          </View>
          {appointment.location ? (
            <>
              <View style={styles.rowDivider} />
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Location</Text>
                <Text style={styles.fieldValue} numberOfLines={2}>{appointment.location}</Text>
              </View>
            </>
          ) : null}
          {recurrenceLabel ? (
            <>
              <View style={styles.rowDivider} />
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Repeat</Text>
                <Text style={styles.fieldValue}>{recurrenceLabel}</Text>
              </View>
            </>
          ) : null}
          <View style={styles.rowDivider} />
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Visibility</Text>
            <Text style={styles.fieldValue}>
              {appointment.visibility === 'private' ? 'Only me' : 'Shared'}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>Prep tasks</Text>
          {prepTasks.length > 0 && (
            <Text style={styles.prepCount}>{completedCount} of {prepTasks.length} ready</Text>
          )}
        </View>

        <View style={styles.prepCard}>
          {prepTasks.map((task) => (
            <View key={task.id} style={styles.prepRow}>
              <TouchableOpacity
                style={[styles.prepCheckbox, task.completed && styles.prepCheckboxDone]}
                onPress={() => !task.completed && handleCompletePrep(task.id)}
              >
                {task.completed && <Ionicons name="checkmark" size={14} color={theme.colors.surface} />}
              </TouchableOpacity>
              <Text style={[styles.prepTitle, task.completed && styles.prepTitleDone]}>
                {task.title}
              </Text>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addPrepRow}
            onPress={() => navigation.navigate('AddTask', { parentAppointmentId: appointmentId })}
          >
            <Ionicons name="add-circle-outline" size={20} color={theme.colors.sage} />
            <Text style={styles.addPrepLabel}>Add a prep task</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteLabel}>Delete appointment</Text>
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
  dateText: { fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sansMedium, fontWeight: theme.fontWeight.medium, color: theme.colors.textSecondary, marginLeft: 44, marginBottom: theme.spacing.xl },
  durationText: { fontFamily: theme.fontFamily.sans, fontWeight: theme.fontWeight.regular, color: theme.colors.textMuted },
  fieldCard: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.card, marginBottom: theme.spacing.xl, overflow: 'hidden' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md + 2 },
  fieldLabel: { fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sans, color: theme.colors.textSecondary },
  fieldValueRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  fieldValue: { fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sansSemiBold, fontWeight: theme.fontWeight.semibold, color: theme.colors.textPrimary },
  assigneeAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: theme.colors.sageTint, alignItems: 'center', justifyContent: 'center' },
  assigneeAvatarText: { fontSize: theme.fontSize.micro, fontFamily: theme.fontFamily.sansBold, fontWeight: theme.fontWeight.bold, color: theme.colors.sageDark },
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
});
