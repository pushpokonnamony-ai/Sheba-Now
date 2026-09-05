/* Firebase Cloud Messaging service worker for background notifications. */
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyD96Zb90WfRKmssz3eA9veyJxgZlihC0UI',
  authDomain: 'sheba-now-48771.firebaseapp.com',
  databaseURL: 'https://sheba-now-48771-default-rtdb.firebaseio.com',
  projectId: 'sheba-now-48771',
  storageBucket: 'sheba-now-48771.firebasestorage.app',
  messagingSenderId: '365178191834',
  appId: '1:365178191834:web:2f8c8871b8ec7c206d8ae3'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || 'ShebaNow';
  const body = notification.body || data.body || 'আপনার জন্য নতুন আপডেট এসেছে।';
  const icon = notification.icon || data.icon || '/header-bg.jpg';
  const image = notification.image || data.image || data.offerImage;

  self.registration.showNotification(title, {
    body,
    icon,
    image,
    data: {
      clickUrl: data.clickUrl || data.url || '/index.html'
    }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const clickUrl = event.notification.data?.clickUrl || '/index.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existingClient = clientList.find((client) => 'focus' in client);
      if (existingClient) {
        existingClient.navigate(clickUrl);
        return existingClient.focus();
      }
      return clients.openWindow(clickUrl);
    })
  );
});
