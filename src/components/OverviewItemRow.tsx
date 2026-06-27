import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../constants/theme';
import { Appointment } from '../services/appointments';
import { Task } from '../services/tasks';
import { OverviewItem } from '../utils/overviewGrouping';
import { formatDueLabel, isTaskOverdue } from '../utils/taskGrouping';

const AVATAR_COLORS = [
  theme.colors.sageTint,
  theme.colors.overdueBg,
  theme.colors.waitingBg,
  theme.colors.surfaceNote,
];

interface Props {
  item: OverviewItem;
  memberMap: Map<string, { displayName: string; index: number }>;
  onPress: () => void;
  onComplete?: () => void;
}

function formatApptMeta(appt: Appointment): string {
  const startDate = new Date(appt.starts_at);
  const dateStr = startDate.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  if (appt.is_full_day) return `${dateStr} · All day`;
  const startTime = startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  if (!appt.ends_at) return `${dateStr} · ${startTime}`;
  const endTime = new Date(appt.ends_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${dateStr} · ${startTime} – ${endTime}`;
}

function formatTaskTimeMeta(task: Task): string | null {
  if (!task.start_time) return null;
  const [sh, sm] = task.start_time.split(':').map(Number);
  const start = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
  if (!task.end_time) return start;
  const [eh, em] = task.end_time.split(':').map(Number);
  return `${start} – ${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

export function OverviewItemRow({ item, memberMap, onPress, onComplete }: Props) {
  if (item.kind === 'appointment') {
    const appt = item.data;
    return (
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.apptIcon}>
          <Ionicons name="calendar-outline" size={15} color={theme.colors.sage} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>{appt.title}</Text>
          <Text style={styles.apptMeta}>{formatApptMeta(appt)}</Text>
          {!!appt.location && (
            <Text style={styles.apptLocation} numberOfLines={1}>{appt.location}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  const task = item.data;
  const overdue = isTaskOverdue(task.due_date);
  const dueLabel = formatDueLabel(task.due_date);
  const timeMeta = formatTaskTimeMeta(task);
  const member = task.assignee ? memberMap.get(task.assignee) : null;
  const idx = member?.index ?? 0;
  const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  const avatarFg = idx === 0 ? theme.colors.sageDark
    : idx === 1 ? theme.colors.overdueFg
    : theme.colors.textSecondary;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <TouchableOpacity
        style={[styles.checkbox, task.completed && styles.checkboxDone]}
        onPress={task.completed ? undefined : onComplete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={task.completed ? 1 : 0.7}
      >
        {task.completed
          ? <Text style={styles.checkmark}>✓</Text>
          : <View style={styles.checkboxInner} />}
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={[styles.title, task.completed && styles.titleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        <View style={styles.taskMeta}>
          {overdue && (
            <View style={styles.overdueBadge}>
              <Text style={styles.overdueBadgeText}>Overdue</Text>
            </View>
          )}
          {dueLabel !== '' && (
            <Text style={[styles.dueLabel, overdue && styles.dueLabelOverdue]}>{dueLabel}</Text>
          )}
          {timeMeta !== null && (
            <Text style={styles.timeMeta}>{timeMeta}</Text>
          )}
          {!!task.recurrence && (
            <View style={styles.repeatsBadge}>
              <Text style={styles.repeatsBadgeText}>Repeats</Text>
            </View>
          )}
        </View>
      </View>

      {task.assignee ? (
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={[styles.avatarText, { color: avatarFg }]}>
            {member?.displayName.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </View>
      ) : (
        <View style={[styles.avatar, styles.avatarUnassigned]}>
          <Text style={styles.avatarTextUnassigned}>?</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.screen,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  // Appointment left icon
  apptIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.sageTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    flexShrink: 0,
  },
  // Task checkbox
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.borderMid,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    flexShrink: 0,
  },
  checkboxDone: {
    borderColor: theme.colors.sage,
    backgroundColor: theme.colors.sage,
  },
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  checkmark: {
    fontSize: 13,
    color: theme.colors.surface,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
  },
  // Shared content
  content: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  title: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansMedium,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
    lineHeight: 21,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  // Task meta row
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  overdueBadge: {
    backgroundColor: theme.colors.overdueBg,
    borderRadius: theme.borderRadius.badge,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  overdueBadgeText: {
    fontSize: theme.fontSize.micro,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.overdueFg,
    letterSpacing: theme.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  dueLabel: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textMuted,
  },
  dueLabelOverdue: {
    color: theme.colors.overdueFg,
  },
  timeMeta: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textMuted,
  },
  repeatsBadge: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.badge,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  repeatsBadgeText: {
    fontSize: theme.fontSize.micro,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
  },
  // Appointment meta
  apptMeta: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textMuted,
  },
  apptLocation: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textFaint,
  },
  // Task avatar
  avatar: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.avatar,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.md,
    flexShrink: 0,
  },
  avatarText: {
    fontSize: theme.fontSize.label,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
  },
  avatarUnassigned: {
    backgroundColor: theme.colors.disabledBg,
  },
  avatarTextUnassigned: {
    fontSize: theme.fontSize.label,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.disabledFg,
  },
});
