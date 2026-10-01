import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

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

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const {
      teacherName,
      subject,
      session,
      division,
      class: className,
      section,
      absentees,
      students,
      attendanceStatus,
      reason,
    } = payload || {};

    if (!division || !className || !section) {
      return NextResponse.json(
        { error: 'Division, Class, and Section are required.' },
        { status: 400 }
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const db = getDb();
    const docRef = await addDoc(collection(db, 'absences'), {
      teacherName: teacherName || 'Teacher',
      subject: subject || 'N/A',
      session: String(session || '1'),
      division,
      class: className,
      section,
      absentees: absentees || '',
      students: Array.isArray(students) ? students : [],
      attendanceStatus: attendanceStatus || 'Unexcused',
      reason: reason || '',
      status: 'active',
      date: todayStr,
      timestamp: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: 'Absence report submitted successfully.',
      id: docRef.id,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Submission failed';
    console.error('Server error submitting absence to Firestore:', errMsg);
    return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
  }
}
