import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';

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

function todayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function toDateKey(iso: string): string {
  return iso.split('T')[0];
}

function formatApptTime(appt: Appointment): string {
  if (appt.is_full_day) return 'All day';
  const start = new Date(appt.starts_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  if (!appt.ends_at) return start;
  const end = new Date(appt.ends_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${start} – ${end}`;
}

function formatAgendaDate(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00');
  if (isNaN(d.getTime())) return dateKey;
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function CalendarScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuth();
  const currentUserId = session?.user.id ?? '';

  const { circle, members } = useCircle();
  const { appointments, refresh: refreshAppts } = useAppointmentList(circle?.id ?? null);
  const { sections: taskSections, refresh: refreshTasks } = useTaskList(
    circle?.id ?? null, 'all', currentUserId,
  );

  const [selectedDay, setSelectedDay] = useState<string>(todayKey());

  useFocusEffect(useCallback(() => {
    refreshAppts();
    refreshTasks();
  }, [refreshAppts, refreshTasks]));

  const tasksWithDates = useMemo(
    () => taskSections.flatMap((s) => s.data).filter((t) => t.due_date !== null),
    [taskSections],
  );

  // Map of dateKey → sorted CalendarItems across all dates
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();

    for (const appt of appointments) {
      const key = toDateKey(appt.starts_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ kind: 'appointment', data: appt });
    }

    for (const task of tasksWithDates) {
      const key = toDateKey(task.due_date!);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ kind: 'task', data: task });
    }

    // Sort each day: appointments first by time, tasks after
    for (const [, items] of map) {
      items.sort((a, b) => {
        if (a.kind === 'appointment' && b.kind === 'appointment') {
          return a.data.starts_at.localeCompare(b.data.starts_at);
        }
        return a.kind === 'appointment' ? -1 : 1;
      });
    }

    return map;
  }, [appointments, tasksWithDates]);

  // Dot markers for the Calendar — one dot per day with events
  const markedDates = useMemo(() => {
    const marks: Record<string, object> = {};

    for (const [dateKey] of eventsByDay) {
      marks[dateKey] = {
        marked: true,
        dotColor: dateKey === selectedDay ? theme.colors.surface : theme.colors.sage,
      };
    }

    // Selected day highlight — merges with event dot if present
    marks[selectedDay] = {
      ...(marks[selectedDay] ?? {}),
      selected: true,
      selectedColor: theme.colors.sage,
      dotColor: theme.colors.surface,
    };

    return marks;
  }, [eventsByDay, selectedDay]);

  const selectedDayItems = eventsByDay.get(selectedDay) ?? [];
  const today = todayKey();

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
          activeOpacity={0.7}
        >
          <View style={styles.apptMarker} />
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>{appt.title}</Text>
            <Text style={styles.rowMeta}>
              {formatApptTime(appt)}{name ? ` · ${name}` : ''}
            </Text>
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
        activeOpacity={0.7}
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.circleName}>{circle?.name ?? 'Care Circle'}</Text>
          <Text style={styles.screenTitle}>Calendar</Text>
        </View>
      </View>

      <Calendar
        current={selectedDay}
        onDayPress={(day: DateData) => setSelectedDay(day.dateString)}
        markedDates={markedDates}
        enableSwipeMonths
        style={styles.calendar}
        theme={calendarTheme}
      />

      <View style={styles.agendaHeader}>
        <Text style={styles.agendaDate}>
          {selectedDay === today ? 'Today' : formatAgendaDate(selectedDay)}
        </Text>
      </View>

      {selectedDayItems.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Nothing on this day</Text>
        </View>
      ) : (
        <FlatList
          data={selectedDayItems}
          keyExtractor={(item) =>
            item.kind === 'appointment' ? `appt-${item.data.id}` : `task-${item.data.id}`
          }
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddAppointment', { date: selectedDay })}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const calendarTheme = {
  backgroundColor: 'transparent',
  calendarBackground: 'transparent',
  textSectionTitleColor: theme.colors.textMuted,
  selectedDayBackgroundColor: theme.colors.sage,
  selectedDayTextColor: theme.colors.surface,
  todayTextColor: theme.colors.sage,
  todayBackgroundColor: theme.colors.sageTint,
  dayTextColor: theme.colors.textPrimary,
  textDisabledColor: theme.colors.textFaint,
  dotColor: theme.colors.sage,
  selectedDotColor: theme.colors.surface,
  arrowColor: theme.colors.sage,
  monthTextColor: theme.colors.textPrimary,
  textDayFontFamily: theme.fontFamily.sans,
  textMonthFontFamily: theme.fontFamily.sansBold,
  textDayHeaderFontFamily: theme.fontFamily.sansSemiBold,
  textDayFontSize: theme.fontSize.body,
  textMonthFontSize: theme.fontSize.subhead,
  textDayHeaderFontSize: theme.fontSize.micro,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.screen,
    paddingTop: 56,
    paddingBottom: theme.spacing.sm,
  },
  circleName: {
    fontSize: theme.fontSize.micro,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
    letterSpacing: theme.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  screenTitle: {
    fontSize: theme.fontSize.title,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    letterSpacing: theme.letterSpacing.tight,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: theme.spacing.screen,
    width: 54,
    height: 54,
    borderRadius: theme.borderRadius.fab,
    backgroundColor: theme.colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.sage,
  },
  fabIcon: {
    fontSize: 28,
    color: theme.colors.surface,
    lineHeight: 32,
    fontFamily: theme.fontFamily.sans,
    fontWeight: theme.fontWeight.regular,
  },
  calendar: {
    marginHorizontal: theme.spacing.xs,
  },
  agendaHeader: {
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    marginTop: theme.spacing.sm,
  },
  agendaDate: {
    fontSize: theme.fontSize.label,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    letterSpacing: theme.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  list: { paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.screen,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    gap: theme.spacing.md,
  },
  apptMarker: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: theme.colors.sage,
    flexShrink: 0,
  },
  taskMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.textMuted,
    flexShrink: 0,
  },
  rowContent: { flex: 1 },
  rowTitle: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansMedium,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  rowMeta: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textMuted,
  },
});
