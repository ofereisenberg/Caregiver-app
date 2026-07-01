import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { useCircle } from '../../hooks/useCircle';
import { useVacations } from '../../hooks/useVacations';
import { updateVacation } from '../../services/vacations';
import { ScaledText } from '../../components/ScaledText';
import { AppStackParamList } from '../../navigation/types';
import { toLocalISODate } from '../../utils/dateUtils';

type Nav = NativeStackNavigationProp<AppStackParamList>;
type Route = RouteProp<AppStackParamList, 'EditVacation'>;

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function toDateString(date: Date): string {
  return toLocalISODate(date);
}

function oneWeekLater(from: Date): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 6);
  return d;
}

type DateField = 'start' | 'end';

export function EditVacationScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { vacationId } = route.params;

  const { session } = useAuth();
  const currentUserId = session?.user.id ?? '';
  const { circle, members } = useCircle();
  const { vacations } = useVacations(circle?.id ?? null);

  const vacation = vacations.find((v) => v.id === vacationId);
  const isOwner = vacation?.user_id === currentUserId;

  const titleRef = useRef<TextInput>(null);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [withMemberIds, setWithMemberIds] = useState<string[]>([]);
  const [iosDateField, setIosDateField] = useState<DateField | null>(null);
  const [expandWith, setExpandWith] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (vacation && !initialized) {
      setTitle(vacation.title);
      setStartDate(new Date(vacation.start_date + 'T00:00:00'));
      setEndDate(new Date(vacation.end_date + 'T00:00:00'));
      setWithMemberIds((vacation.with_member_ids as string[]) ?? []);
      setInitialized(true);
    }
  }, [vacation, initialized]);

  const otherMembers = members.filter((m) => m.user_id !== vacation?.user_id);

  function openDatePicker(field: DateField) {
    const value = field === 'start' ? startDate : endDate;
    const minDate = field === 'end' ? startDate : new Date();

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        minimumDate: minDate,
        onValueChange: (_event, selected) => {
          if (!selected) return;
          if (field === 'start') {
            setStartDate(selected);
            if (selected > endDate) setEndDate(oneWeekLater(selected));
          } else {
            setEndDate(selected);
          }
        },
      });
    } else {
      setIosDateField(field);
    }
  }

  function handleIosDateChange(_event: unknown, selected: Date | undefined) {
    if (!selected || !iosDateField) { setIosDateField(null); return; }
    if (iosDateField === 'start') {
      setStartDate(selected);
      if (selected > endDate) setEndDate(oneWeekLater(selected));
    } else {
      setEndDate(selected);
    }
    setIosDateField(null);
  }

  function toggleWithMember(userId: string) {
    setWithMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  const handleSave = useCallback(async () => {
    if (!title.trim() || !vacation) return;
    setSaving(true);
    setError(null);

    const { error: saveError } = await updateVacation(vacation.id, {
      title: title.trim(),
      start_date: toDateString(startDate),
      end_date: toDateString(endDate),
      with_member_ids: withMemberIds,
    });

    setSaving(false);
    if (saveError) {
      setError(saveError);
    } else {
      navigation.goBack();
    }
  }, [title, vacation, startDate, endDate, withMemberIds, navigation]);

  const canSave = initialized && isOwner && title.trim().length > 0 && !saving;

  if (!initialized) {
    return (
      <View style={[styles.sheet, styles.loadingContainer]}>
        <ActivityIndicator color={theme.colors.sage} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.sheet}
      behavior="padding"
    >
      <View style={styles.handle} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ScaledText style={styles.heading}>Edit vacation</ScaledText>

        <TextInput
          ref={titleRef}
          style={styles.titleInput}
          placeholder="e.g. Sam is in Denmark"
          placeholderTextColor={theme.colors.textFaint}
          value={title}
          onChangeText={setTitle}
          autoFocus
          returnKeyType="done"
          multiline={false}
        />
        <View style={styles.inputDivider} />

        {/* Start date */}
        <TouchableOpacity style={styles.expandRow} onPress={() => openDatePicker('start')}>
          <View style={styles.rowLeft}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.sage} style={styles.rowIcon} />
            <ScaledText style={styles.expandRowLabel}>From</ScaledText>
          </View>
          <ScaledText style={styles.expandRowValue}>{formatDate(startDate)}</ScaledText>
        </TouchableOpacity>
        {Platform.OS === 'ios' && iosDateField === 'start' && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display="inline"
            minimumDate={new Date()}
            onValueChange={handleIosDateChange}
            style={styles.inlinePicker}
          />
        )}
        <View style={styles.rowDivider} />

        {/* End date */}
        <TouchableOpacity style={styles.expandRow} onPress={() => openDatePicker('end')}>
          <View style={styles.rowLeft}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.sage} style={styles.rowIcon} />
            <ScaledText style={styles.expandRowLabel}>Until</ScaledText>
          </View>
          <ScaledText style={styles.expandRowValue}>{formatDate(endDate)}</ScaledText>
        </TouchableOpacity>
        {Platform.OS === 'ios' && iosDateField === 'end' && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display="inline"
            minimumDate={startDate}
            onValueChange={handleIosDateChange}
            style={styles.inlinePicker}
          />
        )}
        <View style={styles.rowDivider} />

        {/* With members (optional) */}
        {otherMembers.length > 0 && (
          <>
            <TouchableOpacity style={styles.expandRow} onPress={() => setExpandWith((v) => !v)}>
              <View style={styles.rowLeft}>
                <Ionicons name="people-outline" size={16} color={theme.colors.sage} style={styles.rowIcon} />
                <ScaledText style={styles.expandRowLabel}>With</ScaledText>
              </View>
              <ScaledText style={styles.expandRowValue}>
                {withMemberIds.length === 0
                  ? 'Nobody'
                  : withMemberIds.length === 1
                  ? members.find((m) => m.user_id === withMemberIds[0])?.displayName ?? '1 person'
                  : `${withMemberIds.length} people`}
              </ScaledText>
            </TouchableOpacity>
            {expandWith && (
              <View style={styles.chipRow}>
                {otherMembers.map((member) => {
                  const selected = withMemberIds.includes(member.user_id);
                  return (
                    <TouchableOpacity
                      key={member.user_id}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => toggleWithMember(member.user_id)}
                    >
                      <ScaledText style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                        {member.displayName.split(' ')[0]}
                      </ScaledText>
                      {selected && (
                        <Ionicons name="checkmark" size={13} color={theme.colors.sageDark} style={styles.chipCheck} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            <View style={styles.rowDivider} />
          </>
        )}

        {error && <ScaledText style={styles.errorText}>{error}</ScaledText>}

        <TouchableOpacity
          style={[styles.addButton, !canSave && styles.addButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={theme.colors.surface} />
          ) : (
            <ScaledText style={styles.addButtonLabel}>Save changes</ScaledText>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.modal,
    borderTopRightRadius: theme.borderRadius.modal,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderMid,
    alignSelf: 'center',
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: 48,
  },
  heading: {
    fontSize: theme.fontSize.subhead,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  titleInput: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textPrimary,
    paddingVertical: theme.spacing.sm,
    minHeight: 36,
  },
  inputDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.xl,
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    marginRight: theme.spacing.sm,
  },
  expandRowLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  expandRowValue: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textMuted,
  },
  rowDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.chip,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  chipSelected: {
    backgroundColor: theme.colors.sageTint,
    borderColor: theme.colors.sageLight,
  },
  chipLabel: {
    fontSize: theme.fontSize.label,
    fontFamily: theme.fontFamily.sansMedium,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textSecondary,
  },
  chipLabelSelected: {
    color: theme.colors.sageDark,
  },
  chipCheck: {
    marginLeft: 4,
  },
  inlinePicker: {
    marginBottom: theme.spacing.md,
  },
  errorText: {
    fontSize: theme.fontSize.small,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.overdueFg,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  addButton: {
    backgroundColor: theme.colors.sage,
    borderRadius: theme.borderRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    ...theme.shadow.sage,
  },
  addButtonDisabled: {
    backgroundColor: theme.colors.disabledBg,
    shadowOpacity: 0,
    elevation: 0,
  },
  addButtonLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.surface,
  },
});
