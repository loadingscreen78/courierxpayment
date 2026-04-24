// Firebase Cloud Messaging Service Worker
// Handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC-9bkWepX01heOwJPul9d83W457mc7WI0",
  authDomain: "courierx-in.firebaseapp.com",
  projectId: "courierx-in",
  storageBucket: "courierx-in.firebasestorage.app",
  messagingSenderId: "8149726702",
  appId: "1:8149726702:web:179e5ef37b8af603a98aff",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, data } = payload.notification || {};

  self.registration.showNotification(title || 'CourierX Update', {
    body: body || 'Your shipment status has been updated.',
    icon: icon || '/favicon.png',
    badge: '/favicon.png',
    tag: data?.shipmentId || 'courierx-notification',
    data: data || {},
    actions: [
      { action: 'track', title: 'Track Shipment' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const trackingNumber = event.notification.data?.trackingNumber;
  const url = trackingNumber
    ? `/public/track?tracking=${encodeURIComponent(trackingNumber)}`
    : '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
