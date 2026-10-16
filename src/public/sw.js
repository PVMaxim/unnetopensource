
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'Transaction Detected',
    body: 'New transfer received on your wallet.',
    icon: '/favicons/android-chrome-192x192.png',
    url: '/'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicons/android-chrome-192x192.png',
    badge: '/favicons/favicon-32x32.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    tag: data.tag || 'wallet-tx-alert',
    renotify: false,
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Open' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PLAY_CHIME') {
    const title = event.data.title || 'Transaction received';
    const body = event.data.body || 'New transfer detected on your wallet.';

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: '/favicons/android-chrome-192x192.png',
        badge: '/favicons/favicon-32x32.png',
        vibrate: [200, 100, 200],
        tag: 'wallet-tx-alert',
        renotify: true,
        silent: false,
        data: { url: '/' },
        actions: [
          { action: 'open', title: 'Open' }
        ]
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('notificationclose', (event) => {
});

