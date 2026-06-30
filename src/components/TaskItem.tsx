import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '../constants/theme';
import { ScaledText } from './ScaledText';
import { Task } from '../services/tasks';
import { formatDueLabel, isTaskOverdue } from '../utils/taskGrouping';

// Deterministic avatar color from a small palette — cycles by index in circle
const AVATAR_COLORS = [
  theme.colors.sageTint,
  theme.colors.overdueBg,
  theme.colors.waitingBg,
  theme.colors.surfaceNote,
];

interface TaskItemProps {
  task: Task;
  assigneeName: string | null;
  assigneeIndex: number; // position in circle member list, for avatar color
  onPress: () => void;
  onComplete: () => void;
}

export function TaskItem({ task, assigneeName, assigneeIndex, onPress, onComplete }: TaskItemProps) {
  const overdue = isTaskOverdue(task.due_date);
  const dueLabel = formatDueLabel(task.due_date);
  const avatarColor = AVATAR_COLORS[assigneeIndex % AVATAR_COLORS.length];
  const avatarInitial = assigneeName ? assigneeName.charAt(0).toUpperCase() : '?';
  const avatarFg = assigneeIndex === 0 ? theme.colors.sageDark
    : assigneeIndex === 1 ? theme.colors.overdueFg
    : theme.colors.textSecondary;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {/* Checkbox */}
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

      {/* Content */}
      <View style={styles.content}>
        <ScaledText style={[styles.title, task.completed && styles.titleDone]} numberOfLines={2}>{task.title}</ScaledText>
        <View style={styles.meta}>
          {overdue && (
            <View style={styles.overdueBadge}>
              <ScaledText style={styles.overdueBadgeText}>Overdue</ScaledText>
            </View>
          )}
          {dueLabel !== '' && (
            <ScaledText style={[styles.dueLabel, overdue && styles.dueLabelOverdue]}>{dueLabel}</ScaledText>
          )}
          {task.recurrence && (
            <View style={styles.repeatsBadge}>
              <ScaledText style={styles.repeatsBadgeText}>Repeats</ScaledText>
            </View>
          )}
        </View>
      </View>

      {/* Assignee avatar */}
      {task.assignee ? (
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={[styles.avatarText, { color: avatarFg }]}>{avatarInitial}</Text>
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
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  checkboxDone: {
    borderColor: theme.colors.sage,
    backgroundColor: theme.colors.sage,
  },
  checkmark: {
    fontSize: 13,
    color: theme.colors.surface,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
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
  meta: {
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
