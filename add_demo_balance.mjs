// Demo balance script — adds $3000 to ALL users
// Uses custom Firestore database ID from firebase-applet-config.json
import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'server', 'firebase-service-account.json'), 'utf8')
);
const appletConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf8')
);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

// Use the custom named database, not the default one
const db = admin.firestore();
db.settings({ databaseId: appletConfig.firestoreDatabaseId });

async function addDemoBalance() {
  console.log(`\n🔍 Fetching users from database: ${appletConfig.firestoreDatabaseId}\n`);
  const usersSnap = await db.collection('users').get();

  if (usersSnap.empty) {
    console.log('❌ No users found.');
    process.exit(0);
  }

  const batch = db.batch();
  let count = 0;

  usersSnap.forEach(docSnap => {
    const data = docSnap.data();
    const current = data.balance || 0;
    const newBal = current + 3000;
    batch.update(docSnap.ref, { balance: newBal });
    console.log(`  ✔ ${data.email || docSnap.id}: $${current.toFixed(2)} → $${newBal.toFixed(2)}`);
    count++;
  });

  await batch.commit();
  console.log(`\n✅ Done! Added $3000 to ${count} user(s). Refresh your app to see the balance.`);
  process.exit(0);
}

addDemoBalance().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
