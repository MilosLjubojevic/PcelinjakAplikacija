import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Location } from "../types";

const ID_PREFIX = "inspection-";

// Show notification banner even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function notificationBody(count: number): string {
  if (count === 1) return "Imate 1 košnicu zakazanu za pregled danas!";
  if (count < 5) return `Imate ${count} košnice zakazane za pregled danas!`;
  return `Imate ${count} košnica zakazanih za pregled danas!`;
}

export async function scheduleInspectionNotifications(
  locations: Location[],
  hour = 8,
  minute = 0
): Promise<void> {
  if (Platform.OS === "web") return;

  const granted = await requestNotificationPermissions();
  if (!granted) return;

  // Cancel all previously scheduled inspection notifications
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );

  // Group hives by scheduledInspection date (today and future only)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const countByDate = new Map<string, number>();

  for (const location of locations) {
    for (const row of location.rows) {
      for (const hive of row.hives) {
        if (!hive.scheduledInspection) continue;
        const d = new Date(hive.scheduledInspection);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        if (dayStart < todayStart) continue;
        const key = dateKey(d);
        countByDate.set(key, (countByDate.get(key) ?? 0) + 1);
      }
    }
  }

  for (const [key, count] of countByDate.entries()) {
    const [year, month, day] = key.split("-").map(Number);
    const fireAt = new Date(year, month - 1, day, hour, minute, 0, 0);

    const content: Notifications.NotificationContentInput = {
      title: "🐝 Pregled košnica",
      body: notificationBody(count),
      data: { date: key, count },
    };

    if (fireAt <= now) {
      // Today but past 8 AM — fire immediately
      await Notifications.scheduleNotificationAsync({
        identifier: `${ID_PREFIX}${key}`,
        content,
        trigger: null,
      });
    } else {
      const secondsUntil = Math.round((fireAt.getTime() - now.getTime()) / 1000);
      await Notifications.scheduleNotificationAsync({
        identifier: `${ID_PREFIX}${key}`,
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: secondsUntil,
        },
      });
    }
  }
}

export async function cancelAllInspectionNotifications(): Promise<void> {
  if (Platform.OS === "web") return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(ID_PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}
