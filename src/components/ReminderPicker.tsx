import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { theme } from '../constants/theme';
import { ScaledText } from './ScaledText';

const PRESET_MINUTES = [15, 30, 60, 120, 1440];

const UNIT_ITEMS = ['min', 'hours', 'days'] as const;
type Unit = typeof UNIT_ITEMS[number];
const UNIT_MULTIPLIERS: Record<Unit, number> = { min: 1, hours: 60, days: 1440 };

function parseCustom(minutes: number): { num: string; unit: Unit } {
  if (minutes % 1440 === 0) {
    const v = minutes / 1440;
    if (v >= 1 && v <= 99) return { num: String(v), unit: 'days' };
  }
  if (minutes % 60 === 0) {
    const v = minutes / 60;
    if (v >= 1 && v <= 99) return { num: String(v), unit: 'hours' };
  }
  return { num: String(Math.min(Math.max(minutes, 1), 99)), unit: 'min' };
}

interface ReminderPickerProps {
  value: number | null;
  onChange: (minutes: number | null) => void;
  isExpanded: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function ReminderPicker({ value, onChange, isExpanded, onToggle, disabled = false }: ReminderPickerProps) {
  const { t } = useTranslation();

  const isPreset = value !== null && PRESET_MINUTES.includes(value);
  const isCustom = value !== null && !isPreset;

  const existingCustom = isCustom && value !== null ? parseCustom(value) : null;

  const [showCustom, setShowCustom] = useState(false);
  const [numText, setNumText] = useState(existingCustom?.num ?? '30');
  const [unit, setUnit] = useState<Unit>(existingCustom?.unit ?? 'min');
  const [unitOpen, setUnitOpen] = useState(false);

  // Reset when panel closes
  useEffect(() => {
    if (!isExpanded) {
      setShowCustom(false);
      setUnitOpen(false);
    }
  }, [isExpanded]);

  function presetLabel(minutes: number): string {
    if (minutes < 60) return t('appointments.reminderMinutesBefore', { count: minutes });
    if (minutes < 1440) {
      const h = Math.round(minutes / 60);
      return h === 1 ? t('appointments.reminderHourBefore') : t('appointments.reminderHoursBefore', { count: h });
    }
    const d = Math.round(minutes / 1440);
    return d === 1 ? t('appointments.reminderDayBefore') : t('appointments.reminderDaysBefore', { count: d });
  }

  function formatReminder(minutes: number | null): string {
    if (minutes === null) return t('common.none');
    return presetLabel(minutes);
  }

  const unitLabels: Record<Unit, string> = {
    min: t('appointments.unitMin'),
    hours: t('appointments.unitHours'),
    days: t('appointments.unitDays'),
  };

  function openCustom() {
    if (isCustom && value !== null) {
      const parsed = parseCustom(value);
      setNumText(parsed.num);
      setUnit(parsed.unit);
    }
    setUnitOpen(false);
    setShowCustom(true);
  }

  function handleNumChange(text: string) {
    // Allow only digits, max 2 chars
    const digits = text.replace(/[^0-9]/g, '').slice(0, 2);
    setNumText(digits);
  }

  function handleDone() {
    const num = parseInt(numText, 10);
    if (isNaN(num) || num < 1 || num > 99) return;
    onChange(num * UNIT_MULTIPLIERS[unit]);
    setShowCustom(false);
    onToggle();
  }

  const numVal = parseInt(numText, 10);
  const canDone = !isNaN(numVal) && numVal >= 1 && numVal <= 99;

  return (
    <>
      {/* Remind me row */}
      <TouchableOpacity style={styles.expandRow} onPress={onToggle} disabled={disabled}>
        <ScaledText style={[styles.label, disabled && styles.labelDisabled]}>
          <ScaledText style={[styles.plus, disabled && styles.plusDisabled]}>+ </ScaledText>{t('appointments.remindMeLabel')}
        </ScaledText>
        <ScaledText style={[styles.value, disabled && styles.valueDisabled]}>
          {disabled ? t('appointments.setTimeFirst') : formatReminder(value)}
        </ScaledText>
      </TouchableOpacity>

      {/* Preset chips */}
      {isExpanded && !showCustom && (
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, value === null && styles.chipSelected]}
            onPress={() => { onChange(null); onToggle(); }}
          >
            <ScaledText style={[styles.chipLabel, value === null && styles.chipLabelSelected]}>
              {t('common.none')}
            </ScaledText>
          </TouchableOpacity>

          {PRESET_MINUTES.map((minutes) => {
            const selected = value === minutes;
            return (
              <TouchableOpacity
                key={minutes}
                style={[styles.chip, selected && styles.chipSelected]}
                onPress={() => { onChange(minutes); onToggle(); }}
              >
                <ScaledText style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                  {presetLabel(minutes)}
                </ScaledText>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.chip, isCustom && styles.chipSelected]}
            onPress={openCustom}
          >
            <ScaledText style={[styles.chipLabel, isCustom && styles.chipLabelSelected]}>
              {t('appointments.reminderCustom')}
            </ScaledText>
          </TouchableOpacity>
        </View>
      )}

      {/* Custom panel */}
      {isExpanded && showCustom && (
        <View style={styles.customPanel}>
          {/* Input row */}
          <View style={styles.inputRow}>
            {/* Number input */}
            <TextInput
              style={styles.numberInput}
              value={numText}
              onChangeText={handleNumChange}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
              placeholder="1–99"
              placeholderTextColor={theme.colors.textFaint}
            />

            {/* Unit dropdown */}
            <View style={styles.dropdownWrapper}>
              <TouchableOpacity
                style={[styles.unitTrigger, unitOpen && styles.unitTriggerOpen]}
                onPress={() => setUnitOpen((v) => !v)}
                activeOpacity={0.75}
              >
                <ScaledText style={styles.unitLabel}>{unitLabels[unit]}</ScaledText>
                <Ionicons
                  name={unitOpen ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={theme.colors.textSecondary}
                />
              </TouchableOpacity>

              {unitOpen && (
                <View style={styles.dropdownMenu}>
                  {UNIT_ITEMS.map((u, idx) => (
                    <TouchableOpacity
                      key={u}
                      style={[
                        styles.dropdownItem,
                        idx < UNIT_ITEMS.length - 1 && styles.dropdownItemDivider,
                      ]}
                      onPress={() => { setUnit(u); setUnitOpen(false); }}
                      activeOpacity={0.7}
                    >
                      <ScaledText style={[styles.dropdownItemText, u === unit && styles.dropdownItemTextSelected]}>
                        {unitLabels[u]}
                      </ScaledText>
                      {u === unit && (
                        <Ionicons name="checkmark" size={14} color={theme.colors.sageDark} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Done button */}
          <TouchableOpacity
            style={[styles.doneButton, !canDone && styles.doneButtonDisabled]}
            onPress={handleDone}
            disabled={!canDone}
            activeOpacity={0.85}
          >
            <ScaledText style={styles.doneLabel}>{t('common.done')}</ScaledText>
          </TouchableOpacity>
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
  plus: { color: theme.colors.sage },
  plusDisabled: { color: theme.colors.textFaint },
  labelDisabled: { color: theme.colors.textMuted },
  value: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textSecondary,
  },
  valueDisabled: {
    color: theme.colors.textFaint,
    fontStyle: 'italic',
  },

  // Preset chips
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

  // Custom panel
  customPanel: {
    paddingHorizontal: theme.spacing.screen,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },

  // Number text input
  numberInput: {
    width: 80,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.input,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansMedium,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },

  // Unit dropdown
  dropdownWrapper: {
    flex: 1,
  },
  unitTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.input,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  unitTriggerOpen: {
    borderColor: theme.colors.sageLight,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  unitLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansMedium,
    color: theme.colors.textPrimary,
  },
  dropdownMenu: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: theme.colors.sageLight,
    borderBottomLeftRadius: theme.borderRadius.input,
    borderBottomRightRadius: theme.borderRadius.input,
    backgroundColor: theme.colors.surfaceElevated,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  dropdownItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  dropdownItemText: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textSecondary,
  },
  dropdownItemTextSelected: {
    fontFamily: theme.fontFamily.sansSemiBold,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.sageDark,
  },

  // Done button
  doneButton: {
    backgroundColor: theme.colors.sage,
    borderRadius: theme.borderRadius.button,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadow.sage,
  },
  doneButtonDisabled: {
    backgroundColor: theme.colors.disabledBg,
    shadowOpacity: 0,
    elevation: 0,
  },
  doneLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansBold,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.surface,
  },
});
