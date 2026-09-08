import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppProvider } from '../store/context';
import HomeScreen from '../screens/HomeScreen';
import PrescriptionCaptureScreen from '../screens/PrescriptionCaptureScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import TabletScanScreen from '../screens/TabletScanScreen';
import VerdictScreen from '../screens/VerdictScreen';
import HistoryScreen from '../screens/HistoryScreen';
import CaregiverScreen from '../screens/CaregiverScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { RootStackParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <AppProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="PrescriptionCapture" component={PrescriptionCaptureScreen} />
          <Stack.Screen name="Schedule" component={ScheduleScreen} />
          <Stack.Screen name="TabletScan" component={TabletScanScreen} />
          <Stack.Screen name="Verdict" component={VerdictScreen} />
          <Stack.Screen name="History" component={HistoryScreen} />
          <Stack.Screen name="Caregiver" component={CaregiverScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppProvider>
  );
}
