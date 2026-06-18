self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'Qlisted', {
        body: data.body || '',
        icon: data.icon || '/icon.svg',
        badge: '/icon.svg',
        vibrate: [200, 100, 200],
        data: data.data || {},
      })
    );
  } catch (e) {}
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});
