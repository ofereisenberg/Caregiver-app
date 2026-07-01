import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { useExternalContacts } from '../../hooks/useExternalContacts';
import { useProjectList } from '../../hooks/useProjectList';
import { Project } from '../../services/projects';
import { ScaledText } from '../../components/ScaledText';
import { AppStackParamList } from '../../navigation/types';
import { personSelectionFromProject, resolvePersonName } from '../../types/PersonSelection';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type ActiveTab = 'active' | 'done';

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  done: 'Done',
};

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  not_started: { bg: theme.colors.disabledBg, fg: theme.colors.textMuted },
  in_progress: { bg: theme.colors.sageTint, fg: theme.colors.sageDark },
  done: { bg: theme.colors.waitingBg, fg: theme.colors.textSecondary },
};

function formatDueDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00');
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

interface ProjectRowProps {
  project: Project;
  ownerName: string | null;
  isExternalOwner: boolean;
  onPress: () => void;
}

function ProjectRow({ project, ownerName, isExternalOwner, onPress }: ProjectRowProps) {
  const colors = STATUS_COLORS[project.status] ?? STATUS_COLORS.not_started;
  const dueStr = formatDueDate(project.due_date);
  const isDone = project.status === 'done';

  return (
    <TouchableOpacity
      style={[styles.row, isDone && styles.rowDone]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowContent}>
        <ScaledText style={[styles.rowTitle, isDone && styles.rowTitleDone]} numberOfLines={2}>
          {project.title}
        </ScaledText>
        <View style={styles.rowMeta}>
          <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
            <ScaledText style={[styles.statusBadgeText, { color: colors.fg }]}>
              {STATUS_LABEL[project.status] ?? project.status}
            </ScaledText>
          </View>
          {ownerName && (
            <ScaledText style={[styles.ownerText, isExternalOwner && styles.ownerTextExternal]}>
              {ownerName.split(' ')[0]}
            </ScaledText>
          )}
          {dueStr && (
            <ScaledText style={styles.dueText}>Due {dueStr}</ScaledText>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.textHairline} />
    </TouchableOpacity>
  );
}

export function ProjectsScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuth();
  const { circle, members, loading: circleLoading } = useCircle();

  const { projects, loading: dataLoading, refresh } = useProjectList(circle?.id ?? null);
  const { contacts: externalContacts } = useExternalContacts(circle?.id ?? null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('active');

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const currentMember = useMemo(() => {
    const userId = session?.user.id ?? '';
    return members.find((m) => m.user_id === userId);
  }, [session, members]);
  const headerInitial = currentMember?.displayName.charAt(0).toUpperCase() ?? '?';

  const activeProjects = projects.filter((p) => p.status !== 'done');
  const doneProjects = projects.filter((p) => p.status === 'done');
  const visibleProjects = activeTab === 'active' ? activeProjects : doneProjects;

  const isLoading = circleLoading || (dataLoading && projects.length === 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ScaledText style={styles.circleName}>{circle?.name ?? ''}</ScaledText>
          <ScaledText style={styles.headerTitle}>Projects</ScaledText>
        </View>
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => navigation.navigate('UserSettings')}
          hitSlop={8}
        >
          <Text style={styles.avatarText}>{headerInitial}</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <ScaledText style={[styles.tabLabel, activeTab === 'active' && styles.tabLabelActive]}>
            Active{activeProjects.length > 0 ? ` (${activeProjects.length})` : ''}
          </ScaledText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'done' && styles.tabActive]}
          onPress={() => setActiveTab('done')}
        >
          <ScaledText style={[styles.tabLabel, activeTab === 'done' && styles.tabLabelActive]}>
            Completed{doneProjects.length > 0 ? ` (${doneProjects.length})` : ''}
          </ScaledText>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.sage} />
        </View>
      ) : visibleProjects.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-outline" size={48} color={theme.colors.textFaint} />
          <ScaledText style={styles.emptyTitle}>
            {activeTab === 'active' ? 'No active projects' : 'No completed projects'}
          </ScaledText>
          {activeTab === 'active' && (
            <ScaledText style={styles.emptySubtitle}>
              Projects help you group related tasks and appointments into one place.
            </ScaledText>
          )}
        </View>
      ) : (
        <FlatList
          data={visibleProjects}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => {
            const sel = personSelectionFromProject(item.owner, item.external_owner_id ?? null);
            const ownerName = sel ? resolvePersonName(sel, members, externalContacts) : null;
            return (
              <ProjectRow
                project={item}
                ownerName={ownerName}
                isExternalOwner={sel?.type === 'external'}
                onPress={() => navigation.navigate('ProjectDetail', { projectId: item.id })}
              />
            );
          }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddProject')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={theme.colors.surface} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
    letterSpacing: theme.letterSpacing.wide,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: theme.fontSize.title,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.sage,
  },
  tabLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansMedium,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textMuted,
  },
  tabLabelActive: {
    color: theme.colors.sage,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
  },
  listContent: { paddingBottom: 100 },
  separator: { height: 1, backgroundColor: theme.colors.divider },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.screen,
    backgroundColor: theme.colors.surface,
  },
  rowDone: { opacity: 0.6 },
  rowContent: { flex: 1, gap: theme.spacing.xs },
  rowTitle: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansMedium,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
    lineHeight: 21,
  },
  rowTitleDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  statusBadge: {
    borderRadius: theme.borderRadius.badge,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontSize: theme.fontSize.micro,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    letterSpacing: theme.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  ownerText: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textMuted,
  },
  ownerTextExternal: {
    color: theme.colors.externalFg,
  },
  dueText: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textMuted,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.screen * 2,
    gap: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.fontSize.subhead,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: theme.spacing.screen,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.sage,
  },
});
