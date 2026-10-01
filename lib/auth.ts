import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  getAuth,
  User,
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { auth, firebaseConfig } from './firebase';
import {
  checkIsAdmin,
  checkIsPrincipal,
  checkIsTeacher,
  setUserRoleDoc,
  getDivisionsForSupervisor,
  BUILTIN_ADMIN_EMAILS,
  BUILTIN_SUPERVISORS,
  BUILTIN_TEACHER_EMAILS,
} from './firestore';
import { UserRole } from './types';

// Helper to store active role in local storage for resilient testing
export function setLocalUserRole(role: UserRole, divisions?: string[]) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('user_role', role);
      if (divisions && divisions.length > 0) {
        localStorage.setItem('user_divisions', JSON.stringify(divisions));
      }
    } catch {
      // ignore storage error
    }
  }
}

export function getLocalUserRole(): { role: UserRole | null; divisions: string[] } {
  if (typeof window !== 'undefined') {
    try {
      const role = localStorage.getItem('user_role') as UserRole | null;
      const rawDivs = localStorage.getItem('user_divisions');
      const divisions = rawDivs ? JSON.parse(rawDivs) : [];
      return { role, divisions };
    } catch {
      // ignore storage error
    }
  }
  return { role: null, divisions: [] };
}

export function clearLocalUserRole() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_divisions');
    } catch {
      // ignore storage error
    }
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return cred.user;
}

export async function logoutUser(): Promise<void> {
  clearLocalUserRole();
  await signOut(auth);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function determineUserRole(
  uid: string,
  email?: string | null
): Promise<{
  role: UserRole | null;
  divisions?: string[];
}> {
  const normEmail = (email || '').trim().toLowerCase();

  // 1. Check Admin
  const isAdmin = await checkIsAdmin(uid, normEmail);
  if (isAdmin) {
    return { role: 'admin' };
  }

  // 2. Check Supervisor / Principal
  const principalCheck = await checkIsPrincipal(uid, normEmail);
  if (principalCheck.isPrincipal) {
    return { role: 'supervisor', divisions: principalCheck.divisions };
  }

  // 3. Check Teacher
  const isTeacher = await checkIsTeacher(uid, normEmail);
  if (isTeacher) {
    return { role: 'teacher' };
  }

  return { role: null, divisions: [] };
}

// Create user via secondary Firebase App instance (preserves admin session on client)
export async function createManagedUser(
  email: string,
  pass: string,
  role: 'principals' | 'teachers',
  roleData: Record<string, unknown>
): Promise<{ uid: string }> {
  const tempAppName = 'temp-admin-user-create-' + Date.now();
  const tempApp = initializeApp(firebaseConfig, tempAppName);
  const tempAuth = getAuth(tempApp);

  try {
    const cred = await createUserWithEmailAndPassword(tempAuth, email.trim(), pass);
    const uid = cred.user.uid;
    try {
      await setUserRoleDoc(role, uid, { ...roleData, email: email.trim() });
    } catch (e) {
      console.warn('Writing to Firestore role collection failed:', e);
    }
    return { uid };
  } finally {
    try {
      await deleteApp(tempApp);
    } catch (e) {
      console.warn('Failed to clean up temporary Firebase app:', e);
    }
  }
}
