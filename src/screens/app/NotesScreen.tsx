import { StyleSheet, View } from 'react-native';

import { theme } from '../../constants/theme';
import { ScaledText } from '../../components/ScaledText';

export function NotesScreen() {
  return (
    <View style={styles.container}>
      <ScaledText style={styles.label}>Notes</ScaledText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.canvas, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: theme.fontSize.body, color: theme.colors.textMuted },
});
