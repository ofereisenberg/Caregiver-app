import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../hooks/useCircle';
import { useTaskList } from '../../hooks/useTaskList';
import { TaskItem } from '../../components/TaskItem';
import { Task } from '../../services/tasks';
import { TaskSection } from '../../utils/taskGrouping';
import { AppStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;

type Filter = 'all' | 'mine';

export function TaskListScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuth();
  const currentUserId = session?.user.id ?? '';

  const { circle, members, loading: circleLoading } = useCircle();

  const [filter, setFilter] = useState<Filter>('all');

  const { sections, loading: tasksLoading, handleComplete, refresh } = useTaskList(
    circle?.id ?? null,
    filter,
    currentUserId,
  );

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // userId → { displayName, index } for avatar rendering
  const memberMap = useMemo(() => {
    const map = new Map<string, { displayName: string; index: number }>();
    members.forEach((m, i) => map.set(m.user_id, { displayName: m.displayName, index: i }));
    return map;
  }, [members]);

  // Current user's avatar initial for the header
  const currentMember = memberMap.get(currentUserId);
  const headerInitial = currentMember?.displayName.charAt(0).toUpperCase() ?? '?';

  const isLoading = circleLoading || (tasksLoading && sections.length === 0);

  function renderSectionHeader({ section }: { section: TaskSection }) {
    const isToday = section.key === 'today';
    return (
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isToday && styles.sectionTitleToday]}>
          {section.title}
        </Text>
        <Text style={[styles.sectionCount, isToday && styles.sectionCountToday]}>
          {section.count}
        </Text>
      </View>
    );
  }

  function renderItem({ item }: { item: Task }) {
    const member = item.assignee ? memberMap.get(item.assignee) : null;
    return (
      <TaskItem
        task={item}
        assigneeName={member?.displayName ?? null}
        assigneeIndex={member?.index ?? 0}
        onPress={() => navigation.navigate('TaskDetail', { taskId: item.id })}
        onComplete={() => handleComplete(item.id)}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.circleName}>{circle?.name ?? 'Care Circle'}</Text>
          <Text style={styles.screenTitle}>Tasks</Text>
        </View>
        <TouchableOpacity
          style={styles.headerAvatar}
          onPress={() => navigation.navigate('UserSettings')}
        >
          <Text style={styles.headerAvatarText}>{headerInitial}</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented control */}
      <View style={styles.segmentedWrapper}>
        <View style={styles.segmented}>
          <TouchableOpacity
            style={[styles.segment, filter === 'all' && styles.segmentActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.segmentLabel, filter === 'all' && styles.segmentLabelActive]}>
              All tasks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, filter === 'mine' && styles.segmentActive]}
            onPress={() => setFilter('mine')}
          >
            <Text style={[styles.segmentLabel, filter === 'mine' && styles.segmentLabelActive]}>
              Mine
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.sage} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            {filter === 'mine' ? 'No tasks assigned to you.' : 'No tasks yet.'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddTask', {})}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.screen,
    paddingTop: 56,
    paddingBottom: theme.spacing.lg,
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
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.avatar,
    backgroundColor: theme.colors.sageTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: theme.fontSize.label,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.sageDark,
  },
  segmentedWrapper: {
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: theme.spacing.lg,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.button,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.button - 2,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: theme.colors.surfaceElevated,
    ...theme.shadow.lift,
  },
  segmentLabel: {
    fontSize: theme.fontSize.label,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
  },
  segmentLabelActive: {
    color: theme.colors.textPrimary,
  },
  list: {
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.screen,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSize.label,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textSecondary,
    letterSpacing: theme.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  sectionTitleToday: {
    color: theme.colors.overdueFg,
  },
  sectionCount: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textFaint,
  },
  sectionCountToday: {
    color: theme.colors.overdueFg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textMuted,
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
});
