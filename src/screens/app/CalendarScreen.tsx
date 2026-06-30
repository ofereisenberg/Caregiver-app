import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Calendar, DateData } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../hooks/useCircle';
import { useAppointmentList } from '../../hooks/useAppointmentList';
import { useProjectList } from '../../hooks/useProjectList';
import { useTaskList } from '../../hooks/useTaskList';
import { useVacations } from '../../hooks/useVacations';
import { Appointment } from '../../services/appointments';
import { Task } from '../../services/tasks';
import { Vacation } from '../../services/vacations';
import { AppStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;

type CalendarItem =
  | { kind: 'appointment'; data: Appointment }
  | { kind: 'task'; data: Task }
  | { kind: 'vacation'; data: Vacation };

type CalendarMode = 'collapsed' | 'expanded';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const WEEK_COL_WIDTH = 28;
const DAY_COL_WIDTH = Math.floor((SCREEN_WIDTH - WEEK_COL_WIDTH - 2 * theme.spacing.screen) / 7);

const VACATION_COLOR = '#e05252';
const VACATION_BG = '#fdeaea';
const APPT_COLOR = '#4a7fc1';
const TASK_COLOR = '#5a9e6f';

function todayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function toDateKey(iso: string): string {
  return iso.split('T')[0];
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function buildWeekRows(year: number, month: number): Date[][] {
  const days = getDaysInMonth(year, month);
  const rows: Date[][] = [];
  // ISO week: Mon = 0 ... Sun = 6
  const firstDow = (days[0].getDay() + 6) % 7;
  let row: Date[] = new Array(firstDow).fill(null);
  for (const day of days) {
    row.push(day);
    if (row.length === 7) { rows.push(row); row = []; }
  }
  if (row.length > 0) {
    while (row.length < 7) row.push(null as unknown as Date);
    rows.push(row);
  }
  return rows;
}

function truncate(text: string, maxChars = 9): string {
  return text.length <= maxChars ? text : text.slice(0, maxChars - 1) + '…';
}

function formatApptTime(appt: Appointment): string {
  if (appt.is_full_day) return 'All day';
  const start = new Date(appt.starts_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  if (!appt.ends_at) return start;
  const end = new Date(appt.ends_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${start}–${end}`;
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

  const headerInitial = useMemo(() => {
    const m = members.find((mem) => mem.user_id === currentUserId);
    return m?.displayName.charAt(0).toUpperCase() ?? '?';
  }, [members, currentUserId]);

  const { appointments, refresh: refreshAppts } = useAppointmentList(circle?.id ?? null);
  const { projects } = useProjectList(circle?.id ?? null);
  const { sections: taskSections, refresh: refreshTasks } = useTaskList(circle?.id ?? null, 'all', currentUserId);
  const { vacations, refresh: refreshVacations } = useVacations(circle?.id ?? null);

  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.title));
    return map;
  }, [projects]);

  const today = todayKey();
  const [selectedDay, setSelectedDay] = useState<string>(today);
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('collapsed');
  const [fabOpen, setFabOpen] = useState(false);

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth()); // 0-indexed

  useFocusEffect(useCallback(() => {
    refreshAppts();
    refreshTasks();
    refreshVacations();
  }, [refreshAppts, refreshTasks, refreshVacations]));

  const tasksWithDates = useMemo(
    () => taskSections.flatMap((s) => s.data).filter((t) => t.due_date !== null),
    [taskSections],
  );

  // Build per-day event map including vacations
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

    // Expand each vacation into individual day entries
    for (const vacation of vacations) {
      const start = new Date(vacation.start_date + 'T00:00:00');
      const end = new Date(vacation.end_date + 'T00:00:00');
      const d = new Date(start);
      while (d <= end) {
        const key = d.toISOString().split('T')[0];
        if (!map.has(key)) map.set(key, []);
        // Only add once per vacation per day (guard against duplicates)
        if (!map.get(key)!.find((i) => i.kind === 'vacation' && i.data.id === vacation.id)) {
          map.get(key)!.push({ kind: 'vacation', data: vacation });
        }
        d.setDate(d.getDate() + 1);
      }
    }

    for (const [, items] of map) {
      items.sort((a, b) => {
        const order = { vacation: 0, appointment: 1, task: 2 };
        return order[a.kind] - order[b.kind];
      });
    }

    return map;
  }, [appointments, tasksWithDates, vacations]);

  // markedDates for the collapsed Calendar component
  const markedDates = useMemo(() => {
    const marks: Record<string, object> = {};

    for (const [dateKey, items] of eventsByDay) {
      const dots = [];
      if (items.some((i) => i.kind === 'vacation'))    dots.push({ color: VACATION_COLOR });
      if (items.some((i) => i.kind === 'appointment')) dots.push({ color: APPT_COLOR });
      if (items.some((i) => i.kind === 'task'))        dots.push({ color: TASK_COLOR });

      marks[dateKey] = {
        dots,
        marked: dots.length > 0,
      };
    }

    marks[selectedDay] = {
      ...(marks[selectedDay] ?? {}),
      selected: true,
      selectedColor: theme.colors.sage,
    };

    return marks;
  }, [eventsByDay, selectedDay]);

  // ── Mode toggle: swipe or tap the handle bar ────────────────────────────────
  // Kept exclusively on the modeBar so it never fights the Calendar's own
  // gesture handler or the FlatList's scroll responder.
  const calendarPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,   // claim every touch on the bar
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, g) => {
        if (g.dy < -20) { setCalendarMode('expanded'); return; }
        if (g.dy > 20)  { setCalendarMode('collapsed'); return; }
        // tap (tiny movement) → toggle
        if (Math.abs(g.dx) < 10 && Math.abs(g.dy) < 10) {
          setCalendarMode((m) => (m === 'collapsed' ? 'expanded' : 'collapsed'));
        }
      },
    }),
  ).current;

  // ── Swipe gesture on day-event panel (collapsed mode: moves day) ─────────────
  const dayPanelPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 20,
      onPanResponderRelease: (_, g) => {
        setSelectedDay((prev) => {
          const d = new Date(prev + 'T00:00:00');
          d.setDate(d.getDate() + (g.dx < 0 ? 1 : -1));
          return d.toISOString().split('T')[0];
        });
      },
    }),
  ).current;

  // ── Swipe on expanded grid (horizontal = change month) ───────────────────────
  const expandedPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 30,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) {
          setCurrentMonth((m) => {
            const next = m + 1;
            if (next > 11) { setCurrentYear((y) => y + 1); return 0; }
            return next;
          });
        } else if (g.dx > 40) {
          setCurrentMonth((m) => {
            const prev = m - 1;
            if (prev < 0) { setCurrentYear((y) => y - 1); return 11; }
            return prev;
          });
        }
      },
    }),
  ).current;

  function handleMonthChange(month: DateData) {
    setCurrentYear(month.year);
    setCurrentMonth(month.month - 1); // react-native-calendars uses 1-based months
  }

  function handleDayPress(day: DateData) {
    setSelectedDay(day.dateString);
    setCurrentYear(day.year);
    setCurrentMonth(day.month - 1);
  }

  // ── Expanded grid rendering ──────────────────────────────────────────────────
  function renderExpandedGrid() {
    const weekRows = buildWeekRows(currentYear, currentMonth);
    const monthLabel = new Date(currentYear, currentMonth, 1)
      .toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    return (
      <View {...expandedPan.panHandlers}>
        {/* Month navigation header */}
        <View style={styles.expandedMonthRow}>
          <TouchableOpacity
            onPress={() => setCurrentMonth((m) => { const p = m - 1; if (p < 0) { setCurrentYear((y) => y - 1); return 11; } return p; })}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={18} color={theme.colors.sage} />
          </TouchableOpacity>
          <Text style={styles.expandedMonthLabel}>{monthLabel}</Text>
          <TouchableOpacity
            onPress={() => setCurrentMonth((m) => { const n = m + 1; if (n > 11) { setCurrentYear((y) => y + 1); return 0; } return n; })}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={18} color={theme.colors.sage} />
          </TouchableOpacity>
        </View>

        {/* Day letter header */}
        <View style={styles.expandedHeaderRow}>
          <View style={[styles.weekNumCell, styles.expandedHeaderCell]} />
          {DAY_LABELS.map((label, i) => (
            <View key={i} style={[styles.expandedDayCell, styles.expandedHeaderCell]}>
              <Text style={styles.expandedHeaderLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Week rows */}
        {weekRows.map((row, rowIdx) => {
          const firstRealDay = row.find(Boolean);
          const weekNum = firstRealDay ? getWeekNumber(firstRealDay) : null;
          return (
            <View key={rowIdx} style={styles.expandedWeekRow}>
              <View style={[styles.weekNumCell, styles.expandedCell]}>
                <Text style={styles.weekNumText}>{weekNum ?? ''}</Text>
              </View>
              {row.map((day, colIdx) => {
                if (!day) return <View key={colIdx} style={styles.expandedDayCell} />;
                const key = day.toISOString().split('T')[0];
                const items = eventsByDay.get(key) ?? [];
                const isToday = key === today;
                const isSelected = key === selectedDay;
                return renderExpandedCell(key, day.getDate(), items, isToday, isSelected);
              })}
            </View>
          );
        })}
      </View>
    );
  }

  function renderExpandedCell(
    key: string,
    dateNum: number,
    items: CalendarItem[],
    isToday: boolean,
    isSelected: boolean,
  ) {
    const vacation = items.find((i) => i.kind === 'vacation');
    const nonVacation = items.filter((i) => i.kind !== 'vacation');
    const visible = [...(vacation ? [{ kind: 'vacation' as const, data: (vacation as { kind: 'vacation'; data: Vacation }).data }] : []), ...nonVacation].slice(0, 3);
    const overflow = items.length - visible.length;

    // Check if this day is the first day of a vacation
    const isFirstVacDay = vacation
      ? key === toDateKey((vacation as { kind: 'vacation'; data: Vacation }).data.start_date)
      : false;

    return (
      <TouchableOpacity
        key={key}
        style={[
          styles.expandedDayCell,
          styles.expandedCell,
          isSelected && styles.expandedCellSelected,
          vacation && styles.expandedCellVacation,
        ]}
        onPress={() => navigation.navigate('DayDetail', { dateKey: key })}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.expandedDateNum,
          isToday && styles.expandedDateNumToday,
          isSelected && styles.expandedDateNumSelected,
        ]}>
          {dateNum}
        </Text>

        {vacation && isFirstVacDay && (
          <Text style={styles.expandedVacationTitle} numberOfLines={1}>
            {truncate((vacation as { kind: 'vacation'; data: Vacation }).data.title, 8)}
          </Text>
        )}

        {nonVacation.slice(0, vacation ? 2 : 3).map((item, idx) => (
          <Text
            key={idx}
            style={[styles.expandedItemText, item.kind === 'appointment' ? styles.expandedAppt : styles.expandedTask]}
            numberOfLines={1}
          >
            {truncate(item.kind === 'appointment'
              ? item.data.title
              : item.data.title, 8)}
          </Text>
        ))}

        {overflow > 0 && (
          <Text style={styles.expandedOverflow}>+{overflow}</Text>
        )}
      </TouchableOpacity>
    );
  }

  function memberName(userId: string | null) {
    if (!userId) return null;
    return members.find((m) => m.user_id === userId)?.displayName ?? null;
  }

  function renderAgendaItem({ item }: { item: CalendarItem }) {
    if (item.kind === 'vacation') {
      return (
        <View style={styles.vacationRow}>
          <View style={styles.vacationMarker} />
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>{item.data.title}</Text>
            <Text style={styles.rowMeta}>
              {new Date(item.data.start_date + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              {' – '}
              {new Date(item.data.end_date + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
            </Text>
          </View>
        </View>
      );
    }

    if (item.kind === 'appointment') {
      const appt = item.data;
      const projectName = appt.project_id ? projectMap.get(appt.project_id) : null;
      return (
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: appt.id })}
          activeOpacity={0.7}
        >
          <View style={styles.apptMarker} />
          <View style={styles.rowContent}>
            <Text style={styles.rowTitle}>{appt.title}</Text>
            <Text style={styles.rowMeta}>{formatApptTime(appt)}</Text>
            {projectName && (
              <TouchableOpacity
                style={styles.projectTag}
                onPress={() => appt.project_id && navigation.navigate('ProjectDetail', { projectId: appt.project_id! })}
                hitSlop={4}
              >
                <Ionicons name="folder-outline" size={11} color={theme.colors.sageDark} />
                <Text style={styles.projectTagText}>{projectName}</Text>
              </TouchableOpacity>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textHairline} />
        </TouchableOpacity>
      );
    }

    const task = item.data;
    const name = memberName(task.assignee);
    const projectName = task.project_id ? projectMap.get(task.project_id) : null;
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
          {projectName && (
            <TouchableOpacity
              style={styles.projectTag}
              onPress={() => task.project_id && navigation.navigate('ProjectDetail', { projectId: task.project_id! })}
              hitSlop={4}
            >
              <Ionicons name="folder-outline" size={11} color={theme.colors.sageDark} />
              <Text style={styles.projectTagText}>{projectName}</Text>
            </TouchableOpacity>
          )}
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textHairline} />
      </TouchableOpacity>
    );
  }

  const selectedDayItems = eventsByDay.get(selectedDay) ?? [];
  const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.circleName}>{circle?.name ?? 'Care Circle'}</Text>
          <Text style={styles.screenTitle}>Calendar</Text>
        </View>
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => navigation.navigate('UserSettings')}
          hitSlop={8}
        >
          <Text style={styles.avatarText}>{headerInitial}</Text>
        </TouchableOpacity>
      </View>

      {/* Mode toggle handle — only gesture target for expand/collapse */}
      <View style={styles.modeBar} {...calendarPan.panHandlers}>
        <View style={styles.modePill} />
        <Ionicons
          name={calendarMode === 'collapsed' ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={theme.colors.textMuted}
        />
        <Text style={styles.modeHint}>
          {calendarMode === 'collapsed' ? 'Expand' : 'Collapse'}
        </Text>
      </View>

      {calendarMode === 'collapsed' ? (
        <>
          {/* Collapsed: react-native-calendars mini-month (no outer pan — Calendar owns its swipes) */}
          <View>
            <Calendar
              current={currentMonthKey}
              onDayPress={handleDayPress}
              onMonthChange={handleMonthChange}
              markedDates={markedDates}
              markingType="multi-dot"
              enableSwipeMonths
              firstDay={1}
              style={styles.calendar}
              theme={calendarTheme}
            />
          </View>

          {/* Day-event panel */}
          <View style={styles.agendaHeader} {...dayPanelPan.panHandlers}>
            <Text style={styles.agendaDate}>
              {selectedDay === today ? 'Today' : formatAgendaDate(selectedDay)}
            </Text>
          </View>

          {selectedDayItems.length === 0 ? (
            <View style={styles.empty} {...dayPanelPan.panHandlers}>
              <Text style={styles.emptyText}>Nothing on this day</Text>
            </View>
          ) : (
            <FlatList
              data={selectedDayItems}
              keyExtractor={(item) =>
                item.kind === 'vacation'
                  ? `vac-${item.data.id}`
                  : item.kind === 'appointment'
                  ? `appt-${item.data.id}`
                  : `task-${item.data.id}`
              }
              renderItem={renderAgendaItem}
              contentContainerStyle={styles.list}
            />
          )}
        </>
      ) : (
        // Expanded: custom grid
        <FlatList
          data={[null]}
          keyExtractor={() => 'grid'}
          renderItem={() => renderExpandedGrid()}
          contentContainerStyle={styles.expandedScrollContent}
        />
      )}

      {/* FAB backdrop */}
      {fabOpen && (
        <TouchableOpacity
          style={styles.fabBackdrop}
          onPress={() => setFabOpen(false)}
          activeOpacity={1}
        />
      )}

      {/* FAB speed-dial menu */}
      {fabOpen && (
        <View style={styles.fabMenu}>
          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => { setFabOpen(false); navigation.navigate('AddAppointment', { date: selectedDay }); }}
            activeOpacity={0.85}
          >
            <View style={styles.fabMenuIcon}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.sage} />
            </View>
            <Text style={styles.fabMenuLabel}>Appointment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => { setFabOpen(false); navigation.navigate('AddVacation'); }}
            activeOpacity={0.85}
          >
            <View style={styles.fabMenuIcon}>
              <Ionicons name="airplane-outline" size={16} color={theme.colors.sage} />
            </View>
            <Text style={styles.fabMenuLabel}>Vacation</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main FAB */}
      <TouchableOpacity
        style={[styles.fab, fabOpen && styles.fabActive]}
        onPress={() => setFabOpen((o) => !o)}
        activeOpacity={0.85}
      >
        <Text style={[styles.fabIcon, fabOpen && styles.fabIconActive]}>
          {fabOpen ? '×' : '+'}
        </Text>
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
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.sageTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: theme.fontSize.label,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.sageDark,
  },

  modeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: 12,        // generous touch target
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  modePill: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.borderMid,
    marginRight: theme.spacing.xs,
  },
  modeHint: {
    fontSize: theme.fontSize.micro,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
    letterSpacing: theme.letterSpacing.wide,
    textTransform: 'uppercase',
  },

  calendar: { marginHorizontal: theme.spacing.xs },

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
  list: { paddingBottom: 100 },
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
  vacationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: VACATION_BG,
    paddingHorizontal: theme.spacing.screen,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    gap: theme.spacing.md,
  },
  vacationMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: VACATION_COLOR,
    flexShrink: 0,
  },
  apptMarker: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: APPT_COLOR,
    flexShrink: 0,
  },
  taskMarker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: TASK_COLOR,
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
  projectTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.sageTint,
    borderRadius: theme.borderRadius.badge,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    marginTop: theme.spacing.xs,
  },
  projectTagText: {
    fontSize: theme.fontSize.micro,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.sageDark,
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
  fabActive: {
    backgroundColor: theme.colors.sageDark,
  },
  fabIcon: {
    fontSize: 28,
    color: theme.colors.surface,
    lineHeight: 32,
    fontFamily: theme.fontFamily.sans,
    fontWeight: theme.fontWeight.regular,
  },
  fabIconActive: {
    fontSize: 32,
    lineHeight: 36,
  },
  fabBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(47, 46, 43, 0.25)',
  },
  fabMenu: {
    position: 'absolute',
    bottom: 100,
    right: theme.spacing.screen,
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.button,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    ...theme.shadow.lift,
  },
  fabMenuIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.sageTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabMenuLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },

  // ── Expanded grid ────────────────────────────────────────────────────────────
  expandedScrollContent: { paddingBottom: 100 },

  expandedMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.screen,
    paddingVertical: theme.spacing.sm,
  },
  expandedMonthLabel: {
    fontSize: theme.fontSize.label,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
  expandedHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  expandedHeaderCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedHeaderLabel: {
    fontSize: theme.fontSize.micro,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
  },
  expandedWeekRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.screen,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  weekNumCell: {
    width: WEEK_COL_WIDTH,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  weekNumText: {
    fontSize: 9,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textFaint,
  },
  expandedDayCell: {
    width: DAY_COL_WIDTH,
    minHeight: 72,
    paddingHorizontal: 1,
    paddingVertical: 3,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.divider,
  },
  expandedCell: {
    minHeight: 72,
  },
  expandedCellSelected: {
    backgroundColor: theme.colors.sageTint,
  },
  expandedCellVacation: {
    backgroundColor: VACATION_BG,
  },
  expandedDateNum: {
    fontSize: theme.fontSize.micro,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  expandedDateNumToday: {
    color: theme.colors.sage,
  },
  expandedDateNumSelected: {
    color: theme.colors.sageDark,
  },
  expandedVacationTitle: {
    fontSize: 9,
    fontFamily: theme.fontFamily.sans,
    color: VACATION_COLOR,
    lineHeight: 11,
    marginBottom: 1,
  },
  expandedItemText: {
    fontSize: 9,
    fontFamily: theme.fontFamily.sans,
    lineHeight: 11,
    marginBottom: 1,
  },
  expandedAppt: { color: APPT_COLOR },
  expandedTask:  { color: TASK_COLOR },
  expandedOverflow: {
    fontSize: 9,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
  },
});
