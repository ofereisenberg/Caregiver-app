import React from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { theme } from '../constants/theme';

export interface MenuAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DropdownMenuItem {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface Props {
  visible: boolean;
  anchor: MenuAnchor | null;
  items: DropdownMenuItem[];
  onDismiss: () => void;
}

const MENU_WIDTH = 210;

export function DropdownMenu({ visible, anchor, items, onDismiss }: Props) {
  if (!visible || !anchor) return null;

  const screenWidth = Dimensions.get('window').width;
  const menuRight = screenWidth - anchor.x - anchor.width;
  const menuTop = anchor.y + anchor.height + 6;

  return (
    <>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={onDismiss}
        activeOpacity={1}
      />
      <View style={[styles.menu, { top: menuTop, right: menuRight }]}>
        {items.map((item, idx) => (
          <React.Fragment key={item.label}>
            {idx > 0 && <View style={styles.divider} />}
            <TouchableOpacity
              style={styles.item}
              onPress={() => { onDismiss(); item.onPress(); }}
              activeOpacity={0.65}
            >
              <Text style={[styles.itemLabel, item.destructive && styles.itemLabelDestructive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.card,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.divider,
    marginHorizontal: theme.spacing.md,
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.lg,
  },
  itemLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sansMedium,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  itemLabelDestructive: {
    color: theme.colors.overdueFg,
  },
});
