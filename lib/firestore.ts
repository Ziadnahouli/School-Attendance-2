import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  getDocs,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Principal, Teacher, AbsenceRecord, StudentAbsentee } from './types';

// Built-in test accounts list for testing environment
export const BUILTIN_ADMIN_EMAILS = [
  'admin@test.com',
  'admin.test@attendance.edu',
  'admin@school.test',
];

export const BUILTIN_SUPERVISORS: Record<string, string[]> = {
  'supervisor.secondary@test.com': ['Secondary'],
  'secondary@test.com': ['Secondary'],
  'supervisor.elementary@test.com': ['Elementary'],
  'elementary@test.com': ['Elementary'],
  'supervisor.middle@test.com': ['Intermediate', 'Middle School'],
  'middle@test.com': ['Intermediate', 'Middle School'],
  'supervisor.technical@test.com': ['Technical Institute', 'Technical'],
  'technical@test.com': ['Technical Institute', 'Technical'],
  'supervisor.preschool@test.com': ['Preschool'],
  'preschool@test.com': ['Preschool'],
  // General / all-divisions supervisor account
  'supervisor@test.com': ['Elementary', 'Intermediate', 'Secondary', 'Preschool', 'Technical Institute'],
  'supervisor.test@attendance.edu': ['Elementary', 'Intermediate', 'Secondary', 'Preschool', 'Technical Institute'],
  'supervisor@school.test': ['Elementary', 'Intermediate', 'Secondary', 'Preschool', 'Technical Institute'],
};

// Map supervisor email to corresponding division(s)
export function getDivisionsForSupervisor(email?: string | null): string[] {
  const norm = (email || '').trim().toLowerCase();
  if (!norm) return [];

  // Teachers and Admins do not have supervisor divisions
  if (norm.includes('teacher') || norm.includes('admin')) {
    return [];
  }

  if (norm in BUILTIN_SUPERVISORS) {
    return BUILTIN_SUPERVISORS[norm];
  }

  if (norm.includes('secondary')) {
    return ['Secondary'];
  }
  if (norm.includes('elementary')) {
    return ['Elementary'];
  }
  if (norm.includes('middle') || norm.includes('intermediate')) {
    return ['Intermediate', 'Middle School'];
  }
  if (norm.includes('technical')) {
    return ['Technical Institute', 'Technical'];
  }
  if (norm.includes('preschool')) {
    return ['Preschool'];
  }

  if (norm.includes('supervisor') || norm.includes('principal')) {
    return ['Elementary', 'Intermediate', 'Secondary', 'Preschool', 'Technical Institute'];
  }

  return [];
}

export const BUILTIN_TEACHER_EMAILS = [
  'teacher@test.com',
  'teacher.test@attendance.edu',
  'teacher@school.test',
];

// Admin check
export async function checkIsAdmin(uid: string, email?: string | null): Promise<boolean> {
  const normEmail = email ? email.trim().toLowerCase() : '';

  // Teachers and Supervisors cannot be Admin
  if (
    normEmail &&
    (normEmail.includes('teacher') ||
      BUILTIN_TEACHER_EMAILS.includes(normEmail) ||
      normEmail.includes('supervisor') ||
      normEmail.includes('principal') ||
      normEmail in BUILTIN_SUPERVISORS)
  ) {
    return false;
  }

  try {
    const adminDocRef = doc(db, 'admins', uid);
    const snap = await getDoc(adminDocRef);
    if (snap.exists()) return true;
  } catch {
    // ignore
  }

  return (
    normEmail.length > 0 &&
    (BUILTIN_ADMIN_EMAILS.includes(normEmail) ||
      normEmail.startsWith('admin@') ||
      normEmail.startsWith('admin.'))
  );
}

// Principal / Supervisor check
export async function checkIsPrincipal(
  uid: string,
  email?: string | null
): Promise<{ isPrincipal: boolean; divisions: string[] }> {
  const normEmail = email ? email.trim().toLowerCase() : '';

  // Teachers and Admins are NOT supervisors!
  if (
    normEmail &&
    (normEmail.includes('teacher') ||
      BUILTIN_TEACHER_EMAILS.includes(normEmail) ||
      normEmail.includes('admin') ||
      BUILTIN_ADMIN_EMAILS.includes(normEmail))
  ) {
    return { isPrincipal: false, divisions: [] };
  }

  // 1. Check Firestore document first
  try {
    const principalDocRef = doc(db, 'principals', uid);
    const snap = await getDoc(principalDocRef);
    if (snap.exists()) {
      const data = snap.data();
      const defaultDivs = getDivisionsForSupervisor(normEmail);
      return {
        isPrincipal: true,
        divisions:
          Array.isArray(data?.divisions) && data.divisions.length > 0
            ? data.divisions
            : defaultDivs.length > 0
            ? defaultDivs
            : ['Elementary', 'Intermediate', 'Secondary', 'Preschool', 'Technical Institute'],
      };
    }
  } catch {
    // ignore
  }

  // 2. Check built-in supervisor test accounts or supervisor email patterns
  if (
    normEmail &&
    (normEmail in BUILTIN_SUPERVISORS ||
      normEmail.startsWith('supervisor@') ||
      normEmail.startsWith('supervisor.') ||
      normEmail.startsWith('principal@') ||
      normEmail.startsWith('principal.'))
  ) {
    const divs = BUILTIN_SUPERVISORS[normEmail] || getDivisionsForSupervisor(normEmail);
    return { isPrincipal: true, divisions: divs };
  }

  return { isPrincipal: false, divisions: [] };
}

// Teacher check
export async function checkIsTeacher(uid: string, email?: string | null): Promise<boolean> {
  const normEmail = email ? email.trim().toLowerCase() : '';

  // Admins and Supervisors are NOT teachers!
  if (
    normEmail &&
    (normEmail.includes('admin') ||
      BUILTIN_ADMIN_EMAILS.includes(normEmail) ||
      normEmail.includes('supervisor') ||
      normEmail.includes('principal') ||
      normEmail in BUILTIN_SUPERVISORS)
  ) {
    return false;
  }

  // 1. Check Firestore document
  try {
    const teacherDocRef = doc(db, 'teachers', uid);
    const snap = await getDoc(teacherDocRef);
    if (snap.exists()) {
      return true;
    }
  } catch {
    // ignore
  }

  // 2. Check built-in teacher test accounts or teacher email pattern
  if (
    normEmail &&
    (BUILTIN_TEACHER_EMAILS.includes(normEmail) ||
      normEmail.startsWith('teacher@') ||
      normEmail.startsWith('teacher.') ||
      normEmail.includes('teacher'))
  ) {
    return true;
  }

  return false;
}

// Default fallback list for principals in testing
export const DEFAULT_PRINCIPALS: Principal[] = [
  {
    id: 'supervisor-secondary',
    email: 'supervisor.secondary@test.com',
    divisions: ['Secondary'],
  },
  {
    id: 'supervisor-elementary',
    email: 'supervisor.elementary@test.com',
    divisions: ['Elementary'],
  },
  {
    id: 'supervisor-middle',
    email: 'supervisor.middle@test.com',
    divisions: ['Middle School'],
  },
  {
    id: 'supervisor-technical',
    email: 'supervisor.technical@test.com',
    divisions: ['Technical'],
  },
  {
    id: 'supervisor-general',
    email: 'supervisor@test.com',
    divisions: ['Elementary', 'Middle School', 'Secondary', 'Technical'],
  },
];

// Default fallback list for teachers in testing
export const DEFAULT_TEACHERS: Teacher[] = [
  { id: 'teacher-test-1', email: 'teacher@test.com' },
  { id: 'teacher-test-2', email: 'teacher.test@attendance.edu' },
];

// Subscribe to Principals
export function subscribePrincipals(callback: (principals: Principal[]) => void): Unsubscribe {
  const principalsRef = collection(db, 'principals');
  return onSnapshot(
    principalsRef,
    (snapshot) => {
      const list: Principal[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          email: data.email || '',
          divisions: Array.isArray(data.divisions) ? data.divisions : [],
        };
      });
      callback(list.length > 0 ? list : DEFAULT_PRINCIPALS);
    },
    () => {
      callback(DEFAULT_PRINCIPALS);
    }
  );
}

// Subscribe to Teachers
export function subscribeTeachers(callback: (teachers: Teacher[]) => void): Unsubscribe {
  const teachersRef = collection(db, 'teachers');
  return onSnapshot(
    teachersRef,
    (snapshot) => {
      const list: Teacher[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          email: data.email || '',
        };
      });
      callback(list.length > 0 ? list : DEFAULT_TEACHERS);
    },
    () => {
      callback(DEFAULT_TEACHERS);
    }
  );
}

// Update Principal Divisions
export async function updatePrincipalDivisions(docId: string, divisions: string[]): Promise<void> {
  try {
    const ref = doc(db, 'principals', docId);
    await updateDoc(ref, { divisions });
  } catch (e) {
    console.warn('Update principal divisions failed in Firestore, updated locally:', e);
  }
}

// Delete user role doc from collection ('principals' or 'teachers')
export async function deleteUserDoc(collectionName: 'principals' | 'teachers', docId: string): Promise<void> {
  try {
    const ref = doc(db, collectionName, docId);
    await deleteDoc(ref);
  } catch (e) {
    console.warn(`Deleting ${collectionName} doc failed in Firestore:`, e);
  }
}

// Set user role doc
export async function setUserRoleDoc(
  collectionName: 'principals' | 'teachers',
  uid: string,
  data: Record<string, unknown>
): Promise<void> {
  const ref = doc(db, collectionName, uid);
  await setDoc(ref, data);
}

// Subscribe to Absences with division filtering & daily/active separation
export function subscribeAbsences(
  allowedDivisions: string[],
  callback: (records: AbsenceRecord[]) => void,
  onlyToday = true
): Unsubscribe {
  const absencesRef = collection(db, 'absences');
  const allowedLower = allowedDivisions.map((d) => String(d || '').trim().toLowerCase());
  const todayDateStr = new Date().toDateString();

  return onSnapshot(
    absencesRef,
    (snapshot) => {
      const records: AbsenceRecord[] = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          let timestamp: Date;
          if (data.timestamp instanceof Timestamp) {
            timestamp = data.timestamp.toDate();
          } else if (data.timestamp?.toDate) {
            timestamp = data.timestamp.toDate();
          } else if (data.timestamp) {
            timestamp = new Date(data.timestamp);
          } else {
            timestamp = new Date();
          }

          const rawStudents = Array.isArray(data.students) ? data.students : [];
          const students: StudentAbsentee[] = rawStudents.map((s: Record<string, unknown>) => ({
            name: String(s.name || '').trim(),
            status: String(s.status || data.attendanceStatus || 'Unexcused').trim(),
            reason: String(s.reason || data.reason || '').trim(),
          }));

          return {
            id: docSnap.id,
            teacherName: data.teacherName || 'System Record',
            subject: data.subject || 'N/A',
            session: String(data.session ?? 'N/A'),
            division: data.division || '',
            class: data.class || '',
            section: data.section || '',
            absentees: data.absentees || '',
            attendanceStatus: data.attendanceStatus || 'Unexcused',
            reason: data.reason || '',
            students,
            status: data.status || 'active',
            timestamp,
          };
        })
        .filter((report) => {
          // 1. Division filter
          const div = String(report.division || '').trim().toLowerCase();
          const matchesDiv = allowedLower.length === 0 || allowedLower.includes(div);
          if (!matchesDiv) return false;

          // 2. Daily active filter: only show today's active reports on the supervisor board
          if (onlyToday) {
            const isArchived = report.status === 'archived';
            const isToday = report.timestamp.toDateString() === todayDateStr;
            return !isArchived && isToday;
          }

          return true;
        });

      callback(records);
    },
    (err) => {
      console.warn('Realtime absences subscription notice:', err.message);
      callback([]);
    }
  );
}

// Fetch archived absences for the Admin Panel export & audit
export async function fetchArchivedAbsences(options?: {
  division?: string;
  date?: string;
}): Promise<AbsenceRecord[]> {
  try {
    const absencesRef = collection(db, 'absences');
    const snapshot = await getDocs(absencesRef);
    if (snapshot.empty) return [];

    const todayDateStr = new Date().toDateString();

    const records: AbsenceRecord[] = snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data();
        let timestamp: Date;
        if (data.timestamp instanceof Timestamp) {
          timestamp = data.timestamp.toDate();
        } else if (data.timestamp?.toDate) {
          timestamp = data.timestamp.toDate();
        } else if (data.timestamp) {
          timestamp = new Date(data.timestamp);
        } else {
          timestamp = new Date();
        }

        const rawStudents = Array.isArray(data.students) ? data.students : [];
        const students: StudentAbsentee[] = rawStudents.map((s: Record<string, unknown>) => ({
          name: String(s.name || '').trim(),
          status: String(s.status || data.attendanceStatus || 'Unexcused').trim(),
          reason: String(s.reason || data.reason || '').trim(),
        }));

        return {
          id: docSnap.id,
          teacherName: data.teacherName || 'System Record',
          subject: data.subject || 'N/A',
          session: String(data.session ?? 'N/A'),
          division: data.division || '',
          class: data.class || '',
          section: data.section || '',
          absentees: data.absentees || '',
          attendanceStatus: data.attendanceStatus || 'Unexcused',
          reason: data.reason || '',
          students,
          status: data.status || 'active',
          timestamp,
        };
      })
      .filter((r) => {
        // Any record marked as archived OR from a previous day is part of the archive
        const isArchived = r.status === 'archived' || r.timestamp.toDateString() !== todayDateStr;
        if (!isArchived) return false;

        if (options?.division && options.division !== 'All') {
          if (r.division.toLowerCase() !== options.division.toLowerCase()) return false;
        }

        if (options?.date) {
          const reportIsoDate = r.timestamp.toISOString().split('T')[0];
          if (reportIsoDate !== options.date) return false;
        }

        return true;
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return records;
  } catch (err) {
    console.error('Failed to fetch archived absences:', err);
    return [];
  }
}

// Archive all active absences directly in Firestore
export async function archiveAllActiveAbsences(): Promise<number> {
  const snapshot = await getDocs(collection(db, 'absences'));
  if (snapshot.empty) return 0;
  const batch = writeBatch(db);
  let count = 0;
  snapshot.docs.forEach((d) => {
    const data = d.data();
    if (data.status !== 'archived') {
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
  return count;
}

// Direct write absence directly to Firestore
export async function addAbsenceDirectly(data: {
  teacherName: string;
  subject: string;
  session: string;
  division: string;
  class: string;
  section: string;
  absentees: string;
  students: StudentAbsentee[];
  attendanceStatus?: string;
  reason?: string;
}): Promise<string> {
  const absencesRef = collection(db, 'absences');
  const todayStr = new Date().toISOString().split('T')[0];
  const docRef = await addDoc(absencesRef, {
    ...data,
    status: 'active',
    date: todayStr,
    timestamp: serverTimestamp(),
  });
  return docRef.id;
}

// Direct batch delete for all absences in Firestore
export async function clearAllAbsencesDirectly(): Promise<number> {
  const snapshot = await getDocs(collection(db, 'absences'));
  if (snapshot.empty) return 0;
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snapshot.size;
}
