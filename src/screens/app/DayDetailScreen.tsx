import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../../constants/theme';
import { useCircle } from '../../hooks/useCircle';
import { useAppointmentList } from '../../hooks/useAppointmentList';
import { useTaskList } from '../../hooks/useTaskList';
import { useVacations } from '../../hooks/useVacations';
import { useAuth } from '../../contexts/AuthContext';
import { Appointment } from '../../services/appointments';
import { Task } from '../../services/tasks';
import { Vacation } from '../../services/vacations';
import { AppStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'DayDetail'>;

const VACATION_COLOR = '#e05252';
const VACATION_BG = '#fdeaea';
const APPT_COLOR = '#4a7fc1';
const APPT_BG = '#eaf0fb';
const TASK_COLOR = '#5a9e6f';
const TASK_BG = '#eaf4ee';

function formatDate(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatApptTime(appt: Appointment): string {
  if (appt.is_full_day) return 'All day';
  const start = new Date(appt.starts_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  if (!appt.ends_at) return start;
  const end = new Date(appt.ends_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${start} – ${end}`;
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const e = new Date(end + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${s} – ${e}`;
}

function toDateKey(iso: string): string {
  return iso.split('T')[0];
}

export function DayDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { dateKey } = route.params;

  const { session } = useAuth();
  const currentUserId = session?.user.id ?? '';
  const { circle, members } = useCircle();

  const { appointments } = useAppointmentList(circle?.id ?? null);
  const { sections: taskSections } = useTaskList(circle?.id ?? null, 'all', currentUserId);
  const { vacations } = useVacations(circle?.id ?? null);

  const allTasks = useMemo(() => taskSections.flatMap((s) => s.data), [taskSections]);

  const dayVacations = useMemo((): Vacation[] =>
    vacations.filter((v) => v.start_date <= dateKey && v.end_date >= dateKey),
    [vacations, dateKey],
  );

  const dayAppointments = useMemo((): Appointment[] =>
    appointments.filter((a) => toDateKey(a.starts_at) === dateKey)
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [appointments, dateKey],
  );

  const dayTasks = useMemo((): Task[] =>
    allTasks.filter((t) => t.due_date && toDateKey(t.due_date) === dateKey),
    [allTasks, dateKey],
  );

  function memberName(userId: string | null): string | null {
    if (!userId) return null;
    return members.find((m) => m.user_id === userId)?.displayName ?? null;
  }

  const isEmpty = dayVacations.length === 0 && dayAppointments.length === 0 && dayTasks.length === 0;

  return (
    <View style={styles.sheet}>
      <View style={styles.handle} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.dateLabel}>{formatDate(dateKey)}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {isEmpty && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nothing on this day</Text>
          </View>
        )}

        {/* Vacations */}
        {dayVacations.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: VACATION_COLOR }]}>On vacation</Text>
            {dayVacations.map((v) => (
              <View key={v.id} style={[styles.card, { backgroundColor: VACATION_BG }]}>
                <View style={[styles.colorBar, { backgroundColor: VACATION_COLOR }]} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{v.title}</Text>
                  <Text style={[styles.cardMeta, { color: VACATION_COLOR }]}>
                    {formatDateRange(v.start_date, v.end_date)}
                  </Text>
                  {v.with_member_ids.length > 0 && (
                    <Text style={styles.cardMeta}>
                      With: {v.with_member_ids
                        .map((id) => members.find((m) => m.user_id === id)?.displayName ?? id)
                        .join(', ')}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Appointments */}
        {dayAppointments.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: APPT_COLOR }]}>Appointments</Text>
            {dayAppointments.map((appt) => (
              <TouchableOpacity
                key={appt.id}
                style={[styles.card, { backgroundColor: APPT_BG }]}
                onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: appt.id })}
                activeOpacity={0.75}
              >
                <View style={[styles.colorBar, { backgroundColor: APPT_COLOR }]} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{appt.title}</Text>
                  <Text style={styles.cardMeta}>{formatApptTime(appt)}</Text>
                  {appt.location ? (
                    <Text style={styles.cardMeta}>{appt.location}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={14} color={APPT_COLOR} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tasks */}
        {dayTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: TASK_COLOR }]}>Tasks due</Text>
            {dayTasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={[styles.card, { backgroundColor: TASK_BG }]}
                onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                activeOpacity={0.75}
              >
                <View style={[styles.colorBar, { backgroundColor: TASK_COLOR }]} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{task.title}</Text>
                  {task.assignee && (
                    <Text style={styles.cardMeta}>{memberName(task.assignee)}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={14} color={TASK_COLOR} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  dateLabel: {
    fontSize: theme.fontSize.subhead,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: theme.spacing.md,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: theme.spacing.screen, paddingBottom: 48 },
  section: { marginBottom: theme.spacing.xl },
  sectionLabel: {
    fontSize: theme.fontSize.label,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    letterSpacing: theme.letterSpacing.wide,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.borderRadius.card,
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  colorBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  cardBody: {
    flex: 1,
    padding: theme.spacing.md,
  },
  cardTitle: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansMedium,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  cardMeta: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyText: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textMuted,
  },
});
