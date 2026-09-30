import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin with local service account credentials
try {
  const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
  let serviceAccount;
  if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  }

  admin.initializeApp({
    credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault()
  });
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Firebase Admin initialization failed:', error);
}

const db = admin.firestore();

// Helper to send push notifications
async function sendPushNotification(userId: string, title: string, body: string) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    const fcmToken = userDoc.data()?.fcmToken;

    if (fcmToken) {
      const message = {
        notification: { title, body },
        token: fcmToken,
        android: {
          notification: {
            icon: 'stock_ticker_update',
            color: '#4A69BD'
          }
        }
      };
      await admin.messaging().send(message);
      console.log(`Notification sent to ${userId}: ${title}`);
    } else {
      console.log(`No FCM token found for user ${userId}`);
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Zalando Pro API'
  });
});

app.get('/api/time', (req, res) => {
  res.json({
    datetime: new Date().toISOString()
  });
});

app.get('/api/download-apk', (req, res) => {
  const apkPath = path.join(__dirname, '..', 'base.apk');
  res.download(apkPath, 'zalando-pro.apk', (err) => {
    if (err) {
      console.error('Error sending APK file:', err);
      res.status(500).send('Error downloading APK. Please contact support.');
    }
  });
});

/**
 * SECURE TRANSACTION APPROVAL (Full-Stack Logic)
 * Moving this from frontend to backend prevents users from spoofing balances.
 */
app.post('/api/admin/approve-transaction', async (req, res) => {
  const { txId, adminSecret } = req.body;

  // Simple secret check (In production, use Firebase Auth tokens)
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const txRef = db.collection('transactions').doc(txId);

    await db.runTransaction(async (transaction) => {
      const txDoc = await transaction.get(txRef);
      if (!txDoc.exists) throw new Error('Transaction not found');

      const txData = txDoc.data();
      if (txData?.status !== 'pending') throw new Error('Transaction already processed');

      const userRef = db.collection('users').doc(txData.userId);
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) throw new Error('User not found');

      const userData = userDoc.data();
      let newBalance = (userData?.balance || 0);

      if (txData.type === 'deposit') {
        newBalance += txData.amount;

        // Handle Referrals Securely
        if (userData?.referredBy) {
          const referrerRef = db.collection('users').doc(userData.referredBy);
          const commission = txData.amount * 0.05; // 5% L1 Commission
          transaction.update(referrerRef, {
            balance: admin.firestore.FieldValue.increment(commission),
            totalEarnings: admin.firestore.FieldValue.increment(commission)
          });
        }
      }

      transaction.update(txRef, { status: 'completed', processedAt: admin.firestore.FieldValue.serverTimestamp() });
      transaction.update(userRef, { balance: newBalance });
    });

    // Send Notification after successful transaction
    const txDoc = await db.collection('transactions').doc(txId).get();
    const txData = txDoc.data();
    if (txData?.type === 'deposit') {
      await sendPushNotification(txData.userId, 'Deposit Successful', `Your deposit of $${txData.amount} has been approved.`);
    } else if (txData?.type === 'withdrawal') {
      await sendPushNotification(txData.userId, 'Withdrawal Complete', `Your withdrawal of $${txData.amount} has been processed.`);
    }

    res.json({ success: true, message: 'Transaction approved securely' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/reject-transaction', async (req, res) => {
  const { txId, adminSecret, reason } = req.body;

  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const txRef = db.collection('transactions').doc(txId);

    let userId: string | undefined;
    let txType: string | undefined;

    await db.runTransaction(async (transaction) => {
      const txDoc = await transaction.get(txRef);
      if (!txDoc.exists) throw new Error('Transaction not found');

      const txData = txDoc.data();
      if (txData?.status !== 'pending') throw new Error('Transaction already processed');

      userId = txData?.userId;
      txType = txData?.type;

      if (txData?.type === 'withdrawal') {
        const userRef = db.collection('users').doc(txData.userId);
        const userDoc = await transaction.get(userRef);
        if (userDoc.exists) {
          const refundAmount = txData.deductedAmount || ((txData.amount || 0) * 1.05);
          transaction.update(userRef, {
            balance: admin.firestore.FieldValue.increment(refundAmount)
          });
        }
      }

      transaction.update(txRef, {
        status: 'failed',
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        rejectionReason: reason || 'Rejected by system administrator'
      });
    });

    if (userId) {
      await sendPushNotification(
        userId,
        'Transaction Rejected',
        `Your ${txType || 'transaction'} was rejected. ${reason || ''}`
      );
    }

    res.json({ success: true, message: 'Transaction rejected and refunded if applicable' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * NOTIFY ADMINS OF NEW REQUEST
 * Sends push notifications to all users marked as isAdmin
 */
app.post('/api/admin/notify-request', async (req, res) => {
  const { type, amount } = req.body;

  try {
    const adminsSnap = await db.collection('users').where('isAdmin', '==', true).get();
    const tokens: string[] = [];

    adminsSnap.forEach(doc => {
      const token = doc.data().fcmToken;
      if (token) tokens.push(token);
    });

    if (tokens.length > 0) {
      const message = {
        notification: {
          title: `🔔 New ${type.toUpperCase()} Request`,
          body: `A user has submitted a ${type} of $${amount}. Action required in Admin Hub.`
        },
        tokens: tokens,
        android: {
          notification: {
            priority: 'high',
            sound: 'default'
          }
        }
      };
      const response = await admin.messaging().sendEachForMulticast(message as any);
      res.json({ success: true, notifiedCount: response.successCount });
    } else {
      res.json({ success: true, notifiedCount: 0 });
    }
  } catch (error: any) {
    console.error('Notify Admin Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * BROADCAST NOTIFICATION
 * Triggers a notification to all users (e.g., "New Tasks Available!")
 */
app.post('/api/admin/broadcast', async (req, res) => {
  const { title, body, adminSecret } = req.body;

  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    const usersSnap = await db.collection('users').get();
    const tokens: string[] = [];

    usersSnap.forEach(doc => {
      const token = doc.data().fcmToken;
      if (token) tokens.push(token);
    });

    if (tokens.length > 0) {
      const message = {
        notification: { title, body },
        tokens: tokens,
      };
      const response = await admin.messaging().sendEachForMulticast(message);
      res.json({ success: true, sentCount: response.successCount });
    } else {
      res.json({ success: true, sentCount: 0 });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Zalando Pro Full-Stack Server running on port ${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health\n`);
});
