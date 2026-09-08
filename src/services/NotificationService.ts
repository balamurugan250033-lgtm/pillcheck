import { Platform } from 'react-native';
import Notifications from 'expo-notifications';
import * as Device from 'expo-device';

Notifications.setNotificationChannelAsync('default', {
  name: 'PillCheck Reminders',
  importance: Notifications.AndroidImportance.MAX,
  vibrationPattern: [0, 250, 250, 250],
  sound: 'default',
});

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  async requestPermissions() {
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        return false;
      }
      await Notifications.setNotificationChannelAsync('default', {
        name: 'PillCheck Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
      return true;
    }
    return false;
  }

  async scheduleReminder(title: string, body: string, trigger: { seconds: number }) {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true, vibrate: [0, 250, 250, 250] },
      trigger,
    });
  }

  async cancelAll() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}
