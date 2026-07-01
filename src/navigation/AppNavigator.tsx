import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddAppointmentScreen } from '../screens/app/AddAppointmentScreen';
import { AddProjectScreen } from '../screens/app/AddProjectScreen';
import { AddTaskScreen } from '../screens/app/AddTaskScreen';
import { AddVacationScreen } from '../screens/app/AddVacationScreen';
import { EditVacationScreen } from '../screens/app/EditVacationScreen';
import { DayDetailScreen } from '../screens/app/DayDetailScreen';
import { AppointmentDetailScreen } from '../screens/app/AppointmentDetailScreen';
import { CalendarScreen } from '../screens/app/CalendarScreen';
import { DailyDigestScreen } from '../screens/app/DailyDigestScreen';
import { ProjectDetailScreen } from '../screens/app/ProjectDetailScreen';
import { ProjectsScreen } from '../screens/app/ProjectsScreen';
import { TaskDetailScreen } from '../screens/app/TaskDetailScreen';
import { TaskListScreen } from '../screens/app/TaskListScreen';
import { InviteManagementScreen } from '../screens/auth/InviteManagementScreen';
import { CircleAdminScreen } from '../screens/settings/CircleAdminScreen';
import { AddEditExternalContactScreen } from '../screens/settings/AddEditExternalContactScreen';
import { CreateCircleScreen } from '../screens/settings/CreateCircleScreen';
import { JoinCircleScreen } from '../screens/settings/JoinCircleScreen';
import { UserSettingsScreen } from '../screens/settings/UserSettingsScreen';
import { theme } from '../constants/theme';
import { AppStackParamList, BottomTabParamList } from './types';

const Tab = createBottomTabNavigator<BottomTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.divider,
          height: 70 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: theme.colors.sageDark,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarLabelStyle: {
          fontSize: theme.fontSize.micro,
          fontWeight: theme.fontWeight.semibold,
        },
      }}
    >
      <Tab.Screen
        name="Tasks"
        component={TaskListScreen}
        options={{
          tabBarLabel: 'Overview',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Projects"
        component={ProjectsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="folder-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
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
      <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
      <Stack.Screen name="CircleAdmin" component={CircleAdminScreen} />
      <Stack.Screen name="CreateCircle" component={CreateCircleScreen} />
      <Stack.Screen name="JoinCircle" component={JoinCircleScreen} />
      <Stack.Screen name="UserSettings" component={UserSettingsScreen} />
      <Stack.Screen name="InviteManagement" component={InviteManagementScreen} />
      <Stack.Screen name="AddEditExternalContact" component={AddEditExternalContactScreen} />

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
        name="AddProject"
        component={AddProjectScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="AddVacation"
        component={AddVacationScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="EditVacation"
        component={EditVacationScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="DayDetail"
        component={DayDetailScreen}
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
