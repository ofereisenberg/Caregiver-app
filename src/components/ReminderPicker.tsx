import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { theme } from '../constants/theme';
import { ScaledText } from './ScaledText';

const PRESETS: { label: string; minutes: number }[] = [
  { label: '15 min before', minutes: 15 },
  { label: '30 min before', minutes: 30 },
  { label: '1 hour before', minutes: 60 },
  { label: '2 hours before', minutes: 120 },
  { label: '1 day before', minutes: 1440 },
];

function formatReminder(minutes: number | null): string {
  if (minutes === null) return 'None';
  const preset = PRESETS.find((p) => p.minutes === minutes);
  if (preset) return preset.label;
  if (minutes < 60) return `${minutes} min before`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} hours before`;
  return `${Math.round(minutes / 1440)} days before`;
}

interface ReminderPickerProps {
  value: number | null;
  onChange: (minutes: number | null) => void;
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function ReminderPicker({ value, onChange, isExpanded, onToggle, disabled = false }: ReminderPickerProps) {
  return (
    <>
      <TouchableOpacity style={styles.expandRow} onPress={onToggle} disabled={disabled}>
        <ScaledText style={[styles.label, disabled && styles.labelDisabled]}>
          <ScaledText style={[styles.plus, disabled && styles.plusDisabled]}>+ </ScaledText>Remind me
        </ScaledText>
        <ScaledText style={[styles.value, disabled && styles.valueDisabled]}>
          {disabled ? 'Set a time first' : formatReminder(value)}
        </ScaledText>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, value === null && styles.chipSelected]}
            onPress={() => { onChange(null); onToggle(); }}
          >
            <ScaledText style={[styles.chipLabel, value === null && styles.chipLabelSelected]}>
              None
            </ScaledText>
          </TouchableOpacity>

          {PRESETS.map((preset) => {
            const selected = value === preset.minutes;
            return (
              <TouchableOpacity
                key={preset.minutes}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => { onChange(preset.minutes); onToggle(); }}
              >
                <ScaledText style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                  {preset.label}
                </ScaledText>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.screen,
  },
  label: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansMedium,
    color: theme.colors.textPrimary,
  },
  plus: {
    color: theme.colors.sage,
  },
  plusDisabled: {
    color: theme.colors.textFaint,
  },
  labelDisabled: {
    color: theme.colors.textMuted,
  },
  value: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textSecondary,
  },
  valueDisabled: {
    color: theme.colors.textFaint,
    fontStyle: 'italic',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: theme.spacing.md,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.chip,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  chipSelected: {
    backgroundColor: theme.colors.sageTint,
    borderColor: theme.colors.sageLight,
  },
  chipLabel: {
    fontSize: theme.fontSize.label,
    fontFamily: theme.fontFamily.sansMedium,
    color: theme.colors.textSecondary,
  },
  chipLabelSelected: {
    color: theme.colors.sageDark,
  },
});
