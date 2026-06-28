import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../hooks/useCircle';
import { useProject } from '../../hooks/useProject';
import { useProjectNotes } from '../../hooks/useProjectNotes';
import { deleteProject, deleteProjectAndItems, updateProject } from '../../services/projects';
import { ProjectNote } from '../../services/projectNotes';
import { uncompleteTask, Task } from '../../services/tasks';
import { Appointment } from '../../services/appointments';
import { AppStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'ProjectDetail'>;

type ActiveTab = 'active' | 'notes' | 'past';

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

type ChildItem =
  | { kind: 'task'; data: Task }
  | { kind: 'appointment'; data: Appointment };

function formatApptTime(appt: Appointment): string {
  const start = new Date(appt.starts_at);
  const dateStr = start.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  if (appt.is_full_day) return `${dateStr} · All day`;
  const startTime = start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  if (!appt.ends_at) return `${dateStr} · ${startTime}`;
  const endTime = new Date(appt.ends_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${dateStr} · ${startTime} – ${endTime}`;
}

function formatDue(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00');
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function formatNoteTime(isoStr: string): string {
  const d = new Date(isoStr);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  if (isToday) return `Today · ${timeStr}`;
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) {
    return `${d.toLocaleDateString(undefined, { weekday: 'short' })} · ${timeStr}`;
  }
  return `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · ${timeStr}`;
}

export function ProjectDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { projectId } = route.params;

  const { session } = useAuth();
  const { circle, members } = useCircle();
  const { project, loading, refresh, handleCompleteTask } = useProject(projectId);
  const { notes, addNote, removeNote } = useProjectNotes(
    projectId,
    circle?.id ?? null,
    session?.user.id ?? null,
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>('active');
  const [draftNote, setDraftNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  function handleDelete() {
    Alert.alert(
      'Delete project',
      'Do you want to delete just the project, or the project and all its tasks and appointments?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Keep items',
          onPress: async () => {
            await deleteProject(projectId);
            navigation.goBack();
          },
        },
        {
          text: 'Delete all',
          style: 'destructive',
          onPress: async () => {
            await deleteProjectAndItems(projectId);
            navigation.goBack();
          },
        },
      ],
    );
  }

  function handleChangeStatus() {
    const allStatuses: Array<{ key: string; label: string }> = [
      { key: 'not_started', label: 'Not started' },
      { key: 'in_progress', label: 'In progress' },
      { key: 'done', label: 'Done' },
    ];
    const options = allStatuses.filter((s) => s.key !== project?.status);
    Alert.alert(
      'Change status',
      `Current: ${STATUS_LABEL[project?.status ?? ''] ?? project?.status}`,
      [
        { text: 'Cancel', style: 'cancel' },
        ...options.map((s) => ({
          text: s.label,
          onPress: async () => {
            await updateProject(projectId, { status: s.key });
            refresh();
          },
        })),
      ],
    );
  }

  async function handleSendNote() {
    const content = draftNote.trim();
    if (!content || submittingNote) return;
    setSubmittingNote(true);
    const err = await addNote(content);
    if (!err) setDraftNote('');
    setSubmittingNote(false);
  }

  function handleLongPressNote(note: ProjectNote) {
    if (note.created_by !== session?.user.id) return;
    Alert.alert('Delete note', 'Remove this note?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeNote(note.id) },
    ]);
  }

  function handleUncompleteTask(taskId: string) {
    Alert.alert(
      'Re-open task?',
      'This will move it back to the Active tab.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Re-open',
          onPress: async () => {
            await uncompleteTask(taskId);
            if (project?.status === 'done') {
              await updateProject(projectId, { status: 'in_progress' });
            }
            refresh();
          },
        },
      ],
    );
  }

  if (loading || !project) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.sage} />
      </View>
    );
  }

  const now = new Date();
  const memberMap = new Map(members.map((m) => [m.user_id, m.displayName]));

  // Partition into active and past child items
  const activeTasks = project.tasks.filter((t) => !t.completed);
  const activeAppts = project.appointments.filter((a) => new Date(a.starts_at) >= now);
  const pastTasks = project.tasks.filter((t) => t.completed);
  const pastAppts = project.appointments.filter((a) => new Date(a.starts_at) < now);

  const activeItems: ChildItem[] = [
    ...activeTasks.map((t): ChildItem => ({ kind: 'task', data: t })),
    ...activeAppts.map((a): ChildItem => ({ kind: 'appointment', data: a })),
  ];
  const pastItems: ChildItem[] = [
    ...pastTasks.map((t): ChildItem => ({ kind: 'task', data: t })),
    ...pastAppts.map((a): ChildItem => ({ kind: 'appointment', data: a })),
  ];

  const visibleItems = activeTab === 'past' ? pastItems : activeItems;
  const colors = STATUS_COLORS[project.status] ?? STATUS_COLORS.not_started;
  const ownerName = project.owner ? memberMap.get(project.owner) ?? 'Unknown' : null;
  const dueStr = project.due_date ? formatDue(project.due_date) : null;

  function renderItem({ item }: { item: ChildItem }) {
    if (item.kind === 'appointment') {
      const appt = item.data;
      return (
        <TouchableOpacity
          style={styles.itemRow}
          onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: appt.id })}
          activeOpacity={0.7}
        >
          <View style={styles.apptIcon}>
            <Ionicons name="calendar-outline" size={15} color={theme.colors.sage} />
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle} numberOfLines={2}>{appt.title}</Text>
            <Text style={styles.itemMeta}>{formatApptTime(appt)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color={theme.colors.textHairline} />
        </TouchableOpacity>
      );
    }

    const task = item.data;
    return (
      <TouchableOpacity
        style={styles.itemRow}
        onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
        activeOpacity={0.7}
      >
        <TouchableOpacity
          style={[styles.checkbox, task.completed && styles.checkboxDone]}
          onPress={() => activeTab === 'past' ? handleUncompleteTask(task.id) : handleCompleteTask(task.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          {task.completed
            ? <Text style={styles.checkmark}>✓</Text>
            : <View style={styles.checkboxInner} />}
        </TouchableOpacity>
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, task.completed && styles.itemTitleDone]} numberOfLines={2}>
            {task.title}
          </Text>
          {task.due_date && (
            <Text style={styles.itemMeta}>Due {formatDue(task.due_date)}</Text>
          )}
        </View>
        {task.assignee && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(memberMap.get(task.assignee) ?? '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={15} color={theme.colors.textHairline} />
      </TouchableOpacity>
    );
  }

  function renderNote({ item }: { item: ProjectNote }) {
    const authorName = memberMap.get(item.created_by) ?? 'Unknown';
    const isOwn = item.created_by === session?.user.id;
    return (
      <TouchableOpacity
        style={styles.noteRow}
        onLongPress={() => handleLongPressNote(item)}
        activeOpacity={isOwn ? 0.7 : 1}
        delayLongPress={400}
      >
        <View style={styles.noteAvatar}>
          <Text style={styles.noteAvatarText}>{authorName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.noteContent}>
          <View style={styles.noteHeader}>
            <Text style={styles.noteAuthor}>{authorName}</Text>
            <Text style={styles.noteTime}>{formatNoteTime(item.created_at)}</Text>
          </View>
          <Text style={styles.noteText}>{item.content}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Back */}
      <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={20} color={theme.colors.sage} />
        <Text style={styles.backLabel}>Projects</Text>
      </TouchableOpacity>

      {/* Project header */}
      <View style={styles.projectHeader}>
        <Text style={styles.projectTitle}>{project.title}</Text>

        <View style={styles.projectMeta}>
          <TouchableOpacity
            style={[styles.statusBadge, { backgroundColor: colors.bg }]}
            onPress={handleChangeStatus}
            activeOpacity={0.7}
          >
            <Text style={[styles.statusBadgeText, { color: colors.fg }]}>
              {STATUS_LABEL[project.status] ?? project.status}
            </Text>
          </TouchableOpacity>
          {ownerName && <Text style={styles.metaText}>{ownerName}</Text>}
          {dueStr && <Text style={styles.metaText}>Due {dueStr}</Text>}
        </View>

        {project.description ? (
          <Text style={styles.projectDesc}>{project.description}</Text>
        ) : null}
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabLabel, activeTab === 'active' && styles.tabLabelActive]}>
            Active {activeItems.length > 0 ? `(${activeItems.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notes' && styles.tabActive]}
          onPress={() => setActiveTab('notes')}
        >
          <Text style={[styles.tabLabel, activeTab === 'notes' && styles.tabLabelActive]}>
            Notes {notes.length > 0 ? `(${notes.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.tabActive]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabLabel, activeTab === 'past' && styles.tabLabelActive]}>
            Past {pastItems.length > 0 ? `(${pastItems.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'notes' ? (
        <View style={styles.notesContainer}>
          <FlatList
            data={notes}
            keyExtractor={(item) => item.id}
            renderItem={renderNote}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No notes yet — add one below</Text>
              </View>
            }
            contentContainerStyle={styles.notesListContent}
          />
          <View style={styles.composeRow}>
            <TextInput
              style={styles.composeInput}
              value={draftNote}
              onChangeText={setDraftNote}
              placeholder="Add a note…"
              placeholderTextColor={theme.colors.textFaint}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!draftNote.trim() || submittingNote) && styles.sendButtonDisabled]}
              onPress={handleSendNote}
              disabled={!draftNote.trim() || submittingNote}
              hitSlop={8}
            >
              <Ionicons
                name="send"
                size={18}
                color={draftNote.trim() && !submittingNote ? theme.colors.sage : theme.colors.textFaint}
              />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => `${item.kind}-${item.data.id}`}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {activeTab === 'active' ? 'No active tasks or appointments' : 'Nothing here yet'}
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Add FAB — only on active tab */}
      {activeTab === 'active' && (
        <View style={[styles.fabRow, { bottom: 48 + insets.bottom }]}>
          <TouchableOpacity
            style={styles.fabSecondary}
            onPress={() => navigation.navigate('AddTask', { projectId })}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.sageDark} />
            <Text style={styles.fabSecondaryLabel}>Add task</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fabSecondary}
            onPress={() => navigation.navigate('AddAppointment', { projectId })}
            activeOpacity={0.85}
          >
            <Ionicons name="calendar-outline" size={18} color={theme.colors.sageDark} />
            <Text style={styles.fabSecondaryLabel}>Add appointment</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.deleteRow, { paddingBottom: theme.spacing.md + insets.bottom }]}
        onPress={handleDelete}
      >
        <Text style={styles.deleteLabel}>Delete project</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.screen,
    paddingTop: 56,
    paddingBottom: theme.spacing.sm,
    gap: 2,
  },
  backLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.sage,
  },
  projectHeader: {
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.sm,
  },
  projectTitle: {
    fontSize: theme.fontSize.subhead,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
  },
  projectMeta: {
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
  metaText: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textMuted,
  },
  projectDesc: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
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
    fontSize: theme.fontSize.label,
    fontFamily: theme.fontFamily.sansMedium,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textMuted,
  },
  tabLabelActive: {
    color: theme.colors.sageDark,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
  },
  listContent: { paddingBottom: 120 },
  separator: { height: 1, backgroundColor: theme.colors.divider },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.screen,
    backgroundColor: theme.colors.surface,
    gap: theme.spacing.md,
  },
  apptIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.sageTint,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexShrink: 0,
  },
  checkboxDone: {
    borderColor: theme.colors.sage,
    backgroundColor: theme.colors.sage,
  },
  checkboxInner: { width: 10, height: 10, borderRadius: 5 },
  checkmark: {
    fontSize: 13,
    color: theme.colors.surface,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
  },
  itemContent: { flex: 1, gap: theme.spacing.xs },
  itemTitle: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansMedium,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
    lineHeight: 21,
  },
  itemTitleDone: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  itemMeta: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textMuted,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.sageTint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: theme.fontSize.micro,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.sageDark,
  },
  emptyState: {
    paddingVertical: theme.spacing.xl * 2,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textFaint,
  },
  fabRow: {
    position: 'absolute',
    right: theme.spacing.screen,
    flexDirection: 'column',
    gap: theme.spacing.sm,
    alignItems: 'flex-end',
  },
  fabSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.button,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    ...theme.shadow.card,
  },
  fabSecondaryLabel: {
    fontSize: theme.fontSize.label,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.sageDark,
  },
  deleteRow: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.canvas,
  },
  deleteLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.overdueFg,
  },
  notesContainer: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
  },
  notesListContent: { paddingBottom: theme.spacing.md },
  noteRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.screen,
    backgroundColor: theme.colors.surface,
  },
  noteAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.sageTint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  noteAvatarText: {
    fontSize: theme.fontSize.label,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.sageDark,
  },
  noteContent: { flex: 1, gap: theme.spacing.xs },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  noteAuthor: {
    fontSize: theme.fontSize.label,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  noteTime: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textMuted,
  },
  noteText: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  composeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.screen,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    backgroundColor: theme.colors.surface,
  },
  composeInput: {
    flex: 1,
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.canvas,
    borderRadius: theme.borderRadius.chip,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    maxHeight: 120,
    minHeight: 40,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
