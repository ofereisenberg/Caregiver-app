import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { theme } from '../constants/theme';
import { AppNavigator } from './AppNavigator';
import { AuthNavigator } from './AuthNavigator';

export function RootNavigator() {
  const { setupStage } = useAuth();

  if (setupStage === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.canvas, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.sage} />
      </View>
    );
  }

  return setupStage === 'complete' ? <AppNavigator /> : <AuthNavigator />;
}
