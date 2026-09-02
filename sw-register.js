if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('firebase-messaging-sw.js').then(() => {
    console.log('Firebase Messaging Service Worker registered');
  }).catch((err) => {
    console.log('Firebase Messaging SW registration failed:', err);
  });
}