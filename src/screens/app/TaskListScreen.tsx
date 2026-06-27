import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../hooks/useCircle';
import { useOverview } from '../../hooks/useOverview';
import { useProjectList } from '../../hooks/useProjectList';
import { DropdownMenuItem } from '../../components/DropdownMenu';
import { OverviewItemRow } from '../../components/OverviewItemRow';
import { OverviewItem, OverviewSection } from '../../utils/overviewGrouping';
import { updateTask, deleteTask, uncompleteTask } from '../../services/tasks';
import { updateAppointment, deleteAppointment } from '../../services/appointments';
import { AppStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Filter = 'all' | 'mine' | 'done';

export function TaskListScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuth();
  const currentUserId = session?.user.id ?? '';

  const { circle, members, loading: circleLoading } = useCircle();
  const [filter, setFilter] = useState<Filter>('all');
  const [fabOpen, setFabOpen] = useState(false);

  const { sections, loading: dataLoading, handleComplete, refresh } = useOverview(
    circle?.id ?? null,
    filter,
  );

  const { projects } = useProjectList(circle?.id ?? null);

  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.title));
    return map;
  }, [projects]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      setFabOpen(false);
    }, [refresh]),
  );

  const memberMap = useMemo(() => {
    const map = new Map<string, { displayName: string; index: number }>();
    members.forEach((m, i) => map.set(m.user_id, { displayName: m.displayName, index: i }));
    return map;
  }, [members]);

  const currentMember = memberMap.get(currentUserId);
  const headerInitial = currentMember?.displayName.charAt(0).toUpperCase() ?? '?';

  const isLoading = circleLoading || (dataLoading && sections.length === 0);

  function renderSectionHeader({ section }: { section: OverviewSection }) {
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

  function buildMenuItems(item: OverviewItem): DropdownMenuItem[] {
    const hasProject = !!item.data.project_id;
    const activeProjects = projects.filter((p) => p.status !== 'done');

    const deleteItem = async () => {
      if (item.kind === 'task') await deleteTask(item.data.id);
      else await deleteAppointment(item.data.id);
      refresh();
    };

    const confirmDelete = () => {
      Alert.alert(`Delete ${item.kind}`, 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteItem },
      ]);
    };

    const linkToProject = (projectId: string) => {
      if (item.kind === 'task') updateTask(item.data.id, { project_id: projectId }).then(() => refresh());
      else updateAppointment(item.data.id, { project_id: projectId }).then(() => refresh());
    };

    const unlinkProject = () => {
      if (item.kind === 'task') updateTask(item.data.id, { project_id: null }).then(() => refresh());
      else updateAppointment(item.data.id, { project_id: null }).then(() => refresh());
    };

    const showProjectPicker = () => {
      if (activeProjects.length === 0) {
        Alert.alert('No projects', 'Create a project first, then link items to it.');
        return;
      }
      Alert.alert(
        'Add to project',
        undefined,
        [
          ...activeProjects.map((p) => ({ text: p.title, onPress: () => linkToProject(p.id) })),
          { text: 'Cancel', style: 'cancel' as const },
        ],
      );
    };

    const items: DropdownMenuItem[] = [];
    if (hasProject) {
      items.push({ label: 'Change project', onPress: showProjectPicker });
      items.push({ label: 'Remove from project', onPress: unlinkProject });
    } else {
      items.push({ label: 'Add to project', onPress: showProjectPicker });
    }
    items.push({ label: 'Delete', destructive: true, onPress: confirmDelete });
    return items;
  }

  function handleUncheck(taskId: string) {
    Alert.alert(
      'Re-open task?',
      'This will move it back to your active list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Re-open',
          onPress: async () => {
            await uncompleteTask(taskId);
            refresh();
          },
        },
      ],
    );
  }

  function renderItem({ item }: { item: OverviewItem }) {
    const itemProjectId = item.data.project_id ?? null;
    return (
      <OverviewItemRow
        item={item}
        memberMap={memberMap}
        projectMap={projectMap}
        onPress={() => {
          if (item.kind === 'task') {
            navigation.navigate('TaskDetail', { taskId: item.data.id });
          } else {
            navigation.navigate('AppointmentDetail', { appointmentId: item.data.id });
          }
        }}
        onComplete={item.kind === 'task' ? () => handleComplete(item.data.id) : undefined}
        onUncheck={item.kind === 'task' && filter === 'done' ? () => handleUncheck(item.data.id) : undefined}
        onProjectTagPress={itemProjectId ? () => navigation.navigate('ProjectDetail', { projectId: itemProjectId }) : undefined}
        menuItems={buildMenuItems(item)}
      />
    );
  }

  const emptyText = filter === 'mine'
    ? 'Nothing assigned to you.'
    : filter === 'done'
    ? 'No completed tasks yet.'
    : 'Nothing coming up.';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.circleName}>{circle?.name ?? 'Care Circle'}</Text>
          <Text style={styles.screenTitle}>Overview</Text>
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
          {(['all', 'mine', 'done'] as Filter[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.segment, filter === f && styles.segmentActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.segmentLabel, filter === f && styles.segmentLabelActive]}>
                {f === 'all' ? 'Open' : f === 'mine' ? 'Mine' : 'Done'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.sage} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      ) : (
        <SectionList<OverviewItem, OverviewSection>
          sections={sections}
          keyExtractor={(item) =>
            item.kind === 'task' ? `task-${item.data.id}` : `appt-${item.data.id}`
          }
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
        />
      )}

      {/* FAB backdrop — closes menu when tapping outside */}
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
            onPress={() => { setFabOpen(false); navigation.navigate('AddAppointment', {}); }}
            activeOpacity={0.85}
          >
            <View style={styles.fabMenuIcon}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.sage} />
            </View>
            <Text style={styles.fabMenuLabel}>Appointment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => { setFabOpen(false); navigation.navigate('AddTask', {}); }}
            activeOpacity={0.85}
          >
            <View style={styles.fabMenuIcon}>
              <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.sage} />
            </View>
            <Text style={styles.fabMenuLabel}>Task</Text>
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
  // FAB
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
  // FAB speed-dial
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
});
