/* eslint-disable no-undef */
// Firebase Messaging Service Worker for MojiraX
// This file MUST be at the root of /public/ for FCM to work

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCuHdt6qaERPtsrvG1h1Ho58bJ0kFEjQqA',
  authDomain: 'mojirax-49d46.firebaseapp.com',
  projectId: 'mojirax-49d46',
  storageBucket: 'mojirax-49d46.firebasestorage.app',
  messagingSenderId: '997591738739',
  appId: '1:997591738739:web:c594b827f14eacf8fcfd06',
});

const messaging = firebase.messaging();

// Handle background messages (when app is not focused)
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon, data } = payload.notification || {};

  const notificationTitle = title || 'MojiraX';
  const notificationOptions = {
    body: body || '',
    icon: icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: data || payload.data || {},
    tag: payload.data?.notificationId || 'mojiax-notification',
    renotify: true,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let url = '/';

  // Route to relevant page based on notification data
  if (data.projectId) {
    url = `/projects/${data.projectId}`;
  } else if (data.applicationId) {
    url = '/applications';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if available
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new tab
      return clients.openWindow(url);
    })
  );
});
