const DIRECTOR_EMAILS = [
  'okohpreciousokoh@gmail.com',
  'kingmba567@gmail.com',
  'kenabigael92@gmail.com'
];

function isDirectorEmail(email) {
  return DIRECTOR_EMAILS.includes(email.toLowerCase());
}

// Login elements
const loginScreen = document.getElementById('loginScreen');
const appContainer = document.getElementById('appContainer');
const loginBox = document.getElementById('loginBox');
const loginBtn = document.getElementById('loginBtn');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

// Signup elements
const signupBox = document.getElementById('signupBox');
const signupBtn = document.getElementById('signupBtn');
const signupName = document.getElementById('signupName');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const signupError = document.getElementById('signupError');
const signupSuccess = document.getElementById('signupSuccess');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');

// Pending elements
const pendingBox = document.getElementById('pendingBox');
const pendingLogoutBtn = document.getElementById('pendingLogoutBtn');

// Admin nav + toggle
const adminNavBtn = document.getElementById('adminNavBtn');
const adminToggleBtns = document.querySelectorAll('.admin-toggle-btn');

// Switch between login/signup
showSignup.addEventListener('click', (e) => {
  e.preventDefault();
  loginBox.style.display = 'none';
  signupBox.style.display = 'block';
});

showLogin.addEventListener('click', (e) => {
  e.preventDefault();
  signupBox.style.display = 'none';
  loginBox.style.display = 'block';
});

// Login
loginBtn.addEventListener('click', () => {
  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    loginError.textContent = 'Please enter both email and password.';
    return;
  }

  loginError.textContent = '';
  loginBtn.textContent = 'Logging in...';
  loginBtn.disabled = true;

  auth.signInWithEmailAndPassword(email, password)
    .catch((error) => {
      loginError.textContent = 'Login failed: ' + error.message;
    })
    .finally(() => {
      loginBtn.textContent = 'Log In';
      loginBtn.disabled = false;
    });
});

// Signup
signupBtn.addEventListener('click', () => {
  const name = signupName.value.trim();
  const email = signupEmail.value.trim();
  const password = signupPassword.value;

  if (!name || !email || !password) {
    signupError.textContent = 'Please fill in all fields.';
    return;
  }

  if (password.length < 6) {
    signupError.textContent = 'Password must be at least 6 characters.';
    return;
  }

  signupError.textContent = '';
  signupBtn.textContent = 'Signing up...';
  signupBtn.disabled = true;

  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const uid = userCredential.user.uid;
      const isDirector = isDirectorEmail(email);

      return db.collection('users').doc(uid).set({
        name: name,
        email: email,
        approved: isDirector,
        isDirector: isDirector,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(() => {
      signupSuccess.textContent = 'Account created! Waiting for director approval (unless you are a director).';
      signupName.value = '';
      signupEmail.value = '';
      signupPassword.value = '';
    })
    .catch((error) => {
      signupError.textContent = 'Sign up failed: ' + error.message;
    })
    .finally(() => {
      signupBtn.textContent = 'Sign Up';
      signupBtn.disabled = false;
    });
});

logoutBtn.addEventListener('click', () => auth.signOut());
pendingLogoutBtn.addEventListener('click', () => auth.signOut());

// Screen switching (login-gate level)
function showLoginScreen() {
  loginScreen.style.display = 'flex';
  appContainer.style.display = 'none';
  loginBox.style.display = 'block';
  signupBox.style.display = 'none';
  pendingBox.style.display = 'none';
}

function showPendingScreen() {
  loginScreen.style.display = 'flex';
  appContainer.style.display = 'none';
  loginBox.style.display = 'none';
  signupBox.style.display = 'none';
  pendingBox.style.display = 'block';
}

function showApp(userData) {
  loginScreen.style.display = 'none';
  appContainer.style.display = 'block';

  window.currentUserIsDirector = !!userData.isDirector;
  window.currentUserName = userData.name;

  setupMeTab(userData);
  setupPushNotifications(auth.currentUser);

  if (typeof startListeningToCustomers === 'function') {
    startListeningToCustomers();
  }

  if (typeof startListeningToAllOrders === 'function') {
    startListeningToAllOrders();
  }

  if (typeof startListeningToMessages === 'function') {
    startListeningToMessages();
  }

  if (userData.isDirector) {
    adminNavBtn.style.display = 'flex';
    startListeningToPendingUsers();
    if (typeof startListeningToDeleteRequests === 'function') {
      startListeningToDeleteRequests();
    }
    if (typeof startListeningToExpenses === 'function') {
      startListeningToExpenses();
    }
    if (typeof startListeningToOrdersForAnalysis === 'function') {
      startListeningToOrdersForAnalysis();
    }
  } else {
    adminNavBtn.style.display = 'none';
  }

  switchTab('register');
}

function setupMeTab(userData) {
  document.getElementById('meName').textContent = userData.name;
  document.getElementById('meEmail').textContent = userData.email;
  document.getElementById('meAvatar').textContent = userData.name.charAt(0).toUpperCase();
}

// Push notifications: request permission and register this device's token
function setupPushNotifications(user) {
  if (!('Notification' in window)) return;

  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      messaging.getToken({ vapidKey: VAPID_KEY }).then((token) => {
        if (token) {
          db.collection('users').doc(user.uid).update({
            fcmTokens: firebase.firestore.FieldValue.arrayUnion(token)
          });
        }
      }).catch((err) => {
        console.log('Could not get push token:', err);
      });
    }
  });
}

messaging.onMessage((payload) => {
  new Notification(payload.notification.title, {
    body: payload.notification.body,
    icon: 'kenok-logo.jpeg'
  });
});

// Tab switching
function switchTab(tabName) {
  document.querySelectorAll('.tab-view').forEach(el => el.style.display = 'none');
  document.getElementById('tab-' + tabName).style.display = 'block';

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.getAttribute('data-tab'));
  });
});

// Admin internal toggle (Approvals / Requests / Analysis)
adminToggleBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const section = btn.getAttribute('data-section');
    adminToggleBtns.forEach(b => b.classList.toggle('active', b === btn));
    document.getElementById('admin-approvals').style.display = section === 'approvals' ? 'block' : 'none';
    document.getElementById('admin-requests').style.display = section === 'requests' ? 'block' : 'none';
    document.getElementById('admin-analysis').style.display = section === 'analysis' ? 'block' : 'none';
  });
});

// Director-only: listen for pending users
function startListeningToPendingUsers() {
  const pendingList = document.getElementById('pendingList');
  db.collection('users').where('approved', '==', false).onSnapshot((snapshot) => {
    if (snapshot.empty) {
      pendingList.innerHTML = '<p class="no-pending">No pending approvals right now.</p>';
      return;
    }

    pendingList.innerHTML = '';
    snapshot.docs.forEach((doc) => {
      const u = doc.data();
      const div = document.createElement('div');
      div.className = 'pending-user';
      div.innerHTML = `
        <div class="pending-user-info">
          <strong>${u.name}</strong>
          <span>${u.email}</span>
        </div>
        <button class="approve-btn" data-uid="${doc.id}">Approve</button>
      `;
      pendingList.appendChild(div);
    });
  });
}

document.getElementById('pendingList').addEventListener('click', (e) => {
  if (e.target.classList.contains('approve-btn')) {
    const uid = e.target.getAttribute('data-uid');
    db.collection('users').doc(uid).update({ approved: true });
  }
});

// Main auth state watcher
auth.onAuthStateChanged((user) => {
  if (user) {
    db.collection('users').doc(user.uid).get().then((doc) => {
      if (!doc.exists) {
        showLoginScreen();
        return;
      }
      const userData = doc.data();
      if (userData.approved) {
        showApp(userData);
      } else {
        showPendingScreen();
      }
    });
  } else {
    showLoginScreen();
  }
});