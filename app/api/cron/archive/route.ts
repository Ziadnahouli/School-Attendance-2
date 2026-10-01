import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';

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

function getDbInstance() {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  return { app, db: getFirestore(app) };
}

async function performArchiving(): Promise<number> {
  const { app, db } = getDbInstance();

  const auth = getAuth(app);
  if (!auth.currentUser) {
    try {
      const email = process.env.SYSTEM_CRON_EMAIL || process.env.ADMIN_EMAIL || 'supervisor.secondary@test.com';
      const pass = process.env.SYSTEM_CRON_PASSWORD || process.env.ADMIN_PASSWORD || 'Password123!';
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e: unknown) {
      console.warn('Cron auth signin error:', e instanceof Error ? e.message : e);
    }
  }

  const absencesRef = collection(db, 'absences');

  // Query all active reports
  const snap = await getDocs(absencesRef);
  if (snap.empty) return 0;

  const todayStr = new Date().toISOString().split('T')[0];
  const batch = writeBatch(db);
  let count = 0;

  snap.docs.forEach((docSnap) => {
    const data = docSnap.data();
    // Only archive reports that are not already archived
    if (data.status === 'archived') return;

    let docDateStr = data.date;
    if (!docDateStr && data.timestamp?.toDate) {
      docDateStr = data.timestamp.toDate().toISOString().split('T')[0];
    }

    batch.update(docSnap.ref, {
      status: 'archived',
      archivedAt: serverTimestamp(),
      archiveDate: docDateStr || todayStr,
    });
    count++;
  });

  if (count > 0) {
    await batch.commit();
  }

  return count;
}

// Vercel Cron handler (GET) - runs automatically at midnight or when "Run" is clicked in Vercel
export async function GET(req: NextRequest) {
  try {
    const archivedCount = await performArchiving();
    return NextResponse.json({
      success: true,
      message: `Daily reset completed: Archived ${archivedCount} active absence report(s). Today's live dashboard feed is now cleared.`,
      count: archivedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Archiving failed';
    console.error('Cron archiving error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// Manual trigger handler from Admin Panel (POST)
export async function POST(req: NextRequest) {
  try {
    const archivedCount = await performArchiving();
    return NextResponse.json({
      success: true,
      message: `Successfully archived ${archivedCount} report(s). Today's supervisor feed is now refreshed.`,
      count: archivedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Archiving failed';
    console.error('Manual archiving error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
