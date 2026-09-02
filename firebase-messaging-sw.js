importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyArIjzZvSOes6bwMWzSRkrI2C7baO_mJoE",
  authDomain: "laundry-register.firebaseapp.com",
  projectId: "laundry-register",
  storageBucket: "laundry-register.firebasestorage.app",
  messagingSenderId: "721107736494",
  appId: "1:721107736494:web:ad1996a5d0d3e690de9a3f"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: 'kenok-logo.jpeg'
  });
});