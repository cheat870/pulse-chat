// ── PulseChat Push Notification Service ──────────────────────────────────────
import { apiRequest } from './api';

const VAPID_PUBLIC_KEY_URL = '/api/push/vapid-public-key';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Request notification permission from user
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  return result;
}

// Subscribe to push notifications and register with backend
export async function subscribeToPushNotifications() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push not supported in this browser');
      return false;
    }

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') return false;

    // Get VAPID public key from backend
    const { publicKey } = await apiRequest('/push/vapid-public-key');
    if (!publicKey) return false;

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    // Save subscription to backend
    const subJson = subscription.toJSON();
    await apiRequest('/push/subscribe', 'POST', {
      endpoint: subJson.endpoint,
      keys: subJson.keys
    });

    console.log('✅ Push notifications subscribed');
    return true;
  } catch (err) {
    console.warn('Push subscription failed:', err.message);
    return false;
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications() {
  try {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
    await apiRequest('/push/unsubscribe', 'DELETE');
    console.log('Push notifications unsubscribed');
  } catch (err) {
    console.warn('Unsubscribe error:', err);
  }
}

// Show a local (immediate) notification
export function showLocalNotification(title, body, icon, onClick) {
  if (Notification.permission !== 'granted') return;
  const n = new Notification(title, {
    body,
    icon: icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'pulsechat-msg',
    renotify: true,
    requireInteraction: false,
    silent: false
  });
  if (onClick) n.onclick = onClick;
  setTimeout(() => n.close(), 5000);
}
