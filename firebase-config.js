const firebaseConfig = {
  apiKey: "AIzaSyArIjzZvSOes6bwMWzSRkrI2C7baO_mJoE",
  authDomain: "laundry-register.firebaseapp.com",
  projectId: "laundry-register",
  storageBucket: "laundry-register.firebasestorage.app",
  messagingSenderId: "721107736494",
  appId: "1:721107736494:web:ad1996a5d0d3e690de9a3f"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Create references we'll use throughout the app
const db = firebase.firestore();
const auth = firebase.auth();
const messaging = firebase.messaging();

const VAPID_KEY = 'BM0AcmietdJmLw-hXLH2jgktfj-Mp1ppjrCzIcV9Gob1KWewZ9vJ-9ZzZqlnV1LQjxxE406lyL6bo45K9yRjoNI';