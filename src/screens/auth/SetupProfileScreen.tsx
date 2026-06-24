import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../../constants/theme';

export function SetupProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Setup Profile</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: theme.fontSize.body, color: theme.colors.textMuted },
});
