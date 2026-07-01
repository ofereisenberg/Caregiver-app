import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';

import { theme } from '../constants/theme';
import { ScaledText } from './ScaledText';
import { DropdownMenuItem } from './DropdownMenu';
import { Appointment } from '../services/appointments';
import { Task } from '../services/tasks';
import { OverviewItem } from '../utils/overviewGrouping';
import { isTaskOverdue } from '../utils/taskGrouping';

const AVATAR_COLORS = [
  theme.colors.sageTint,
  theme.colors.overdueBg,
  theme.colors.waitingBg,
  theme.colors.surfaceNote,
];

interface Props {
  item: OverviewItem;
  memberMap: Map<string, { displayName: string; index: number }>;
  externalContactMap?: Map<string, string>;
  projectMap?: Map<string, string>;
  onPress: () => void;
  onComplete?: () => void;
  onUncheck?: () => void;
  onProjectTagPress?: () => void;
  menuItems?: DropdownMenuItem[];
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

function formatTaskMeta(task: Task): string | null {
  if (!task.due_date) return null;
  const dateStr = new Date(task.due_date).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  if (!task.start_time) return dateStr;
  const [sh, sm] = task.start_time.split(':').map(Number);
  const start = `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;
  if (!task.end_time) return `${dateStr} · ${start}`;
  const [eh, em] = task.end_time.split(':').map(Number);
  const end = `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
  return `${dateStr} · ${start} – ${end}`;
}

function ItemMenu({ items }: { items: DropdownMenuItem[] }) {
  return (
    <Menu>
      <MenuTrigger style={styles.menuButton}>
        <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.textMuted} />
      </MenuTrigger>
      <MenuOptions customStyles={menuOptionStyles}>
        {items.map((item, idx) => (
          <MenuOption key={item.label} onSelect={item.onPress}>
            {idx > 0 && <View style={styles.menuDivider} />}
            <ScaledText style={[styles.menuItemLabel, item.destructive && styles.menuItemLabelDestructive]}>
              {item.label}
            </ScaledText>
          </MenuOption>
        ))}
      </MenuOptions>
    </Menu>
  );
}

export function OverviewItemRow({ item, memberMap, externalContactMap, projectMap, onPress, onComplete, onUncheck, onProjectTagPress, menuItems }: Props) {
  if (item.kind === 'appointment') {
    const appt = item.data;
    const projectName = appt.project_id && projectMap ? projectMap.get(appt.project_id) : null;

    return (
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.apptIcon}>
          <Ionicons name="calendar-outline" size={15} color={theme.colors.sage} />
        </View>
        <View style={styles.content}>
          <ScaledText style={styles.title} numberOfLines={2}>{appt.title}</ScaledText>
          <ScaledText style={styles.apptMeta}>{formatApptMeta(appt)}</ScaledText>
          {!!appt.location && (
            <ScaledText style={styles.apptLocation} numberOfLines={1}>{appt.location}</ScaledText>
          )}
          {projectName && (
            <TouchableOpacity style={styles.projectTag} onPress={onProjectTagPress} hitSlop={4}>
              <Ionicons name="folder-outline" size={11} color={theme.colors.sageDark} />
              <ScaledText style={styles.projectTagText} numberOfLines={1}>{projectName}</ScaledText>
            </TouchableOpacity>
          )}
        </View>
        {menuItems && <ItemMenu items={menuItems} />}
      </TouchableOpacity>
    );
  }

  const task = item.data;
  const overdue = isTaskOverdue(task.due_date);
  const taskMeta = formatTaskMeta(task);
  const member = task.assignee ? memberMap.get(task.assignee) : null;
  const externalName = task.external_assignee_id ? (externalContactMap?.get(task.external_assignee_id) ?? null) : null;
  const idx = member?.index ?? 0;
  const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  const avatarFg = idx === 0 ? theme.colors.sageDark
    : idx === 1 ? theme.colors.overdueFg
    : theme.colors.textSecondary;
  const projectName = task.project_id && projectMap ? projectMap.get(task.project_id) : null;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <TouchableOpacity
        style={[styles.checkbox, task.completed && styles.checkboxDone]}
        onPress={task.completed ? onUncheck : onComplete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={task.completed && !onUncheck ? 1 : 0.7}
      >
        {task.completed
          ? <Text style={styles.checkmark}>✓</Text>
          : <View style={styles.checkboxInner} />}
      </TouchableOpacity>

      <View style={styles.content}>
        <ScaledText style={[styles.title, task.completed && styles.titleDone]} numberOfLines={2}>
          {task.title}
        </ScaledText>
        <View style={styles.taskMeta}>
          {overdue && (
            <View style={styles.overdueBadge}>
              <ScaledText style={styles.overdueBadgeText}>Overdue</ScaledText>
            </View>
          )}
          {taskMeta !== null && (
            <ScaledText style={[styles.dueLabel, overdue && styles.dueLabelOverdue]}>{taskMeta}</ScaledText>
          )}
          {!!task.recurrence && (
            <View style={styles.repeatsBadge}>
              <ScaledText style={styles.repeatsBadgeText}>Repeats</ScaledText>
            </View>
          )}
        </View>
        {projectName && (
          <TouchableOpacity style={styles.projectTag} onPress={onProjectTagPress} hitSlop={4}>
            <Ionicons name="folder-outline" size={11} color={theme.colors.sageDark} />
            <ScaledText style={styles.projectTagText} numberOfLines={1}>{projectName}</ScaledText>
          </TouchableOpacity>
        )}
      </View>

      {task.assignee ? (
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={[styles.avatarText, { color: avatarFg }]}>
            {member?.displayName.charAt(0).toUpperCase() ?? '?'}
          </Text>
        </View>
      ) : externalName ? (
        <View style={[styles.avatar, { backgroundColor: theme.colors.externalBg }]}>
          <Text style={[styles.avatarText, { color: theme.colors.externalFg }]}>
            {externalName.charAt(0).toUpperCase()}
          </Text>
        </View>
      ) : (
        <View style={[styles.avatar, styles.avatarUnassigned]}>
          <Text style={styles.avatarTextUnassigned}>?</Text>
        </View>
      )}
      {menuItems && <ItemMenu items={menuItems} />}
    </TouchableOpacity>
  );
}

const menuOptionStyles = {
  optionsContainer: {
    borderRadius: theme.borderRadius.card,
    overflow: 'hidden' as const,
    width: 210,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 8,
  },
  optionWrapper: {
    padding: 0,
  },
};

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
    maxWidth: 160,
  },
  menuButton: {
    paddingLeft: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    flexShrink: 0,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.divider,
    marginHorizontal: theme.spacing.md,
  },
  menuItemLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansMedium,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
  },
  menuItemLabelDestructive: {
    color: theme.colors.overdueFg,
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
