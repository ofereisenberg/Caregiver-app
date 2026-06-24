import { ActivityIndicator, View } from 'react-native';

import { useAuthState } from '../hooks/useAuthState';
import { theme } from '../constants/theme';
import { AppNavigator } from './AppNavigator';
import { AuthNavigator } from './AuthNavigator';

export function RootNavigator() {
  const { session, loading } = useAuthState();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.canvas, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.sage} />
      </View>
    );
  }

  return session ? <AppNavigator /> : <AuthNavigator />;
}
