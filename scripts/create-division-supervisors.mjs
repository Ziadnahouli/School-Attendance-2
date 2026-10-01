import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBX3-pcg4gCUzHdPuRhP9BPTKbJr4zM2Mc",
  authDomain: "school-attendance-81385.firebaseapp.com",
  projectId: "school-attendance-81385",
  storageBucket: "school-attendance-81385.firebasestorage.app",
  messagingSenderId: "232756214397",
  appId: "1:232756214397:web:67de1961741864be744f14"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const accounts = [
  { email: 'supervisor.secondary@test.com', pass: 'Password123!', div: 'Secondary' },
  { email: 'supervisor.elementary@test.com', pass: 'Password123!', div: 'Elementary' },
  { email: 'supervisor.middle@test.com', pass: 'Password123!', div: 'Middle School' },
  { email: 'supervisor.technical@test.com', pass: 'Password123!', div: 'Technical' },
];

async function ensureAccounts() {
  for (const acc of accounts) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, acc.email, acc.pass);
      console.log(`Created account for ${acc.div}: ${acc.email} (UID: ${cred.user.uid})`);
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        console.log(`Account already exists: ${acc.email}`);
      } else {
        console.error(`Failed to create ${acc.email}:`, e.message);
      }
    }
  }
}

ensureAccounts().then(() => process.exit(0));
