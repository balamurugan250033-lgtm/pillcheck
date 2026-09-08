// NotificationService for prototype - NO-OP as native dependencies are missing in package.json
export class NotificationService {
  async requestPermissions() {
    return false;
  }

  async scheduleReminder(title: string, body: string, trigger: { seconds: number }) {
    console.log(`Reminder scheduled: ${title} - ${body} in ${trigger.seconds}s`);
  }

  async cancelAll() {
    // No-op
  }
}
