import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBX3-pcg4gCUzHdPuRhP9BPTKbJr4zM2Mc',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'school-attendance-81385.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'school-attendance-81385',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'school-attendance-81385.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '232756214397',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:232756214397:web:67de1961741864be744f14',
};

import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

async function getDb() {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  if (!auth.currentUser) {
    try {
      const email = process.env.SYSTEM_CRON_EMAIL || process.env.ADMIN_EMAIL || 'supervisor.secondary@test.com';
      const pass = process.env.SYSTEM_CRON_PASSWORD || process.env.ADMIN_PASSWORD || 'Password123!';
      await signInWithEmailAndPassword(auth, email, pass);
    } catch {
      // ignore
    }
  }
  return getFirestore(app);
}

export async function DELETE() {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const db = await getDb();
    const snap = await getDocs(collection(db, 'absences'));
    if (snap.empty) {
      return NextResponse.json({ success: true, message: "No today's absences to archive.", count: 0 });
    }

    const batch = writeBatch(db);
    let count = 0;
    snap.docs.forEach((d) => {
      const data = d.data();
      const docDate = data.date || (data.timestamp?.toDate ? data.timestamp.toDate().toISOString().split('T')[0] : '');
      if (data.status !== 'archived' && (!docDate || docDate === todayStr)) {
        batch.update(d.ref, {
          status: 'archived',
          archivedAt: serverTimestamp(),
        });
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      message: `Successfully archived ${count} report(s) from today.`,
      count,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to archive today';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
