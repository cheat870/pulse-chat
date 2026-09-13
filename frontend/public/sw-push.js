// PulseChat Push Notification Service Worker
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'PulseChat', body: event.data ? event.data.text() : 'New notification' };
  }

  const title = data.title || 'PulseChat';
  const options = {
    body: data.body || 'New message',
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    data: data.data || {},
    tag: 'pulsechat-notification',
    renotify: true,
    requireInteraction: false,
    actions: [{ action: 'open', title: 'Open Chat' }]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const convId = event.notification.data?.conversationId;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (convId) {
            client.postMessage({ type: 'open_conversation', conversationId: convId });
          }
          return client.focus();
        }
      }
      return clients.openWindow(convId ? `/?conv=${convId}` : '/');
    })
  );
});
