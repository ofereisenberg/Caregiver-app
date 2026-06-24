import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AddAppointmentScreen } from '../screens/app/AddAppointmentScreen';
import { AddTaskScreen } from '../screens/app/AddTaskScreen';
import { AppointmentDetailScreen } from '../screens/app/AppointmentDetailScreen';
import { CalendarScreen } from '../screens/app/CalendarScreen';
import { DailyDigestScreen } from '../screens/app/DailyDigestScreen';
import { TaskDetailScreen } from '../screens/app/TaskDetailScreen';
import { TaskListScreen } from '../screens/app/TaskListScreen';
import { InviteManagementScreen } from '../screens/auth/InviteManagementScreen';
import { CircleAdminScreen } from '../screens/settings/CircleAdminScreen';
import { UserSettingsScreen } from '../screens/settings/UserSettingsScreen';
import { theme } from '../constants/theme';
import { AppStackParamList, BottomTabParamList } from './types';

const Tab = createBottomTabNavigator<BottomTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.divider,
          height: 70,
        },
        tabBarActiveTintColor: theme.colors.sageDark,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: theme.fontSize.micro,
          fontWeight: theme.fontWeight.semibold,
        },
      }}
    >
      <Tab.Screen name="Tasks" component={TaskListScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.canvas },
      }}
    >
      {/* Main tab screens */}
      <Stack.Screen name="MainTabs" component={MainTabs} />

      {/* Push screens */}
      <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
      <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
      <Stack.Screen name="UserSettings" component={UserSettingsScreen} />
      <Stack.Screen name="CircleAdmin" component={CircleAdminScreen} />
      <Stack.Screen name="InviteManagement" component={InviteManagementScreen} />

      {/* Modal screens — presented as bottom sheets */}
      <Stack.Screen
        name="AddTask"
        component={AddTaskScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="AddAppointment"
        component={AddAppointmentScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="DailyDigest"
        component={DailyDigestScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
