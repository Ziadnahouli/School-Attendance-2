'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/components/auth/AuthContext';
import {
  subscribePrincipals,
  subscribeTeachers,
  updatePrincipalDivisions,
  deleteUserDoc,
  fetchArchivedAbsences,
  fetchAllAbsences,
  archiveAllActiveAbsences,
} from '@/lib/firestore';
import { createManagedUser, sendPasswordReset } from '@/lib/auth';
import { fetchClasses, addClass, deleteClass, syncClasses, archiveDailyReports } from '@/lib/api';
import { Principal, Teacher, ClassInfo, AbsenceRecord } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute allowedRole="admin" loginPath="/admin/login">
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}

function AdminDashboardContent() {
  const { logout } = useAuth();
  const router = useRouter();

  const [principals, setPrincipals] = useState<Principal[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  // Classes & Divisions state
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [syncingClasses, setSyncingClasses] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [cDivision, setCDivision] = useState('Secondary');
  const [cCustomDivision, setCCustomDivision] = useState('');
  const [cName, setCName] = useState('');
  const [cSection, setCSection] = useState('');
  const [cSubmitting, setCSubmitting] = useState(false);
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState('All');
  const [classSearch, setClassSearch] = useState('');

  // Modal / Form state for Add Principal
  const [showAddPrincipalModal, setShowAddPrincipalModal] = useState(false);
  const [pEmail, setPEmail] = useState('');
  const [pPassword, setPPassword] = useState('');
  const [pDivisions, setPDivisions] = useState('');
  const [pSubmitting, setPSubmitting] = useState(false);

  // Modal / Form state for Add Teacher
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [tEmail, setTEmail] = useState('');
  const [tPassword, setTPassword] = useState('');
  const [tSubmitting, setTSubmitting] = useState(false);

  // Edit Principal Divisions state
  const [editingPrincipal, setEditingPrincipal] = useState<Principal | null>(null);
  const [editDivisionsStr, setEditDivisionsStr] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Archived Reports & Export state
  const [archivedReports, setArchivedReports] = useState<AbsenceRecord[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(true);
  const [archivingNow, setArchivingNow] = useState(false);
  const [archiveDateFilter, setArchiveDateFilter] = useState('');
  const [archiveDivisionFilter, setArchiveDivisionFilter] = useState('All');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [expandedArchiveId, setExpandedArchiveId] = useState<string | null>(null);

  // Statistical Intelligence Hub state
  const [allRecords, setAllRecords] = useState<AbsenceRecord[]>([]);
  const [statsTimeframe, setStatsTimeframe] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [statsDivision, setStatsDivision] = useState('All');
  const [statsActiveTab, setStatsActiveTab] = useState<'divisions' | 'classes' | 'students' | 'sessions' | 'subjects'>('divisions');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'admin');
    return () => {
      document.documentElement.removeAttribute('data-theme');
    };
  }, []);

  useEffect(() => {
    let principalsLoaded = false;
    let teachersLoaded = false;

    const unsubPrincipals = subscribePrincipals((data) => {
      setPrincipals(data);
      principalsLoaded = true;
      if (teachersLoaded) setLoading(false);
    });

    const unsubTeachers = subscribeTeachers((data) => {
      setTeachers(data);
      teachersLoaded = true;
      if (principalsLoaded) setLoading(false);
    });

    return () => {
      unsubPrincipals();
      unsubTeachers();
    };
  }, []);

  const loadClassesData = async () => {
    setLoadingClasses(true);
    try {
      const data = await fetchClasses();
      setClasses(data);
    } catch (err) {
      console.error('Failed to load classes:', err);
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleSyncClasses = async () => {
    setSyncingClasses(true);
    try {
      const data = await syncClasses();
      setClasses(data);
      alert(`Successfully synchronized ${data.length} classes directly from the school database!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sync classes';
      alert(msg);
    } finally {
      setSyncingClasses(false);
    }
  };

  const loadArchivedData = async () => {
    setLoadingArchive(true);
    try {
      const [archived, all] = await Promise.all([
        fetchArchivedAbsences(),
        fetchAllAbsences(),
      ]);
      setArchivedReports(archived);
      setAllRecords(all);
    } catch (err) {
      console.error('Failed to load archived/all reports:', err);
    } finally {
      setLoadingArchive(false);
    }
  };

  useEffect(() => {
    loadClassesData();
    loadArchivedData();
  }, []);

  const availableDivisions = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => {
      if (c.division) set.add(c.division.trim());
    });
    if (set.size === 0) {
      ['Elementary', 'Intermediate', 'Secondary', 'Preschool', 'Technical Institute'].forEach((d) => set.add(d));
    }
    return Array.from(set).sort();
  }, [classes]);

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const matchesDiv =
        selectedDivisionFilter === 'All' ||
        c.division.toLowerCase() === selectedDivisionFilter.toLowerCase();
      const q = classSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.section.toLowerCase().includes(q) ||
        c.division.toLowerCase().includes(q);
      return matchesDiv && matchesSearch;
    });
  }, [classes, selectedDivisionFilter, classSearch]);

  const filteredArchivedReports = useMemo(() => {
    return archivedReports.filter((r) => {
      // Division filter
      if (archiveDivisionFilter !== 'All') {
        if ((r.division || '').toLowerCase() !== archiveDivisionFilter.toLowerCase()) {
          return false;
        }
      }

      // Date filter (YYYY-MM-DD)
      if (archiveDateFilter) {
        const itemDate = r.timestamp.toISOString().split('T')[0];
        if (itemDate !== archiveDateFilter) {
          return false;
        }
      }

      // Search filter
      if (archiveSearch.trim()) {
        const q = archiveSearch.trim().toLowerCase();
        const matchesMain =
          (r.teacherName || '').toLowerCase().includes(q) ||
          (r.subject || '').toLowerCase().includes(q) ||
          (r.class || '').toLowerCase().includes(q) ||
          (r.section || '').toLowerCase().includes(q) ||
          (r.division || '').toLowerCase().includes(q) ||
          (r.absentees || '').toLowerCase().includes(q) ||
          (r.reason || '').toLowerCase().includes(q);

        const matchesStudents = r.students.some(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.status.toLowerCase().includes(q) ||
            (s.reason || '').toLowerCase().includes(q)
        );

        if (!matchesMain && !matchesStudents) {
          return false;
        }
      }

      return true;
    });
  }, [archivedReports, archiveDivisionFilter, archiveDateFilter, archiveSearch]);

  const totalStudentsInArchive = useMemo(() => {
    return filteredArchivedReports.reduce((acc, r) => {
      return acc + (r.students && r.students.length > 0 ? r.students.length : 1);
    }, 0);
  }, [filteredArchivedReports]);

  // ==========================================
  // STATISTICAL INTELLIGENCE & ANALYTICS HOOKS
  // ==========================================

  // Filtered dataset for statistics based on timeframe and division
  const statsFilteredReports = useMemo(() => {
    const todayStr = new Date().toDateString();
    const now = Date.now();
    return allRecords.filter((r) => {
      // Division filter
      if (statsDivision !== 'All') {
        if ((r.division || '').toLowerCase() !== statsDivision.toLowerCase()) {
          return false;
        }
      }

      // Timeframe filter
      if (statsTimeframe === 'today') {
        return r.timestamp.toDateString() === todayStr;
      }
      if (statsTimeframe === 'week') {
        return now - r.timestamp.getTime() <= 7 * 24 * 60 * 60 * 1000;
      }
      if (statsTimeframe === 'month') {
        return now - r.timestamp.getTime() <= 30 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
  }, [allRecords, statsDivision, statsTimeframe]);

  // Overall KPI metrics
  const statsMetrics = useMemo(() => {
    let unexcusedCount = 0;
    let excusedCount = 0;
    let lateCount = 0;
    let totalStudentIncidents = 0;

    statsFilteredReports.forEach((r) => {
      if (r.students && r.students.length > 0) {
        r.students.forEach((s) => {
          totalStudentIncidents++;
          const st = (s.status || '').toLowerCase();
          if (st.includes('excused')) excusedCount++;
          else if (st.includes('late')) lateCount++;
          else unexcusedCount++;
        });
      } else {
        totalStudentIncidents++;
        const st = (r.attendanceStatus || '').toLowerCase();
        if (st.includes('excused')) excusedCount++;
        else if (st.includes('late')) lateCount++;
        else unexcusedCount++;
      }
    });

    const unexcusedPct = totalStudentIncidents > 0 ? Math.round((unexcusedCount / totalStudentIncidents) * 100) : 0;
    const excusedPct = totalStudentIncidents > 0 ? Math.round((excusedCount / totalStudentIncidents) * 100) : 0;
    const latePct = totalStudentIncidents > 0 ? Math.round((lateCount / totalStudentIncidents) * 100) : 0;

    // Active today count
    const todayDateStr = new Date().toDateString();
    const activeTodayReports = allRecords.filter((r) => r.timestamp.toDateString() === todayDateStr && r.status !== 'archived');
    const totalArchivedReports = allRecords.filter((r) => r.status === 'archived' || r.timestamp.toDateString() !== todayDateStr);

    return {
      totalReports: statsFilteredReports.length,
      totalStudentIncidents,
      unexcusedCount,
      excusedCount,
      lateCount,
      unexcusedPct,
      excusedPct,
      latePct,
      activeTodayCount: activeTodayReports.length,
      archivedTotalCount: totalArchivedReports.length,
    };
  }, [statsFilteredReports, allRecords]);

  // Division-by-division breakdown
  const divisionBreakdown = useMemo(() => {
    const map = new Map<string, { reports: number; students: number; unexcused: number; excused: number; late: number }>();

    availableDivisions.forEach((d) => {
      map.set(d, { reports: 0, students: 0, unexcused: 0, excused: 0, late: 0 });
    });

    statsFilteredReports.forEach((r) => {
      const divName = r.division || 'Unassigned';
      if (!map.has(divName)) {
        map.set(divName, { reports: 0, students: 0, unexcused: 0, excused: 0, late: 0 });
      }
      const entry = map.get(divName)!;
      entry.reports++;

      if (r.students && r.students.length > 0) {
        r.students.forEach((s) => {
          entry.students++;
          const st = (s.status || '').toLowerCase();
          if (st.includes('excused')) entry.excused++;
          else if (st.includes('late')) entry.late++;
          else entry.unexcused++;
        });
      } else {
        entry.students++;
        const st = (r.attendanceStatus || '').toLowerCase();
        if (st.includes('excused')) entry.excused++;
        else if (st.includes('late')) entry.late++;
        else entry.unexcused++;
      }
    });

    const totalStudents = statsMetrics.totalStudentIncidents || 1;
    return Array.from(map.entries())
      .map(([division, data]) => ({
        division,
        ...data,
        percentage: Math.round((data.students / totalStudents) * 100),
      }))
      .sort((a, b) => b.students - a.students);
  }, [statsFilteredReports, availableDivisions, statsMetrics.totalStudentIncidents]);

  // Top affected classes leaderboard
  const topAffectedClasses = useMemo(() => {
    const map = new Map<string, { className: string; section: string; division: string; totalAbsences: number; unexcused: number; late: number; excused: number }>();

    statsFilteredReports.forEach((r) => {
      const key = `${r.division}::${r.class}::${r.section}`;
      if (!map.has(key)) {
        map.set(key, {
          className: r.class,
          section: r.section,
          division: r.division,
          totalAbsences: 0,
          unexcused: 0,
          late: 0,
          excused: 0,
        });
      }
      const item = map.get(key)!;
      const count = r.students && r.students.length > 0 ? r.students.length : 1;
      item.totalAbsences += count;

      if (r.students && r.students.length > 0) {
        r.students.forEach((s) => {
          const st = (s.status || '').toLowerCase();
          if (st.includes('excused')) item.excused++;
          else if (st.includes('late')) item.late++;
          else item.unexcused++;
        });
      } else {
        const st = (r.attendanceStatus || '').toLowerCase();
        if (st.includes('excused')) item.excused++;
        else if (st.includes('late')) item.late++;
        else item.unexcused++;
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b.totalAbsences - a.totalAbsences)
      .slice(0, 8);
  }, [statsFilteredReports]);

  // Repeat absentee students watchlist (chronic absenteeism / at-risk)
  const repeatAbsenteeStudents = useMemo(() => {
    const studentMap = new Map<string, {
      name: string;
      total: number;
      unexcused: number;
      late: number;
      excused: number;
      divisions: Set<string>;
      classes: Set<string>;
      reasons: Set<string>;
      lastSeen: Date;
    }>();

    statsFilteredReports.forEach((r) => {
      if (r.students && r.students.length > 0) {
        r.students.forEach((s) => {
          const rawName = s.name.trim();
          if (!rawName) return;
          const key = rawName.toLowerCase();
          if (!studentMap.has(key)) {
            studentMap.set(key, {
              name: rawName,
              total: 0,
              unexcused: 0,
              late: 0,
              excused: 0,
              divisions: new Set(),
              classes: new Set(),
              reasons: new Set(),
              lastSeen: r.timestamp,
            });
          }
          const item = studentMap.get(key)!;
          item.total++;
          if (r.division) item.divisions.add(r.division);
          if (r.class) item.classes.add(`${r.class} (${r.section})`);
          if (s.reason) item.reasons.add(s.reason);
          else if (r.reason) item.reasons.add(r.reason);

          const st = (s.status || '').toLowerCase();
          if (st.includes('excused')) item.excused++;
          else if (st.includes('late')) item.late++;
          else item.unexcused++;

          if (r.timestamp > item.lastSeen) item.lastSeen = r.timestamp;
        });
      }
    });

    return Array.from(studentMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [statsFilteredReports]);

  // Hourly session / period distribution
  const sessionPeriodStats = useMemo(() => {
    const sessionMap = new Map<string, number>();
    for (let i = 1; i <= 8; i++) {
      sessionMap.set(String(i), 0);
    }

    statsFilteredReports.forEach((r) => {
      const sess = String(r.session || '1');
      const count = r.students && r.students.length > 0 ? r.students.length : 1;
      sessionMap.set(sess, (sessionMap.get(sess) || 0) + count);
    });

    const totalStudents = statsMetrics.totalStudentIncidents || 1;
    let maxSession = '1';
    let maxCount = 0;

    const list = Array.from(sessionMap.entries())
      .map(([session, count]) => {
        if (count > maxCount) {
          maxCount = count;
          maxSession = session;
        }
        return {
          session,
          count,
          percentage: Math.round((count / totalStudents) * 100),
        };
      })
      .sort((a, b) => Number(a.session) - Number(b.session));

    return { list, peakSession: maxSession, peakCount: maxCount };
  }, [statsFilteredReports, statsMetrics.totalStudentIncidents]);

  // Most reported subjects
  const subjectReportingStats = useMemo(() => {
    const map = new Map<string, number>();
    statsFilteredReports.forEach((r) => {
      const subj = (r.subject || '').trim();
      if (!subj || subj.toLowerCase() === 'n/a') return;
      map.set(subj, (map.get(subj) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [statsFilteredReports]);

  // Common absence reasons
  const commonReasonsStats = useMemo(() => {
    const map = new Map<string, number>();
    statsFilteredReports.forEach((r) => {
      if (r.students && r.students.length > 0) {
        r.students.forEach((s) => {
          const reason = (s.reason || r.reason || '').trim();
          if (!reason) {
            map.set('No Reason Provided', (map.get('No Reason Provided') || 0) + 1);
          } else {
            map.set(reason, (map.get(reason) || 0) + 1);
          }
        });
      } else {
        const reason = (r.reason || '').trim();
        if (!reason) {
          map.set('No Reason Provided', (map.get('No Reason Provided') || 0) + 1);
        } else {
          map.set(reason, (map.get(reason) || 0) + 1);
        }
      }
    });

    return Array.from(map.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [statsFilteredReports]);

  const handleExportArchivedCSV = () => {
    if (filteredArchivedReports.length === 0) {
      alert('No archived attendance reports available to export with the current filters.');
      return;
    }

    const headers = [
      'Record ID',
      'Date',
      'Time',
      'Division',
      'Class',
      'Section',
      'Session',
      'Teacher',
      'Subject',
      'Student Name',
      'Status',
      'Reason',
      'Report State',
    ];

    const escapeCsv = (val: string | number | undefined | null) => {
      const str = val === undefined || val === null ? '' : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows: string[] = [headers.join(',')];

    filteredArchivedReports.forEach((r) => {
      const dateStr = r.timestamp.toLocaleDateString();
      const timeStr = r.timestamp.toLocaleTimeString();

      if (r.students && r.students.length > 0) {
        r.students.forEach((s) => {
          rows.push(
            [
              escapeCsv(r.id),
              escapeCsv(dateStr),
              escapeCsv(timeStr),
              escapeCsv(r.division),
              escapeCsv(r.class),
              escapeCsv(r.section),
              escapeCsv(r.session),
              escapeCsv(r.teacherName),
              escapeCsv(r.subject),
              escapeCsv(s.name),
              escapeCsv(s.status),
              escapeCsv(s.reason || r.reason || ''),
              escapeCsv(r.status || 'archived'),
            ].join(',')
          );
        });
      } else {
        rows.push(
          [
            escapeCsv(r.id),
            escapeCsv(dateStr),
            escapeCsv(timeStr),
            escapeCsv(r.division),
            escapeCsv(r.class),
            escapeCsv(r.section),
            escapeCsv(r.session),
            escapeCsv(r.teacherName),
            escapeCsv(r.subject),
            escapeCsv(r.absentees),
            escapeCsv(r.attendanceStatus || 'Absent'),
            escapeCsv(r.reason || ''),
            escapeCsv(r.status || 'archived'),
          ].join(',')
        );
      }
    });

    const csvContent = '\uFEFF' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filterTag = archiveDateFilter ? `_${archiveDateFilter}` : '';
    const divTag = archiveDivisionFilter !== 'All' ? `_${archiveDivisionFilter}` : '';
    link.download = `School_Archived_Attendance${divTag}${filterTag}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintArchived = () => {
    if (filteredArchivedReports.length === 0) {
      alert('No archived attendance reports available to print with the current filters.');
      return;
    }

    const rowsHtml = filteredArchivedReports
      .map((r) => {
        const studentList =
          r.students && r.students.length > 0
            ? r.students
                .map(
                  (s) =>
                    `<div style="margin-bottom: 3px;"><strong>${s.name}</strong> <span style="font-size:11px; padding:2px 6px; border-radius:3px; background:#f1f5f9; color:#475569;">${s.status}</span> ${s.reason ? `<em style="color:#64748b;">(${s.reason})</em>` : ''}</div>`
                )
                .join('')
            : `<div>${r.absentees} ${r.reason ? `(${r.reason})` : ''}</div>`;

        return `
        <tr>
          <td>${r.timestamp.toLocaleDateString()}<br/><span style="font-size:11px; color:#64748b;">${r.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
          <td><strong>${r.division}</strong></td>
          <td>${r.class} - Sec ${r.section}</td>
          <td>Session ${r.session}</td>
          <td><strong>${r.teacherName}</strong><br/><span style="font-size:11px; color:#64748b;">${r.subject}</span></td>
          <td>${studentList}</td>
        </tr>
      `;
      })
      .join('');

    const printWin = window.open('', '_blank', 'width=960,height=800');
    if (!printWin) {
      alert('Please allow popup windows to print archived reports.');
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Archived School Attendance - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1e293b; }
            h1 { margin: 0 0 6px 0; font-size: 22px; color: #0f172a; }
            .header-info { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
            .meta { font-size: 13px; color: #64748b; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; vertical-align: top; }
            th { background-color: #f8fafc; font-weight: 700; color: #334155; }
            tr:nth-child(even) { background-color: #fbfcfe; }
            .btn-print { background: #22c55e; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; }
            @media print {
              .no-print { display: none !important; }
              body { padding: 0; }
              th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <div>
              <h1>School Attendance Historical Archive</h1>
              <div class="meta">
                Generated: ${new Date().toLocaleString()}<br/>
                Division Filter: <strong>${archiveDivisionFilter}</strong> | Date Filter: <strong>${archiveDateFilter || 'All Dates'}</strong> | Total Records: <strong>${filteredArchivedReports.length}</strong>
              </div>
            </div>
            <div class="no-print">
              <button class="btn-print" onclick="window.print()">Print / Export PDF</button>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 110px;">Date & Time</th>
                <th style="width: 100px;">Division</th>
                <th style="width: 100px;">Class & Sec</th>
                <th style="width: 70px;">Session</th>
                <th style="width: 140px;">Teacher & Subject</th>
                <th>Absentees & Details</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const handleManualArchiveActive = async () => {
    if (
      !confirm(
        'Are you sure you want to archive all currently active attendance reports now?\n\n' +
          'This will move today’s active reports into the historical archive and reset the supervisor live board for a fresh start.'
      )
    ) {
      return;
    }

    setArchivingNow(true);
    try {
      let count = 0;
      try {
        const res = await archiveDailyReports(true);
        count = res.count ?? 0;
      } catch {
        count = await archiveAllActiveAbsences();
      }

      alert(`Successfully archived ${count} active report(s). The supervisor live dashboard is now reset for today, and records are safely preserved in the archive.`);
      await loadArchivedData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to archive reports';
      alert(`Error during archiving: ${msg}`);
    } finally {
      setArchivingNow(false);
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalDivision = cDivision === '__NEW__' ? cCustomDivision.trim() : cDivision.trim();
    if (!finalDivision) {
      alert('Please enter or select a division.');
      return;
    }
    if (!cName.trim() || !cSection.trim()) {
      alert('Please enter class name and section.');
      return;
    }

    setCSubmitting(true);
    try {
      const res = await addClass({
        division: finalDivision,
        name: cName.trim(),
        section: cSection.trim(),
      });
      alert(res.message || 'Class added successfully.');
      if (res.classes) {
        setClasses(res.classes);
      } else {
        await loadClassesData();
      }
      setShowAddClassModal(false);
      setCName('');
      setCSection('');
      setCCustomDivision('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add class';
      alert(msg);
    } finally {
      setCSubmitting(false);
    }
  };

  const handleDeleteClass = async (classItem: ClassInfo) => {
    if (
      !confirm(
        `Are you sure you want to delete class "${classItem.name} (${classItem.section})" from ${classItem.division}?`
      )
    ) {
      return;
    }

    try {
      if (classItem.id) {
        const res = await deleteClass(classItem.id);
        if (res.classes) {
          setClasses(res.classes);
        } else {
          await loadClassesData();
        }
        alert(res.message || 'Class removed successfully.');
      } else {
        setClasses((prev) => prev.filter((c) => c !== classItem));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete class';
      alert(msg);
    }
  };

  const getDivisionBadgeColor = (div: string) => {
    const d = (div || '').toLowerCase();
    if (d.includes('secondary')) {
      return { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' };
    }
    if (d.includes('elementary')) {
      return { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' };
    }
    if (d.includes('middle')) {
      return { bg: '#fffbeb', text: '#b45309', border: '#fde68a' };
    }
    if (d.includes('technical')) {
      return { bg: '#fdf2f8', text: '#be185d', border: '#fbcfe8' };
    }
    return { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' };
  };

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  const handleAddPrincipal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pEmail || !pPassword) return;
    if (pPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    const divisions = pDivisions
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    setPSubmitting(true);
    try {
      await createManagedUser(pEmail, pPassword, 'principals', {
        email: pEmail,
        divisions,
      });
      alert(`SUCCESS!\nPrincipal ${pEmail} has been created successfully.`);
      setShowAddPrincipalModal(false);
      setPEmail('');
      setPPassword('');
      setPDivisions('');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to create principal';
      alert(`Error creating principal: ${msg}`);
    } finally {
      setPSubmitting(false);
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tEmail || !tPassword) return;
    if (tPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    setTSubmitting(true);
    try {
      await createManagedUser(tEmail, tPassword, 'teachers', {
        email: tEmail,
      });
      alert(`SUCCESS!\nTeacher ${tEmail} has been created successfully.`);
      setShowAddTeacherModal(false);
      setTEmail('');
      setTPassword('');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to create teacher';
      alert(`Error creating teacher: ${msg}`);
    } finally {
      setTSubmitting(false);
    }
  };

  const openEditDivisions = (principal: Principal) => {
    setEditingPrincipal(principal);
    setEditDivisionsStr(principal.divisions.join(', '));
  };

  const handleSaveDivisions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrincipal) return;

    const newDivisions = editDivisionsStr
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    setEditSubmitting(true);
    try {
      await updatePrincipalDivisions(editingPrincipal.id, newDivisions);
      alert("Principal's divisions updated successfully.");
      setEditingPrincipal(null);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to update';
      alert(`Error updating divisions: ${msg}`);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!confirm(`Are you sure you want to send a password reset email to ${email}?`)) return;
    try {
      await sendPasswordReset(email);
      alert(`A password reset email has been sent successfully to ${email}.`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to send reset email';
      alert(`Error: ${msg}`);
    }
  };

  const handleDeleteUser = async (collectionName: 'principals' | 'teachers', docId: string, email: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ${email}'s role? This is NOT reversible.\n\nNote: You should also delete their login account in Firebase Authentication if needed.`
      )
    ) {
      return;
    }

    try {
      await deleteUserDoc(collectionName, docId);
      alert('User role deleted from the database successfully.');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to delete';
      alert(`Error deleting user: ${msg}`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="header" style={{ backgroundColor: '#22c55e' }}>
        <div className="header-title">
          <i className="fas fa-user-shield"></i> Admin Dashboard
        </div>
        <button onClick={handleLogout} className="btn-logout" aria-label="Logout">
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </header>

      <main className="container" style={{ margin: '24px auto' }}>
        {loading ? (
          <LoadingSpinner message="Loading dashboard users..." />
        ) : (
          <div className="dashboard" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
            {/* ========================================================= */}
            {/* EXECUTIVE ATTENDANCE ANALYTICS & STATISTICAL INTELLIGENCE */}
            {/* ========================================================= */}
            <div
              className="management-card"
              style={{
                gridColumn: '1 / -1',
                padding: '24px',
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
              }}
            >
              {/* Analytics Header & Control Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  borderBottom: '1px solid #e5e7eb',
                  paddingBottom: '18px',
                }}
              >
                <div>
                  <h2
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      margin: 0,
                      fontSize: '1.35rem',
                      fontWeight: 700,
                      color: '#0f172a',
                    }}
                  >
                    <i className="fas fa-chart-line" style={{ color: '#2563eb' }}></i>
                    School Attendance Analytics & Statistical Intelligence
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '12px',
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                      }}
                    >
                      Live Realtime
                    </span>
                  </h2>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>
                    Executive overview of student attendance rates, unexcused vs excused metrics, division comparisons, and at-risk monitoring.
                  </span>
                </div>

                {/* Timeframe & Division Filters */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Timeframe Pills */}
                  <div
                    style={{
                      display: 'flex',
                      backgroundColor: '#f1f5f9',
                      padding: '3px',
                      borderRadius: '8px',
                      gap: '2px',
                    }}
                  >
                    {(
                      [
                        { id: 'all', label: 'All Time' },
                        { id: 'today', label: 'Today' },
                        { id: 'week', label: 'Last 7 Days' },
                        { id: 'month', label: 'This Month' },
                      ] as const
                    ).map((t) => {
                      const isActive = statsTimeframe === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setStatsTimeframe(t.id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            backgroundColor: isActive ? '#ffffff' : 'transparent',
                            color: isActive ? '#0f172a' : '#64748b',
                            boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Division Select */}
                  <select
                    value={statsDivision}
                    onChange={(e) => setStatsDivision(e.target.value)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#1e293b',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="All">All Divisions</option>
                    {availableDivisions.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={loadArchivedData}
                    disabled={loadingArchive}
                    title="Reload attendance data"
                    style={{
                      backgroundColor: '#f8fafc',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <i className={`fas fa-sync-alt ${loadingArchive ? 'fa-spin' : ''}`} style={{ color: '#2563eb' }}></i>
                    Sync
                  </button>
                </div>
              </div>

              {/* Top 4 Primary KPI Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                  marginTop: '20px',
                  marginBottom: '20px',
                }}
              >
                {/* Metric 1: Total Incidents */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>
                        Total Absences & Tardiness
                      </span>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
                        {statsMetrics.totalStudentIncidents}
                      </div>
                    </div>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        backgroundColor: '#e0f2fe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0284c7',
                        fontSize: '16px',
                      }}
                    >
                      <i className="fas fa-users-slash"></i>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Reports: <b>{statsMetrics.totalReports}</b></span>
                    <span style={{ color: '#0284c7', fontWeight: 600 }}>Active Today: {statsMetrics.activeTodayCount}</span>
                  </div>
                </div>

                {/* Metric 2: Unexcused Absences */}
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '10px',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#991b1b' }}>
                        Unexcused Absences
                      </span>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#dc2626', margin: '4px 0' }}>
                        {statsMetrics.unexcusedCount}
                      </div>
                    </div>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        backgroundColor: '#fee2e2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#dc2626',
                        fontSize: '16px',
                      }}
                    >
                      <i className="fas fa-exclamation-triangle"></i>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: '6px', fontWeight: 600 }}>
                    {statsMetrics.unexcusedPct}% of total incidents (Needs follow-up)
                  </div>
                </div>

                {/* Metric 3: Excused Absences */}
                <div
                  style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#166534' }}>
                        Excused Absences
                      </span>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#16a34a', margin: '4px 0' }}>
                        {statsMetrics.excusedCount}
                      </div>
                    </div>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        backgroundColor: '#dcfce7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#16a34a',
                        fontSize: '16px',
                      }}
                    >
                      <i className="fas fa-check-circle"></i>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#15803d', marginTop: '6px', fontWeight: 600 }}>
                    {statsMetrics.excusedPct}% documented / authorized
                  </div>
                </div>

                {/* Metric 4: Late Arrivals */}
                <div
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '10px',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#92400e' }}>
                        Late Arrivals (Tardy)
                      </span>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#d97706', margin: '4px 0' }}>
                        {statsMetrics.lateCount}
                      </div>
                    </div>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        backgroundColor: '#fef3c7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#d97706',
                        fontSize: '16px',
                      }}
                    >
                      <i className="fas fa-clock"></i>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#b45309', marginTop: '6px', fontWeight: 600 }}>
                    {statsMetrics.latePct}% punctuality incidents
                  </div>
                </div>
              </div>

              {/* Multi-Color Segmented Proportion Bar */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px 20px',
                  marginBottom: '22px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                    Incident Distribution Ratio
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {statsMetrics.totalStudentIncidents} Total Records
                  </span>
                </div>

                {/* The Bar */}
                <div
                  style={{
                    display: 'flex',
                    height: '14px',
                    borderRadius: '7px',
                    overflow: 'hidden',
                    backgroundColor: '#e2e8f0',
                  }}
                >
                  {statsMetrics.totalStudentIncidents > 0 ? (
                    <>
                      <div
                        style={{
                          width: `${statsMetrics.unexcusedPct}%`,
                          backgroundColor: '#ef4444',
                          transition: 'width 0.3s ease',
                        }}
                        title={`Unexcused: ${statsMetrics.unexcusedCount} (${statsMetrics.unexcusedPct}%)`}
                      />
                      <div
                        style={{
                          width: `${statsMetrics.latePct}%`,
                          backgroundColor: '#f59e0b',
                          transition: 'width 0.3s ease',
                        }}
                        title={`Late: ${statsMetrics.lateCount} (${statsMetrics.latePct}%)`}
                      />
                      <div
                        style={{
                          width: `${statsMetrics.excusedPct}%`,
                          backgroundColor: '#10b981',
                          transition: 'width 0.3s ease',
                        }}
                        title={`Excused: ${statsMetrics.excusedCount} (${statsMetrics.excusedPct}%)`}
                      />
                    </>
                  ) : (
                    <div style={{ width: '100%', backgroundColor: '#cbd5e1' }} />
                  )}
                </div>

                {/* Legends */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    gap: '20px',
                    marginTop: '10px',
                    flexWrap: 'wrap',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                    <span style={{ color: '#475569' }}>
                      Unexcused: <b>{statsMetrics.unexcusedCount}</b> ({statsMetrics.unexcusedPct}%)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                    <span style={{ color: '#475569' }}>
                      Late: <b>{statsMetrics.lateCount}</b> ({statsMetrics.latePct}%)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                    <span style={{ color: '#475569' }}>
                      Excused: <b>{statsMetrics.excusedCount}</b> ({statsMetrics.excusedPct}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-Tabs for In-Depth Analytics */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  borderBottom: '2px solid #e2e8f0',
                  paddingBottom: '0',
                  marginBottom: '18px',
                  overflowX: 'auto',
                }}
              >
                {(
                  [
                    { id: 'divisions', label: 'Divisions Breakdown', icon: 'fa-sitemap' },
                    { id: 'classes', label: 'Top Affected Classes', icon: 'fa-trophy' },
                    { id: 'students', label: 'At-Risk Watchlist', icon: 'fa-user-clock' },
                    { id: 'sessions', label: 'Hourly Period Trends', icon: 'fa-history' },
                    { id: 'subjects', label: 'Subjects & Reasons', icon: 'fa-book-open' },
                  ] as const
                ).map((tab) => {
                  const isActive = statsActiveTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatsActiveTab(tab.id)}
                      style={{
                        padding: '10px 16px',
                        border: 'none',
                        borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
                        backgroundColor: 'transparent',
                        color: isActive ? '#2563eb' : '#64748b',
                        fontWeight: isActive ? 700 : 600,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <i className={`fas ${tab.icon}`}></i>
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: Divisions Breakdown */}
              {statsActiveTab === 'divisions' && (
                <div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '14px',
                    }}
                  >
                    {divisionBreakdown.map((div) => {
                      const badge = getDivisionBadgeColor(div.division);
                      return (
                        <div
                          key={div.division}
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '16px',
                            backgroundColor: '#ffffff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                padding: '3px 10px',
                                borderRadius: '4px',
                                backgroundColor: badge.bg,
                                color: badge.text,
                                border: `1px solid ${badge.border}`,
                                textTransform: 'uppercase',
                              }}
                            >
                              {div.division}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                              {div.students} Incidents ({div.percentage}%)
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
                            <div
                              style={{
                                width: `${div.percentage}%`,
                                height: '100%',
                                backgroundColor: badge.text,
                                borderRadius: '4px',
                              }}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center', fontSize: '11px' }}>
                            <div style={{ background: '#fef2f2', padding: '6px', borderRadius: '6px' }}>
                              <span style={{ color: '#dc2626', fontWeight: 700, display: 'block', fontSize: '13px' }}>{div.unexcused}</span>
                              <span style={{ color: '#991b1b' }}>Unexcused</span>
                            </div>
                            <div style={{ background: '#fffbeb', padding: '6px', borderRadius: '6px' }}>
                              <span style={{ color: '#d97706', fontWeight: 700, display: 'block', fontSize: '13px' }}>{div.late}</span>
                              <span style={{ color: '#92400e' }}>Late</span>
                            </div>
                            <div style={{ background: '#f0fdf4', padding: '6px', borderRadius: '6px' }}>
                              <span style={{ color: '#16a34a', fontWeight: 700, display: 'block', fontSize: '13px' }}>{div.excused}</span>
                              <span style={{ color: '#166534' }}>Excused</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: Top Affected Classes Leaderboard */}
              {statsActiveTab === 'classes' && (
                <div>
                  {topAffectedClasses.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                      No class attendance incidents recorded for this timeframe.
                    </div>
                  ) : (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                            <th style={{ padding: '10px 14px', width: '60px' }}>Rank</th>
                            <th style={{ padding: '10px 14px' }}>Class & Section</th>
                            <th style={{ padding: '10px 14px' }}>Division</th>
                            <th style={{ padding: '10px 14px' }}>Total Absences</th>
                            <th style={{ padding: '10px 14px' }}>Unexcused</th>
                            <th style={{ padding: '10px 14px' }}>Late</th>
                            <th style={{ padding: '10px 14px' }}>Excused</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topAffectedClasses.map((item, idx) => {
                            const badge = getDivisionBadgeColor(item.division);
                            const rankIcons = ['🥇 #1', '🥈 #2', '🥉 #3'];
                            const rankDisplay = rankIcons[idx] || `#${idx + 1}`;
                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fbfcfe' }}>
                                <td style={{ padding: '10px 14px', fontWeight: 700, color: idx < 3 ? '#b45309' : '#64748b' }}>
                                  {rankDisplay}
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <strong style={{ color: '#1e293b' }}>{item.className}</strong>
                                  <span style={{ color: '#64748b', marginLeft: '6px' }}>({item.section})</span>
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      backgroundColor: badge.bg,
                                      color: badge.text,
                                      border: `1px solid ${badge.border}`,
                                    }}
                                  >
                                    {item.division}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <span style={{ fontWeight: 800, color: '#dc2626', fontSize: '14px' }}>
                                    {item.totalAbsences}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 14px', color: '#dc2626', fontWeight: 600 }}>{item.unexcused}</td>
                                <td style={{ padding: '10px 14px', color: '#d97706', fontWeight: 600 }}>{item.late}</td>
                                <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: 600 }}>{item.excused}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: At-Risk Repeat Absentees Watchlist */}
              {statsActiveTab === 'students' && (
                <div>
                  {repeatAbsenteeStudents.length === 0 ? (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                      No repeat absentee records identified in this timeframe.
                    </div>
                  ) : (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                            <th style={{ padding: '10px 14px' }}>Student Name</th>
                            <th style={{ padding: '10px 14px' }}>Severity Alert</th>
                            <th style={{ padding: '10px 14px' }}>Total Incidents</th>
                            <th style={{ padding: '10px 14px' }}>Class / Division</th>
                            <th style={{ padding: '10px 14px' }}>Status Breakdown</th>
                            <th style={{ padding: '10px 14px' }}>Primary Reasons</th>
                            <th style={{ padding: '10px 14px' }}>Last Recorded</th>
                          </tr>
                        </thead>
                        <tbody>
                          {repeatAbsenteeStudents.map((st, sIdx) => {
                            const isHigh = st.total >= 3;
                            const isMed = st.total === 2;
                            return (
                              <tr key={sIdx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isHigh ? '#fff1f2' : isMed ? '#fffbeb' : '#ffffff' }}>
                                <td style={{ padding: '10px 14px' }}>
                                  <strong style={{ color: '#0f172a' }}>{st.name}</strong>
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  {isHigh ? (
                                    <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                                      🚨 High Alert
                                    </span>
                                  ) : isMed ? (
                                    <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
                                      ⚠️ Watchlist
                                    </span>
                                  ) : (
                                    <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                                      ℹ️ Monitored
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <span style={{ fontSize: '14px', fontWeight: 800, color: isHigh ? '#dc2626' : '#1e293b' }}>
                                    {st.total} {st.total === 1 ? 'time' : 'times'}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <div style={{ color: '#334155', fontWeight: 600 }}>{Array.from(st.classes).join(', ') || 'N/A'}</div>
                                  <div style={{ fontSize: '11px', color: '#64748b' }}>{Array.from(st.divisions).join(', ')}</div>
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                  <span style={{ color: '#dc2626', fontWeight: 600 }}>{st.unexcused} Unex</span>,{' '}
                                  <span style={{ color: '#d97706', fontWeight: 600 }}>{st.late} Late</span>,{' '}
                                  <span style={{ color: '#16a34a', fontWeight: 600 }}>{st.excused} Exc</span>
                                </td>
                                <td style={{ padding: '10px 14px', color: '#475569', fontSize: '12px' }}>
                                  {st.reasons.size > 0 ? Array.from(st.reasons).join('; ') : 'No reason recorded'}
                                </td>
                                <td style={{ padding: '10px 14px', fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                                  {st.lastSeen.toLocaleDateString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: Hourly Period / Session Trends */}
              {statsActiveTab === 'sessions' && (
                <div>
                  <div
                    style={{
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <i className="fas fa-info-circle" style={{ color: '#2563eb', fontSize: '18px' }}></i>
                    <span style={{ fontSize: '13px', color: '#1e40af' }}>
                      <b>Peak Absenteeism Trend:</b> Period <b>{sessionPeriodStats.peakSession}</b> has the highest concentration of absences ({sessionPeriodStats.peakCount} incidents). Morning session tardiness is typical of school arrival delays.
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '12px',
                    }}
                  >
                    {sessionPeriodStats.list.map((sess) => {
                      const isPeak = sess.session === sessionPeriodStats.peakSession && sess.count > 0;
                      return (
                        <div
                          key={sess.session}
                          style={{
                            border: '1px solid',
                            borderColor: isPeak ? '#f87171' : '#e2e8f0',
                            backgroundColor: isPeak ? '#fff1f2' : '#ffffff',
                            borderRadius: '10px',
                            padding: '14px',
                            textAlign: 'center',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                          }}
                        >
                          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                            Period {sess.session}
                          </div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: isPeak ? '#dc2626' : '#0f172a' }}>
                            {sess.count}
                          </div>
                          <div style={{ fontSize: '11px', color: isPeak ? '#991b1b' : '#64748b', marginTop: '4px' }}>
                            {sess.percentage}% of total
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 5: Subjects & Reasons */}
              {statsActiveTab === 'subjects' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
                  {/* Subjects Card */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', backgroundColor: '#ffffff' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fas fa-book" style={{ color: '#2563eb' }}></i> Top Reported Subjects
                    </h3>
                    {subjectReportingStats.length === 0 ? (
                      <div style={{ color: '#64748b', fontSize: '13px' }}>No subject data recorded.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {subjectReportingStats.map((sub, sIdx) => (
                          <div key={sIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px' }}>
                            <span style={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>{sub.subject}</span>
                            <span style={{ fontWeight: 700, color: '#2563eb', fontSize: '13px' }}>{sub.count} reports</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Reasons Card */}
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', backgroundColor: '#ffffff' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fas fa-comment-medical" style={{ color: '#10b981' }}></i> Common Absence Reasons
                    </h3>
                    {commonReasonsStats.length === 0 ? (
                      <div style={{ color: '#64748b', fontSize: '13px' }}>No reason notes provided.</div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {commonReasonsStats.map((r, rIdx) => (
                          <span
                            key={rIdx}
                            style={{
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              padding: '5px 10px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 500,
                            }}
                          >
                            {r.reason}: <b>{r.count}</b>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Manage Principals */}
            <div className="management-card">
              <div className="card-header">
                <h2>Manage Principals</h2>
                <button
                  className="btn-add"
                  onClick={() => setShowAddPrincipalModal(true)}
                  aria-label="Add new principal"
                >
                  <i className="fas fa-plus"></i> Add Principal
                </button>
              </div>

              <ul className="user-list">
                {principals.length === 0 ? (
                  <li className="empty-state" style={{ padding: '24px' }}>
                    No principals found.
                  </li>
                ) : (
                  principals.map((p) => (
                    <li key={p.id} className="user-item">
                      <div className="user-details">
                        <span className="user-email">{p.email}</span>
                        <span className="user-divisions">
                          Divisions: {p.divisions.length > 0 ? p.divisions.join(', ') : 'None'}
                        </span>
                      </div>
                      <div className="user-actions">
                        <button
                          title="Edit Divisions"
                          className="btn-edit"
                          onClick={() => openEditDivisions(p)}
                        >
                          <i className="fas fa-pencil-alt"></i>
                        </button>
                        <button
                          title="Send Password Reset"
                          className="btn-reset-pass"
                          onClick={() => handleResetPassword(p.email)}
                        >
                          <i className="fas fa-key"></i>
                        </button>
                        <button
                          title="Delete User"
                          className="btn-delete"
                          onClick={() => handleDeleteUser('principals', p.id, p.email)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Manage Teachers */}
            <div className="management-card">
              <div className="card-header">
                <h2>Manage Teachers</h2>
                <button
                  className="btn-add"
                  onClick={() => setShowAddTeacherModal(true)}
                  aria-label="Add new teacher"
                >
                  <i className="fas fa-plus"></i> Add Teacher
                </button>
              </div>

              <ul className="user-list">
                {teachers.length === 0 ? (
                  <li className="empty-state" style={{ padding: '24px' }}>
                    No teachers found.
                  </li>
                ) : (
                  teachers.map((t) => (
                    <li key={t.id} className="user-item">
                      <div className="user-details">
                        <span className="user-email">{t.email}</span>
                      </div>
                      <div className="user-actions">
                        <button
                          title="Send Password Reset"
                          className="btn-reset-pass"
                          onClick={() => handleResetPassword(t.email)}
                        >
                          <i className="fas fa-key"></i>
                        </button>
                        <button
                          title="Delete User"
                          className="btn-delete"
                          onClick={() => handleDeleteUser('teachers', t.id, t.email)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Manage Classes, Divisions & Sections */}
            <div className="management-card" style={{ gridColumn: '1 / -1', padding: '24px' }}>
              <div
                className="card-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px',
                  borderBottom: '1px solid #e5e7eb',
                  paddingBottom: '16px',
                }}
              >
                <div>
                  <h2
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      margin: 0,
                      fontSize: '1.25rem',
                      color: '#1e293b',
                    }}
                  >
                    <i className="fas fa-layer-group" style={{ color: '#22c55e' }}></i> Manage Classes, Divisions & Sections
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background: '#dcfce7',
                        color: '#15803d',
                      }}
                    >
                      {classes.length} classes
                    </span>
                  </h2>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>
                    Configure school curriculum structure: divisions, classes, and sections.
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={handleSyncClasses}
                    disabled={syncingClasses || loadingClasses}
                    title="Fetch and synchronize all classes directly from the school database"
                    style={{
                      backgroundColor: '#f8fafc',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <i className={`fas fa-sync-alt ${syncingClasses ? 'fa-spin' : ''}`} style={{ color: '#2563eb' }}></i>
                    {syncingClasses ? 'Syncing...' : 'Sync Database'}
                  </button>
                  <button
                    type="button"
                    className="btn-add"
                    onClick={() => setShowAddClassModal(true)}
                    aria-label="Add new class or section"
                    style={{
                      backgroundColor: '#22c55e',
                      color: 'white',
                      border: 'none',
                      padding: '10px 18px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                    }}
                  >
                    <i className="fas fa-plus"></i> Add Class / Section
                  </button>
                </div>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginTop: '18px',
                  marginBottom: '16px',
                }}
              >
                {/* Division Tabs */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedDivisionFilter('All')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: selectedDivisionFilter === 'All' ? '#22c55e' : '#e2e8f0',
                      backgroundColor: selectedDivisionFilter === 'All' ? '#22c55e' : '#ffffff',
                      color: selectedDivisionFilter === 'All' ? '#ffffff' : '#475569',
                      transition: 'all 0.2s',
                    }}
                  >
                    All ({classes.length})
                  </button>
                  {availableDivisions.map((div) => {
                    const count = classes.filter(
                      (c) => c.division.toLowerCase() === div.toLowerCase()
                    ).length;
                    const isSelected = selectedDivisionFilter.toLowerCase() === div.toLowerCase();
                    return (
                      <button
                        key={div}
                        type="button"
                        onClick={() => setSelectedDivisionFilter(div)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: '1px solid',
                          borderColor: isSelected ? '#22c55e' : '#e2e8f0',
                          backgroundColor: isSelected ? '#22c55e' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#475569',
                          transition: 'all 0.2s',
                        }}
                      >
                        {div} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Quick Search */}
                <div style={{ position: 'relative', minWidth: '220px' }}>
                  <input
                    type="text"
                    placeholder="Search class or section..."
                    value={classSearch}
                    onChange={(e) => setClassSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 32px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      outline: 'none',
                    }}
                  />
                  <i
                    className="fas fa-search"
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                      fontSize: '12px',
                    }}
                  ></i>
                </div>
              </div>

              {/* Class Cards Grid */}
              {loadingClasses ? (
                <div style={{ padding: '30px', textAlign: 'center' }}>
                  <LoadingSpinner message="Loading classes..." />
                </div>
              ) : filteredClasses.length === 0 ? (
                <div
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  <p style={{ color: '#64748b', margin: '0 0 10px', fontSize: '14px' }}>
                    No classes found matching your filter.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddClassModal(true)}
                    style={{
                      padding: '6px 14px',
                      fontSize: '13px',
                      background: '#22c55e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    + Add New Class
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: '12px',
                    maxHeight: '440px',
                    overflowY: 'auto',
                    paddingRight: '4px',
                  }}
                >
                  {filteredClasses.map((cls, idx) => {
                    const badge = getDivisionBadgeColor(cls.division);
                    return (
                      <div
                        key={cls.id || idx}
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          padding: '12px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'box-shadow 0.2s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            overflow: 'hidden',
                          }}
                        >
                          <span
                            style={{
                              alignSelf: 'flex-start',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.border}`,
                              textTransform: 'uppercase',
                              letterSpacing: '0.4px',
                            }}
                          >
                            {cls.division}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                            {cls.name}
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            Section: <b style={{ color: '#334155' }}>{cls.section}</b>
                          </span>
                        </div>
                        <button
                          type="button"
                          title="Delete class"
                          onClick={() => handleDeleteClass(cls)}
                          style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fca5a5',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            transition: 'background-color 0.2s',
                          }}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Archived Attendance Reports & Export Center */}
            <div className="management-card" style={{ gridColumn: '1 / -1', padding: '24px' }}>
              <div
                className="card-header"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px',
                  borderBottom: '1px solid #e5e7eb',
                  paddingBottom: '16px',
                }}
              >
                <div>
                  <h2
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      margin: 0,
                      fontSize: '1.25rem',
                      color: '#1e293b',
                    }}
                  >
                    <i className="fas fa-archive" style={{ color: '#0ea5e9' }}></i> Archived Attendance Reports & Export Center
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        background: '#e0f2fe',
                        color: '#0369a1',
                      }}
                    >
                      {filteredArchivedReports.length} Reports ({totalStudentsInArchive} Absences)
                    </span>
                  </h2>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>
                    Historical daily attendance records automatically archived at midnight. Filter, inspect, and export to CSV/Excel or PDF.
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleManualArchiveActive}
                    disabled={archivingNow}
                    title="Move current active reports into archive now and reset supervisor dashboard"
                    style={{
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fde68a',
                      padding: '9px 15px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                    }}
                  >
                    <i className={`fas fa-box-archive ${archivingNow ? 'fa-spin' : ''}`}></i>
                    {archivingNow ? 'Archiving...' : 'Archive Active Now'}
                  </button>

                  <button
                    type="button"
                    onClick={loadArchivedData}
                    disabled={loadingArchive}
                    title="Reload archived records"
                    style={{
                      backgroundColor: '#f8fafc',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      padding: '9px 14px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                    }}
                  >
                    <i className={`fas fa-sync-alt ${loadingArchive ? 'fa-spin' : ''}`}></i>
                    Refresh
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintArchived}
                    disabled={filteredArchivedReports.length === 0}
                    title="Open printable summary / export to PDF"
                    style={{
                      backgroundColor: '#ffffff',
                      color: '#1e293b',
                      border: '1px solid #cbd5e1',
                      padding: '9px 15px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: filteredArchivedReports.length === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                    }}
                  >
                    <i className="fas fa-print" style={{ color: '#64748b' }}></i>
                    Print / PDF
                  </button>

                  <button
                    type="button"
                    onClick={handleExportArchivedCSV}
                    disabled={filteredArchivedReports.length === 0}
                    title="Download filtered archived reports as CSV compatible with Excel"
                    style={{
                      backgroundColor: '#22c55e',
                      color: '#ffffff',
                      border: 'none',
                      padding: '9px 16px',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: filteredArchivedReports.length === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                    }}
                  >
                    <i className="fas fa-file-excel"></i>
                    Export CSV / Excel
                  </button>
                </div>
              </div>

              {/* Filter Controls Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginTop: '16px',
                  marginBottom: '16px',
                }}
              >
                {/* Division Tabs */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setArchiveDivisionFilter('All')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: archiveDivisionFilter === 'All' ? '#0ea5e9' : '#e2e8f0',
                      backgroundColor: archiveDivisionFilter === 'All' ? '#0ea5e9' : '#ffffff',
                      color: archiveDivisionFilter === 'All' ? '#ffffff' : '#475569',
                      transition: 'all 0.2s',
                    }}
                  >
                    All Divisions ({archivedReports.length})
                  </button>
                  {availableDivisions.map((div) => {
                    const count = archivedReports.filter(
                      (r) => (r.division || '').toLowerCase() === div.toLowerCase()
                    ).length;
                    const isSelected = archiveDivisionFilter.toLowerCase() === div.toLowerCase();
                    return (
                      <button
                        key={div}
                        type="button"
                        onClick={() => setArchiveDivisionFilter(div)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: '1px solid',
                          borderColor: isSelected ? '#0ea5e9' : '#e2e8f0',
                          backgroundColor: isSelected ? '#0ea5e9' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#475569',
                          transition: 'all 0.2s',
                        }}
                      >
                        {div} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Date Picker & Search Filter */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                      Date:
                    </label>
                    <input
                      type="date"
                      value={archiveDateFilter}
                      onChange={(e) => setArchiveDateFilter(e.target.value)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12px',
                        outline: 'none',
                        color: '#1e293b',
                      }}
                    />
                    {archiveDateFilter && (
                      <button
                        type="button"
                        onClick={() => setArchiveDateFilter('')}
                        title="Clear date filter"
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          color: '#475569',
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div style={{ position: 'relative' }}>
                    <i
                      className="fas fa-search"
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#94a3b8',
                        fontSize: '12px',
                      }}
                    ></i>
                    <input
                      type="text"
                      placeholder="Search student, teacher, class..."
                      value={archiveSearch}
                      onChange={(e) => setArchiveSearch(e.target.value)}
                      style={{
                        padding: '7px 12px 7px 32px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '12px',
                        width: '220px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Archived Reports Table / Content */}
              {loadingArchive ? (
                <div style={{ padding: '30px', textAlign: 'center' }}>
                  <LoadingSpinner message="Loading archived attendance records..." />
                </div>
              ) : filteredArchivedReports.length === 0 ? (
                <div
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  <i
                    className="fas fa-box-open"
                    style={{ fontSize: '32px', color: '#94a3b8', marginBottom: '10px', display: 'block' }}
                  ></i>
                  <p style={{ color: '#64748b', margin: '0 0 10px', fontSize: '14px', fontWeight: 500 }}>
                    {archivedReports.length === 0
                      ? 'No historical reports have been archived yet.'
                      : 'No archived reports match your current filter criteria.'}
                  </p>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Reports are archived automatically every day at midnight (00:00) or by clicking &quot;Archive Active Now&quot;.
                  </span>
                </div>
              ) : (
                <div
                  style={{
                    maxHeight: '520px',
                    overflowY: 'auto',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                >
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '13px',
                      textAlign: 'left',
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor: '#f8fafc',
                          borderBottom: '1px solid #e2e8f0',
                          color: '#475569',
                          fontWeight: 600,
                        }}
                      >
                        <th style={{ padding: '12px 14px' }}>Date & Time</th>
                        <th style={{ padding: '12px 14px' }}>Division</th>
                        <th style={{ padding: '12px 14px' }}>Class / Sec</th>
                        <th style={{ padding: '12px 14px' }}>Session</th>
                        <th style={{ padding: '12px 14px' }}>Teacher & Subject</th>
                        <th style={{ padding: '12px 14px' }}>Absentees</th>
                        <th style={{ padding: '12px 14px', textAlign: 'center' }}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredArchivedReports.map((report) => {
                        const isExpanded = expandedArchiveId === report.id;
                        const badge = getDivisionBadgeColor(report.division);
                        const studentsCount = report.students?.length || 1;

                        return (
                          <React.Fragment key={report.id}>
                            <tr
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                                backgroundColor: isExpanded ? '#f0fdf4' : '#ffffff',
                                transition: 'background-color 0.15s',
                              }}
                            >
                              <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                <div style={{ fontWeight: 600, color: '#1e293b' }}>
                                  {report.timestamp.toLocaleDateString()}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                  {report.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: badge.bg,
                                    color: badge.text,
                                    border: `1px solid ${badge.border}`,
                                    textTransform: 'uppercase',
                                    display: 'inline-block',
                                  }}
                                >
                                  {report.division}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                <strong style={{ color: '#1e293b' }}>{report.class}</strong>
                                <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '6px' }}>
                                  Sec {report.section}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                <span
                                  style={{
                                    background: '#f1f5f9',
                                    color: '#334155',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    fontSize: '12px',
                                  }}
                                >
                                  Period {report.session}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ fontWeight: 600, color: '#1e293b' }}>
                                  {report.teacherName}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                  {report.subject}
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span
                                    style={{
                                      backgroundColor: '#fee2e2',
                                      color: '#b91c1c',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      fontWeight: 700,
                                      fontSize: '12px',
                                    }}
                                  >
                                    {studentsCount} {studentsCount === 1 ? 'student' : 'students'}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '12px',
                                      color: '#475569',
                                      maxWidth: '220px',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {report.students && report.students.length > 0
                                      ? report.students.map((s) => s.name).join(', ')
                                      : report.absentees}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => setExpandedArchiveId(isExpanded ? null : report.id)}
                                  style={{
                                    background: isExpanded ? '#22c55e' : '#f1f5f9',
                                    color: isExpanded ? '#ffffff' : '#475569',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '5px 10px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {isExpanded ? 'Hide' : 'View'}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded Details Breakdown */}
                            {isExpanded && (
                              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <td colSpan={7} style={{ padding: '16px 20px' }}>
                                  <div
                                    style={{
                                      backgroundColor: '#ffffff',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: '8px',
                                      padding: '16px',
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '12px',
                                        borderBottom: '1px solid #f1f5f9',
                                        paddingBottom: '8px',
                                      }}
                                    >
                                      <strong style={{ fontSize: '13px', color: '#1e293b' }}>
                                        Absentee Details & Reasons
                                      </strong>
                                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                                        Archive ID: <code>{report.id}</code>
                                      </span>
                                    </div>

                                    {report.students && report.students.length > 0 ? (
                                      <div
                                        style={{
                                          display: 'grid',
                                          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                                          gap: '10px',
                                        }}
                                      >
                                        {report.students.map((student, sIdx) => {
                                          const stLower = (student.status || '').toLowerCase();
                                          const statusBg = stLower.includes('excused')
                                            ? '#dcfce7'
                                            : stLower.includes('late')
                                            ? '#fef3c7'
                                            : '#fee2e2';
                                          const statusColor = stLower.includes('excused')
                                            ? '#15803d'
                                            : stLower.includes('late')
                                            ? '#b45309'
                                            : '#b91c1c';

                                          return (
                                            <div
                                              key={sIdx}
                                              style={{
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '6px',
                                                padding: '10px 12px',
                                                backgroundColor: '#fbfcfe',
                                              }}
                                            >
                                              <div
                                                style={{
                                                  display: 'flex',
                                                  justifyContent: 'space-between',
                                                  alignItems: 'center',
                                                  marginBottom: '4px',
                                                }}
                                              >
                                                <strong style={{ fontSize: '13px', color: '#1e293b' }}>
                                                  {student.name}
                                                </strong>
                                                <span
                                                  style={{
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    backgroundColor: statusBg,
                                                    color: statusColor,
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                  }}
                                                >
                                                  {student.status}
                                                </span>
                                              </div>
                                              <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                Reason:{' '}
                                                <span style={{ color: '#334155' }}>
                                                  {student.reason || report.reason || 'None specified'}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div style={{ fontSize: '13px', color: '#475569' }}>
                                        <strong>Students:</strong> {report.absentees}
                                        {report.reason && (
                                          <div style={{ marginTop: '4px', color: '#64748b' }}>
                                            <strong>Reason:</strong> {report.reason}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add Principal Modal */}
      {showAddPrincipalModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              padding: '30px',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '440px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 20px', color: '#2c3e50' }}>Add New Principal</h3>
            <form onSubmit={handleAddPrincipal}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: 600 }}>
                  Principal Email:
                </label>
                <input
                  type="email"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="principal@rhhs.edu.lb"
                  value={pEmail}
                  onChange={(e) => setPEmail(e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: 600 }}>
                  Password (min 6 characters):
                </label>
                <input
                  type="password"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="Secure password"
                  value={pPassword}
                  onChange={(e) => setPPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: 600 }}>
                  Divisions (comma-separated):
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Kindergarten, Elementary, Middle School"
                  value={pDivisions}
                  onChange={(e) => setPDivisions(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ backgroundColor: '#e5e7eb', color: '#374151' }}
                  onClick={() => setShowAddPrincipalModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={pSubmitting}>
                  {pSubmitting ? 'Creating...' : 'Create Principal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Teacher Modal */}
      {showAddTeacherModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              padding: '30px',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '440px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 20px', color: '#2c3e50' }}>Add New Teacher</h3>
            <form onSubmit={handleAddTeacher}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: 600 }}>
                  Teacher Email:
                </label>
                <input
                  type="email"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="teacher@rhhs.edu.lb"
                  value={tEmail}
                  onChange={(e) => setTEmail(e.target.value)}
                  required
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: 600 }}>
                  Password (min 6 characters):
                </label>
                <input
                  type="password"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="Secure password"
                  value={tPassword}
                  onChange={(e) => setTPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ backgroundColor: '#e5e7eb', color: '#374151' }}
                  onClick={() => setShowAddTeacherModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={tSubmitting}>
                  {tSubmitting ? 'Creating...' : 'Create Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Principal Divisions Modal */}
      {editingPrincipal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              padding: '30px',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '440px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 10px', color: '#2c3e50' }}>Edit Divisions</h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6b7280' }}>
              Updating divisions for <b>{editingPrincipal.email}</b>
            </p>
            <form onSubmit={handleSaveDivisions}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: 600 }}>
                  Divisions (comma-separated):
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  value={editDivisionsStr}
                  onChange={(e) => setEditDivisionsStr(e.target.value)}
                  placeholder="e.g. Kindergarten, Elementary"
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ backgroundColor: '#e5e7eb', color: '#374151' }}
                  onClick={() => setEditingPrincipal(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={editSubmitting}>
                  {editSubmitting ? 'Saving...' : 'Save Divisions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {showAddClassModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              padding: '30px',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '460px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '1.25rem' }}>Add Class & Section</h3>
              <button
                type="button"
                onClick={() => setShowAddClassModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#9ca3af',
                }}
              >
                &times;
              </button>
            </div>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#6b7280' }}>
              Add a class and section to an existing division or specify a new division name.
            </p>
            <form onSubmit={handleAddClass}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: 600 }}>
                  Division:
                </label>
                <select
                  className="input"
                  style={{ width: '100%', marginBottom: cDivision === '__NEW__' ? '8px' : '0' }}
                  value={cDivision}
                  onChange={(e) => setCDivision(e.target.value)}
                >
                  {availableDivisions.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                  <option value="__NEW__">+ Create New Division...</option>
                </select>
                {cDivision === '__NEW__' && (
                  <input
                    type="text"
                    className="input"
                    style={{ width: '100%' }}
                    placeholder="Enter new division name (e.g. Preschool)"
                    value={cCustomDivision}
                    onChange={(e) => setCCustomDivision(e.target.value)}
                    required
                    autoFocus
                  />
                )}
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: 600 }}>
                  Class Name:
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="e.g. Grade 10, Grade 11, BT1"
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '6px', fontWeight: 600 }}>
                  Section / Track:
                </label>
                <input
                  type="text"
                  className="input"
                  style={{ width: '100%' }}
                  placeholder="e.g. A, B, Scientific, Humanities, Life Sciences"
                  value={cSection}
                  onChange={(e) => setCSection(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ backgroundColor: '#e5e7eb', color: '#374151' }}
                  onClick={() => setShowAddClassModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={cSubmitting}>
                  {cSubmitting ? 'Saving...' : 'Save Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
