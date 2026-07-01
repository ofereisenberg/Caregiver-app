import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  LanguagePicker: undefined;
  EnterEmail: undefined;
  CheckEmail: { email: string };
  SetupProfile: undefined;
  SetupCircle: undefined;
  SelectCircle: undefined;
  InviteManagement: undefined;
};

export type BottomTabParamList = {
  Tasks: undefined;
  Projects: undefined;
  Calendar: undefined;
};

export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<BottomTabParamList>;
  TaskDetail: { taskId: string };
  AddTask: { parentAppointmentId?: string; projectId?: string };
  AppointmentDetail: { appointmentId: string };
  AddAppointment: { taskId?: string; date?: string; appointmentId?: string; projectId?: string };
  ProjectDetail: { projectId: string };
  AddProject: undefined;
  AddVacation: undefined;
  EditVacation: { vacationId: string };
  DayDetail: { dateKey: string };
  DailyDigest: undefined;
  CircleAdmin: undefined;
  CreateCircle: undefined;
  JoinCircle: undefined;
  InviteManagement: undefined;
  UserSettings: undefined;
  AddEditExternalContact: { contactId?: string };
};
