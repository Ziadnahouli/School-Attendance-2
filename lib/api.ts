import { ClassInfo, SubmissionPayload } from './types';
import { addAbsenceDirectly } from './firestore';

// Fallback school classes matching typical curriculum structure if Render server is unavailable
export const DEFAULT_CLASSES: ClassInfo[] = [
  { division: 'Elementary', name: 'Grade 1', section: 'A' },
  { division: 'Elementary', name: 'Grade 1', section: 'B' },
  { division: 'Elementary', name: 'Grade 2', section: 'A' },
  { division: 'Elementary', name: 'Grade 2', section: 'B' },
  { division: 'Elementary', name: 'Grade 3', section: 'A' },
  { division: 'Elementary', name: 'Grade 3', section: 'B' },
  { division: 'Middle School', name: 'Grade 7', section: 'A' },
  { division: 'Middle School', name: 'Grade 7', section: 'B' },
  { division: 'Middle School', name: 'Grade 8', section: 'A' },
  { division: 'Middle School', name: 'Grade 8', section: 'B' },
  { division: 'Middle School', name: 'Grade 9', section: 'Brevet' },
  { division: 'Secondary', name: 'Grade 10', section: 'Scientific' },
  { division: 'Secondary', name: 'Grade 10', section: 'Literary' },
  { division: 'Secondary', name: 'Grade 11', section: 'Scientific' },
  { division: 'Secondary', name: 'Grade 11', section: 'Humanities' },
  { division: 'Secondary', name: 'Grade 12', section: 'General Sciences' },
  { division: 'Secondary', name: 'Grade 12', section: 'Life Sciences' },
  { division: 'Technical', name: 'BT1', section: 'Computer Science' },
  { division: 'Technical', name: 'BT2', section: 'Computer Science' },
  { division: 'Technical', name: 'BT3', section: 'Computer Science' },
  { division: 'Technical', name: 'TS1', section: 'Software Development' },
  { division: 'Technical', name: 'TS2', section: 'Software Development' },
];

export async function fetchClasses(): Promise<ClassInfo[]> {
  try {
    const res = await fetch('/api/classes', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Failed to load classes: HTTP ${res.status}`);
    }
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    return DEFAULT_CLASSES;
  } catch (error) {
    console.warn('Using default classes due to external API unavailability:', error);
    return DEFAULT_CLASSES;
  }
}

export async function syncClasses(): Promise<ClassInfo[]> {
  const res = await fetch('/api/classes?sync=true', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to sync classes from database: HTTP ${res.status}`);
  }
  return await res.json();
}

export async function addClass(classData: {
  division: string;
  name: string;
  section: string;
}): Promise<{ success: boolean; message: string; class: ClassInfo; classes: ClassInfo[] }> {
  const res = await fetch('/api/classes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(classData),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Failed to add class (HTTP ${res.status})`);
  }
  return data;
}

export async function deleteClass(
  id: string
): Promise<{ success: boolean; message: string; classes: ClassInfo[] }> {
  const res = await fetch(`/api/classes?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Failed to delete class (HTTP ${res.status})`);
  }
  return data;
}

export async function submitAbsenceReport(payload: SubmissionPayload): Promise<{ success: boolean; message?: string; id?: string }> {
  try {
    const res = await fetch('/api/absences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { success: true, message: data.message || 'Absence report submitted successfully!', id: data.id };
    }
    throw new Error(data.error || data.message || `Submission failed with status ${res.status}`);
  } catch (apiErr: unknown) {
    console.warn('API route submission error, attempting direct Firestore write fallback...', apiErr);
    try {
      const docId = await addAbsenceDirectly({
        teacherName: payload.teacherName,
        subject: payload.subject,
        session: String(payload.session),
        division: payload.division,
        class: payload.class,
        section: payload.section,
        absentees: payload.absentees,
        students: payload.students || [],
        attendanceStatus: payload.attendanceStatus,
        reason: payload.reason,
      });
      return { success: true, message: 'Absence report submitted successfully!', id: docId };
    } catch (directErr: unknown) {
      const msg = directErr instanceof Error ? directErr.message : String(directErr);
      throw new Error(msg);
    }
  }
}

export async function archiveDailyReports(all = false): Promise<{ success: boolean; message: string; count: number }> {
  const res = await fetch('/api/cron/archive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ all }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Archiving failed: HTTP ${res.status}`);
  }
  return data;
}

export async function resetAllAbsences(): Promise<{ success: boolean; message?: string; count?: number }> {
  const res = await fetch('/api/absences/all', {
    method: 'DELETE',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Failed to archive: HTTP ${res.status}`);
  }
  return { success: true, message: data.message || 'All absence reports archived.', count: data.count };
}

export async function resetTodayAbsences(): Promise<{ success: boolean; message?: string; count?: number }> {
  const res = await fetch('/api/absences/today', {
    method: 'DELETE',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Failed to archive today's absences: HTTP ${res.status}`);
  }
  return { success: true, message: data.message || "Today's absences archived.", count: data.count };
}


