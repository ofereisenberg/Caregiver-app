import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { joinCircleWithToken } from '../../services/circle';

export function JoinCircleScreen() {
  const navigation = useNavigation();
  const { recheckSetup } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Please enter an invite code.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: joinError } = await joinCircleWithToken(trimmed);
    setLoading(false);
    if (joinError) {
      setError(joinError);
      return;
    }
    await recheckSetup();
    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backRow} onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={20} color={theme.colors.sage} />
        <Text style={styles.backLabel}>Settings</Text>
      </TouchableOpacity>

      <Text style={styles.screenTitle}>Join a circle</Text>
      <Text style={styles.subtitle}>Enter the invite code shared with you.</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Enter invite code"
          placeholderTextColor={theme.colors.textMuted}
          value={code}
          onChangeText={(t) => { setCode(t); setError(null); }}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleJoin}
          autoFocus
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.surface} />
          ) : (
            <Text style={styles.buttonLabel}>Join circle</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
    paddingHorizontal: theme.spacing.screen,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: theme.spacing.sm,
    gap: 2,
  },
  backLabel: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.sage,
  },
  screenTitle: {
    fontSize: theme.fontSize.title,
    fontFamily: theme.fontFamily.sansBold,
    color: theme.colors.textPrimary,
    letterSpacing: theme.letterSpacing.tight,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.xl,
  },
  subtitle: {
    fontSize: theme.fontSize.body,
    fontFamily: theme.fontFamily.sans,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  form: {
    gap: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.input,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    fontFamily: theme.fontFamily.sansBold,
    fontSize: theme.fontSize.subhead,
    letterSpacing: theme.letterSpacing.wide,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  error: {
    fontFamily: theme.fontFamily.sans,
    fontSize: theme.fontSize.small,
    color: theme.colors.overdueFg,
  },
  button: {
    backgroundColor: theme.colors.sage,
    borderRadius: theme.borderRadius.button,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadow.sage,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.disabledBg,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonLabel: {
    fontFamily: theme.fontFamily.sansBold,
    fontSize: theme.fontSize.body,
    color: theme.colors.surface,
  },
});
