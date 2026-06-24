import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../../constants/theme';

export function InviteManagementScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Invite Management</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: theme.fontSize.body, color: theme.colors.textMuted },
});
