import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CheckEmailScreen } from '../screens/auth/CheckEmailScreen';
import { EnterEmailScreen } from '../screens/auth/EnterEmailScreen';
import { InviteManagementScreen } from '../screens/auth/InviteManagementScreen';
import { LanguagePickerScreen } from '../screens/auth/LanguagePickerScreen';
import { SelectCircleScreen } from '../screens/auth/SelectCircleScreen';
import { SetupCircleScreen } from '../screens/auth/SetupCircleScreen';
import { SetupProfileScreen } from '../screens/auth/SetupProfileScreen';
import { theme } from '../constants/theme';
import { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.canvas },
      }}
    >
      <Stack.Screen name="LanguagePicker" component={LanguagePickerScreen} />
      <Stack.Screen name="EnterEmail" component={EnterEmailScreen} />
      <Stack.Screen name="CheckEmail" component={CheckEmailScreen} />
      <Stack.Screen name="SetupProfile" component={SetupProfileScreen} />
      <Stack.Screen name="SetupCircle" component={SetupCircleScreen} />
      <Stack.Screen name="SelectCircle" component={SelectCircleScreen} />
      <Stack.Screen name="InviteManagement" component={InviteManagementScreen} />
    </Stack.Navigator>
  );
}
