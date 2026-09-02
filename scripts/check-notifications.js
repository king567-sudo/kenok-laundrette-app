const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const messaging = admin.messaging();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

function daysSince(timestamp) {
  if (!timestamp || !timestamp.toDate) return null;
  const diff = Date.now() - timestamp.toDate().getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

async function getStaffTokens() {
  const usersSnapshot = await db.collection('users').where('approved', '==', true).get();
  let tokens = [];
  usersSnapshot.forEach((doc) => {
    const u = doc.data();
    if (u.fcmTokens && Array.isArray(u.fcmTokens)) {
      tokens = tokens.concat(u.fcmTokens);
    }
  });
  return tokens;
}

async function sendPushToStaff(title, body) {
  const tokens = await getStaffTokens();
  if (tokens.length === 0) return;

  try {
    const response = await messaging.sendEachForMulticast({
      notification: { title, body },
      tokens: tokens
    });
    console.log(`Push sent: ${response.successCount} succeeded, ${response.failureCount} failed`);
  } catch (err) {
    console.error('Push send error:', err);
  }
}

async function sendEmail(to, subject, text) {
  if (!to) return;
  try {
    await transporter.sendMail({
      from: `"Kenok Laundrette" <${process.env.GMAIL_USER}>`,
      to: to,
      subject: subject,
      text: text
    });
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error(`Email send error for ${to}:`, err);
  }
}

// ===== 1. Check for new messages =====
async function checkNewMessages() {
  const configRef = db.collection('systemConfig').doc('notifications');
  const configDoc = await configRef.get();
  const lastCheck = configDoc.exists ? configDoc.data().lastMessageCheck : null;

  let query = db.collection('messages').where('deleted', '==', false).orderBy('createdAt', 'asc');
  if (lastCheck) {
    query = db.collection('messages').where('deleted', '==', false).where('createdAt', '>', lastCheck).orderBy('createdAt', 'asc');
  }

  const snapshot = await query.get();
  console.log(`Found ${snapshot.size} new message(s).`);

  if (!snapshot.empty) {
    const latest = snapshot.docs[snapshot.docs.length - 1].data();
    const messageCount = snapshot.size;
    const preview = messageCount === 1
      ? `${latest.senderName}: ${latest.text}`
      : `${messageCount} new messages, latest from ${latest.senderName}`;

    await sendPushToStaff('💬 New team message', preview);
    await configRef.set({ lastMessageCheck: latest.createdAt }, { merge: true });
  }
}

// ===== 2. Check for newly-ready orders =====
async function checkReadyOrders() {
  const snapshot = await db.collection('orders').where('readyNotified', '!=', true).get();
  console.log(`Checking ${snapshot.size} order(s) for ready status...`);

  for (const doc of snapshot.docs) {
    const order = doc.data();
    const allReady = order.items && order.items.every(item => item.status === 'ready');

    if (allReady) {
      await sendPushToStaff('✅ Order Ready', `${order.customerName}'s order is fully ready for pickup.`);

      if (order.customerEmail || order.email) {
        // We'll look up the customer's email if not stored on the order itself
      }

      const customerDoc = await db.collection('customers').doc(order.customerId).get();
      const customer = customerDoc.exists ? customerDoc.data() : null;

      if (customer && customer.email) {
        await sendEmail(
          customer.email,
          'Your Order is Ready! — Kenok Laundrette',
          `Hi ${customer.name},\n\nGreat news! Your order at Kenok Laundrette is fully ready for pickup.\n\nPlease come by at your earliest convenience.\n\nThank you for choosing Kenok Laundrette.\nCleaner Clothes. Better Living.`
        );
      }

      await doc.ref.update({ readyNotified: true });
    }
  }
}

// ===== 3. Check for overdue orders =====
async function checkOverdueOrders() {
  const snapshot = await db.collection('orders').where('overdueNotified', '!=', true).get();
  console.log(`Checking ${snapshot.size} order(s) for overdue status...`);

  for (const doc of snapshot.docs) {
    const order = doc.data();
    const allReady = order.items && order.items.every(item => item.status === 'ready');
    const days = daysSince(order.createdAt);

    if (!allReady && days !== null && days >= 3) {
      const customerDoc = await db.collection('customers').doc(order.customerId).get();
      const customer = customerDoc.exists ? customerDoc.data() : null;

      if (customer && customer.email) {
        await sendEmail(
          customer.email,
          'Reminder: Your Order is Waiting — Kenok Laundrette',
          `Hi ${customer.name},\n\nThis is a friendly reminder that your order at Kenok Laundrette has been ready for pickup for a few days now.\n\nPlease note: any items left unclaimed for more than 1 month will incur additional charges.\n\nWe look forward to seeing you soon.\n\nKenok Laundrette\nCleaner Clothes. Better Living.`
        );
      }

      await sendPushToStaff('⚠️ Overdue Order', `${order.customerName}'s order has been waiting ${days} days.`);
      await doc.ref.update({ overdueNotified: true });
    }
  }
}

async function run() {
  console.log('Starting notification check...');
  await checkNewMessages();
  await checkReadyOrders();
  await checkOverdueOrders();
  console.log('Done.');
}

run().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});