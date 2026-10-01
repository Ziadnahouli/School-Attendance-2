export type UserRole = 'admin' | 'supervisor' | 'teacher';

export interface UserProfile {
  uid: string;
  email: string | null;
  role: UserRole;
  divisions?: string[];
}

export interface Principal {
  id: string;
  email: string;
  divisions: string[];
}

export interface Teacher {
  id: string;
  email: string;
}

export interface Admin {
  id: string;
  email?: string;
}

export interface StudentAbsentee {
  name: string;
  status: 'Unexcused' | 'Excused' | 'Late' | string;
  reason?: string;
}

export interface AbsenceRecord {
  id: string;
  teacherName: string;
  subject: string;
  session: string;
  division: string;
  class: string;
  section: string;
  absentees: string;
  attendanceStatus?: string;
  reason?: string;
  students: StudentAbsentee[];
  status?: 'active' | 'archived' | string;
  timestamp: Date;
}

export interface AggregatedAbsence {
  division: string;
  class: string;
  section: string;
  teacherName: string;
  subject: string;
  session: string;
  statuses?: Set<string>;
  reasons?: Set<string>;
  students: StudentAbsentee[];
  count: number;
  timestamp: Date;
}

export interface ClassInfo {
  id?: string;
  division: string;
  name: string;
  section: string;
  [key: string]: unknown;
}

export interface SubmissionPayload {
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
}
