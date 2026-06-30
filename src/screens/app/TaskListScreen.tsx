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
import { ScaledText } from '../../components/ScaledText';
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
  const [filterProjectIds, setFilterProjectIds] = useState<string[]>([]);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  const { sections, loading: dataLoading, handleComplete, refresh } = useOverview(
    circle?.id ?? null,
    filter,
    currentUserId,
  );

  const { projects } = useProjectList(circle?.id ?? null);

  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((p) => map.set(p.id, p.title));
    return map;
  }, [projects]);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== 'done'),
    [projects],
  );

  const filteredSections = useMemo(() => {
    if (filter !== 'all' || filterProjectIds.length === 0) return sections;
    return sections
      .map((section) => ({
        ...section,
        data: section.data.filter((item) =>
          filterProjectIds.includes(item.data.project_id ?? ''),
        ),
      }))
      .filter((section) => section.data.length > 0);
  }, [sections, filter, filterProjectIds]);

  useFocusEffect(
    useCallback(() => {
      refresh();
      setFabOpen(false);
      setFilterDropdownOpen(false);
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
  const isFiltered = filter === 'all' && filterProjectIds.length > 0;

  function renderSectionHeader({ section }: { section: OverviewSection }) {
    const isToday = section.key === 'today';
    return (
      <View style={styles.sectionHeader}>
        <ScaledText style={[styles.sectionTitle, isToday && styles.sectionTitleToday]}>
          {section.title}
        </ScaledText>
        <ScaledText style={[styles.sectionCount, isToday && styles.sectionCountToday]}>
          {section.count}
        </ScaledText>
      </View>
    );
  }

  function buildMenuItems(item: OverviewItem): DropdownMenuItem[] {
    const hasProject = !!item.data.project_id;

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
    ? 'No tasks assigned to you.'
    : filter === 'done'
    ? 'No completed tasks yet.'
    : 'Nothing coming up.';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ScaledText style={styles.circleName}>{circle?.name ?? 'Care Circle'}</ScaledText>
          <ScaledText style={styles.screenTitle}>Overview</ScaledText>
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
              <ScaledText style={[styles.segmentLabel, filter === f && styles.segmentLabelActive]}>
                {f === 'all' ? 'Open' : f === 'mine' ? 'Mine' : 'Done'}
              </ScaledText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Filter row — only on Open tab */}
      {filter === 'all' && (
        <>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterIconBtn, filterDropdownOpen && styles.filterIconBtnActive]}
              onPress={() => { setFilterDropdownOpen((o) => !o); setFabOpen(false); }}
              hitSlop={8}
            >
              <Ionicons
                name="funnel-outline"
                size={16}
                color={filterDropdownOpen ? theme.colors.surface : theme.colors.sage}
              />
            </TouchableOpacity>

            {isFiltered && (
              <>
                <View style={styles.filterChipRow}>
                  {filterProjectIds.map((id) => (
                    <View key={id} style={styles.filterChip}>
                      <ScaledText style={styles.filterChipLabel} numberOfLines={1}>
                        {projectMap.get(id) ?? id}
                      </ScaledText>
                      <TouchableOpacity
                        onPress={() => setFilterProjectIds((ids) => ids.filter((i) => i !== id))}
                        hitSlop={6}
                      >
                        <Ionicons name="close" size={13} color={theme.colors.sageDark} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
                <TouchableOpacity onPress={() => setFilterProjectIds([])} hitSlop={8}>
                  <ScaledText style={styles.clearAllLabel}>Clear</ScaledText>
                </TouchableOpacity>
              </>
            )}
          </View>

          {filterDropdownOpen && (
            <View style={styles.filterDropdown}>
              {activeProjects.length === 0 ? (
                <ScaledText style={styles.filterDropdownEmpty}>No active projects</ScaledText>
              ) : (
                activeProjects.map((proj) => {
                  const selected = filterProjectIds.includes(proj.id);
                  return (
                    <TouchableOpacity
                      key={proj.id}
                      style={styles.filterDropdownRow}
                      onPress={() =>
                        setFilterProjectIds((ids) =>
                          selected ? ids.filter((i) => i !== proj.id) : [...ids, proj.id],
                        )
                      }
                      activeOpacity={0.7}
                    >
                      <ScaledText style={[styles.filterDropdownLabel, selected && styles.filterDropdownLabelSelected]}>
                        {proj.title}
                      </ScaledText>
                      {selected && <Ionicons name="checkmark" size={16} color={theme.colors.sage} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}
        </>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.sage} />
        </View>
      ) : filteredSections.length === 0 ? (
        <View style={styles.centered}>
          <ScaledText style={styles.emptyText}>
            {isFiltered ? 'Nothing matches your filter.' : emptyText}
          </ScaledText>
        </View>
      ) : (
        <SectionList<OverviewItem, OverviewSection>
          sections={filteredSections}
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
      {(fabOpen || filterDropdownOpen) && (
        <TouchableOpacity
          style={styles.fabBackdrop}
          onPress={() => { setFabOpen(false); setFilterDropdownOpen(false); }}
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
            <ScaledText style={styles.fabMenuLabel}>Appointment</ScaledText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fabMenuItem}
            onPress={() => { setFabOpen(false); navigation.navigate('AddTask', {}); }}
            activeOpacity={0.85}
          >
            <View style={styles.fabMenuIcon}>
              <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.sage} />
            </View>
            <ScaledText style={styles.fabMenuLabel}>Task</ScaledText>
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
  // Filter row
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.screen,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    minHeight: 36,
  },
  filterIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.sageTint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.sageLight,
    flexShrink: 0,
  },
  filterIconBtnActive: {
    backgroundColor: theme.colors.sage,
    borderColor: theme.colors.sage,
  },
  filterChipRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.sageTint,
    borderRadius: theme.borderRadius.chip,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: theme.colors.sageLight,
  },
  filterChipLabel: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sansMedium,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.sageDark,
    maxWidth: 120,
  },
  clearAllLabel: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
    flexShrink: 0,
  },
  // Filter dropdown
  filterDropdown: {
    marginHorizontal: theme.spacing.screen,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
    zIndex: 10,
  },
  filterDropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  filterDropdownLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textPrimary,
  },
  filterDropdownLabelSelected: {
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.sage,
  },
  filterDropdownEmpty: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textMuted,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
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
