import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  EnterEmail: undefined;
  CheckEmail: { email: string };
  SetupProfile: undefined;
  SetupCircle: undefined;
  InviteManagement: undefined;
};

export type BottomTabParamList = {
  Tasks: undefined;
  Calendar: undefined;
  Notes: undefined;
  Settings: undefined;
};

export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<BottomTabParamList>;
  TaskDetail: { taskId: string };
  AddTask: { parentAppointmentId?: string };
  AppointmentDetail: { appointmentId: string };
  AddAppointment: { taskId?: string; date?: string };
  DailyDigest: undefined;
  CircleAdmin: undefined;
  InviteManagement: undefined;
};
