import React, { useCallback, useMemo } from 'react';
import {
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../hooks/useCircle';
import { useAppointmentList } from '../../hooks/useAppointmentList';
import { useTaskList } from '../../hooks/useTaskList';
import { Appointment } from '../../services/appointments';
import { Task } from '../../services/tasks';
import { AppStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;

type CalendarItem =
  | { kind: 'appointment'; data: Appointment }
  | { kind: 'task'; data: Task };

interface DaySection {
  title: string;       // formatted date header
  dateKey: string;     // YYYY-MM-DD for sorting
  data: CalendarItem[];
}

function toDateKey(iso: string): string {
  return iso.split('T')[0];
}

function formatSectionTitle(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });
}

function formatApptTime(startsAt: string): string {
  return new Date(startsAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuth();
  const currentUserId = session?.user.id ?? '';

  const { circle, members } = useCircle();
  const { appointments, refresh: refreshAppts } = useAppointmentList(circle?.id ?? null);
  const { sections: taskSections, refresh: refreshTasks } = useTaskList(circle?.id ?? null, 'all', currentUserId);

  useFocusEffect(useCallback(() => {
    refreshAppts();
    refreshTasks();
  }, [refreshAppts, refreshTasks]));

  // Build a flat task list from sections
  const tasksWithDates = useMemo(
    () => taskSections.flatMap((s) => s.data).filter((t) => t.due_date !== null),
    [taskSections],
  );

  const daySections = useMemo((): DaySection[] => {
    const map = new Map<string, CalendarItem[]>();

    for (const appt of appointments) {
      const key = toDateKey(appt.starts_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ kind: 'appointment', data: appt });
    }

    for (const task of tasksWithDates) {
      const key = task.due_date!;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ kind: 'task', data: task });
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, items]) => ({
        title: formatSectionTitle(dateKey),
        dateKey,
        data: items.sort((a, b) => {
          // appointments first (by time), then tasks
          if (a.kind === 'appointment' && b.kind === 'appointment') {
            return a.data.starts_at.localeCompare(b.data.starts_at);
          }
          return a.kind === 'appointment' ? -1 : 1;
        }),
      }));
  }, [appointments, tasksWithDates]);

  function memberName(userId: string | null) {
    if (!userId) return null;
    return members.find((m) => m.user_id === userId)?.displayName ?? null;
  }

  function renderItem({ item }: { item: CalendarItem }) {
    if (item.kind === 'appointment') {
      const appt = item.data;
      const name = memberName(appt.assignee);
      return (
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: appt.id })}
        >
          <View style={styles.apptMarker} />
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>{appt.title}</Text>
            <Text style={styles.rowMeta}>{formatApptTime(appt.starts_at)}{name ? ` · ${name}` : ''}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textHairline} />
        </TouchableOpacity>
      );
    }

    const task = item.data;
    const name = memberName(task.assignee);
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
      >
        <View style={styles.taskMarker} />
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle}>{task.title}</Text>
          {name && <Text style={styles.rowMeta}>{name}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textHairline} />
      </TouchableOpacity>
    );
  }

  function renderSectionHeader({ section }: { section: DaySection }) {
    const isToday = section.title === 'Today';
    return (
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isToday && styles.sectionTitleToday]}>
          {section.title}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.circleName}>{circle?.name ?? 'Care Circle'}</Text>
          <Text style={styles.screenTitle}>Calendar</Text>
        </View>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddAppointment', {})}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={24} color={theme.colors.surface} />
        </TouchableOpacity>
      </View>

      {daySections.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No upcoming events.</Text>
        </View>
      ) : (
        <SectionList
          sections={daySections}
          keyExtractor={(item) => item.kind === 'appointment' ? `appt-${item.data.id}` : `task-${item.data.id}`}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: theme.spacing.screen, paddingTop: 56, paddingBottom: theme.spacing.lg },
  circleName: { fontSize: theme.fontSize.micro, fontFamily: theme.fontFamily.sansSemiBold, fontWeight: theme.fontWeight.semibold, color: theme.colors.textMuted, letterSpacing: theme.letterSpacing.wider, textTransform: 'uppercase', marginBottom: theme.spacing.xs },
  screenTitle: { fontSize: theme.fontSize.title, fontFamily: theme.fontFamily.sansBold, fontWeight: theme.fontWeight.bold, color: theme.colors.textPrimary, letterSpacing: theme.letterSpacing.tight },
  fab: { width: 44, height: 44, borderRadius: theme.borderRadius.fab, backgroundColor: theme.colors.sage, alignItems: 'center', justifyContent: 'center', ...theme.shadow.sage },
  list: { paddingBottom: 40 },
  sectionHeader: { paddingHorizontal: theme.spacing.screen, paddingTop: theme.spacing.xl, paddingBottom: theme.spacing.sm },
  sectionTitle: { fontSize: theme.fontSize.label, fontFamily: theme.fontFamily.sansSemiBold, fontWeight: theme.fontWeight.semibold, color: theme.colors.textSecondary, letterSpacing: theme.letterSpacing.wide, textTransform: 'uppercase' },
  sectionTitleToday: { color: theme.colors.overdueFg },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.screen, paddingVertical: theme.spacing.md, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, gap: theme.spacing.md },
  apptMarker: { width: 10, height: 10, borderRadius: 2, backgroundColor: theme.colors.sage, flexShrink: 0 },
  taskMarker: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.textMuted, flexShrink: 0 },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sansMedium, fontWeight: theme.fontWeight.medium, color: theme.colors.textPrimary },
  rowMeta: { fontSize: theme.fontSize.small, fontFamily: theme.fontFamily.sans, color: theme.colors.textMuted, marginTop: 2 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: theme.fontSize.body, fontFamily: theme.fontFamily.sans, color: theme.colors.textMuted },
});
