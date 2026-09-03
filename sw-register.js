if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').then((registration) => {
    console.log('Main Service Worker registered');
  }).catch((err) => {
    console.log('Main SW registration failed:', err);
  });

  navigator.serviceWorker.register('firebase-messaging-sw.js').then(() => {
    console.log('Firebase Messaging Service Worker registered');
  }).catch((err) => {
    console.log('Firebase Messaging SW registration failed:', err);
  });
}
