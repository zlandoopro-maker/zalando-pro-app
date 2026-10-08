import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { auth, db, doc, updateDoc } from './firebase';

let isRegistering = false;

export async function registerPushNotifications() {
  if (!auth.currentUser || isRegistering) return;

  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications skipped: Not a native platform');
    return;
  }

  isRegistering = true;

  try {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.log('User denied push permissions!');
      isRegistering = false;
      return;
    }

    await PushNotifications.register();

    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token: ' + token.value);
      if (auth.currentUser) {
        updateDoc(doc(db, 'users', auth.currentUser.uid), {
          fcmToken: token.value,
          updatedAt: new Date().toISOString()
        }).catch(err => console.error('Failed to save FCM token:', err));
      }
      isRegistering = false;
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on push registration: ' + JSON.stringify(error));
      isRegistering = false;
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ' + JSON.stringify(notification));
      // You can also trigger a local notification here if you want to show it while foregrounded
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ' + JSON.stringify(notification));
    });

  } catch (err) {
    console.error('registerPushNotifications caught error:', err);
    isRegistering = false;
  }
}

/**
 * Compatibility wrapper for older permission requests
 */
export async function requestNotificationPermission() {
  if (Capacitor.isNativePlatform()) {
    const status = await LocalNotifications.requestPermissions();
    return status.display === 'granted';
  }
  return false;
}

/**
 * Schedules a local notification for daily tasks
 * Reset happens at midnight, so we notify in the morning
 */
export async function scheduleDailyTaskReminder() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const hasPermission = await LocalNotifications.checkPermissions();
    if (hasPermission.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }

    // Clear existing task reminders
    await LocalNotifications.cancel({ notifications: [{ id: 1001 }] });

    // Schedule for 10:00 AM every day
    await LocalNotifications.schedule({
      notifications: [
        {
          title: "☀️ New Tasks Available!",
          body: "Your daily extractions have been reset. Log in now to earn your commissions!",
          id: 1001,
          schedule: { 
            allowWhileIdle: true,
            on: { hour: 10, minute: 0 },
            repeats: true
          },
          sound: 'beep.wav',
          extra: { type: 'task_reminder' }
        }
      ]
    });
    console.log('Daily task reminder scheduled for 10:00 AM');
  } catch (e) {
    console.error('Failed to schedule local notification:', e);
  }
}

/**
 * Notifies the Admin Hub about a new transaction request
 */
export async function notifyAdminOfRequest(type: 'deposit' | 'withdrawal', amount: number) {
  try {
    const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const response = await fetch(`${baseUrl}/api/admin/notify-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        amount,
        timestamp: new Date().toISOString()
      })
    });
    return await response.json();
  } catch (e) {
    console.warn('Failed to notify admin hub:', e);
  }
}

export async function showLocalNotification(title: string, body: string) {
  if (!Capacitor.isNativePlatform()) return;
  
  await LocalNotifications.schedule({
    notifications: [{
      title,
      body,
      id: Math.floor(Math.random() * 10000),
      extra: { data: 'simple' }
    }]
  });
}

