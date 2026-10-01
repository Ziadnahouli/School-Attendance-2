'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/components/auth/AuthContext';
import { subscribeAbsences, clearAllAbsencesDirectly, archiveAllActiveAbsences } from '@/lib/firestore';
import { resetAllAbsences, resetTodayAbsences } from '@/lib/api';
import { AbsenceRecord, AggregatedAbsence } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import Footer from '@/components/layout/Footer';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function SupervisorDashboardPage() {
  return (
    <ProtectedRoute allowedRole="supervisor" loginPath="/supervisor/login">
      <SupervisorDashboardContent />
    </ProtectedRoute>
  );
}

function SupervisorDashboardContent() {
  const { divisions, logout } = useAuth();
  const router = useRouter();

  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportTimeframe, setReportTimeframe] = useState<'today' | 'all'>('today');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sortKey, setSortKey] = useState<string>('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Initialize theme
  useEffect(() => {
    const savedTheme = (typeof window !== 'undefined' && localStorage.getItem('theme')) as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'light';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem('theme', nextTheme);
    } catch {
      // ignore storage errors
    }
  };

  // Real-time Firestore subscription (defaults to today's active reports)
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeAbsences(
      divisions,
      (records) => {
        setAbsences(records);
        setLoading(false);
      },
      reportTimeframe === 'today'
    );

    return () => unsubscribe();
  }, [divisions, reportTimeframe]);

  const handleLogout = async () => {
    await logout();
    router.push('/supervisor/login');
  };

  // Archive today's absences with confirmation
  const handleArchiveToday = async () => {
    if (!confirm("Archive today's absence reports? They will be securely saved in the permanent archive and cleared from today's live feed.")) return;
    setLoading(true);
    try {
      const res = await resetTodayAbsences();
      alert(res.message || "Today's reports successfully archived.");
    } catch {
      try {
        const count = await archiveAllActiveAbsences();
        alert(`Direct fallback archived ${count} absence records into the historical database.`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Archive failed';
        alert('Failed to archive absences: ' + msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Export CSV with UTF-8 BOM
  const handleExportCSV = () => {
    if (absences.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = ['Date', 'Time', 'Teacher', 'Subject', 'Session', 'Division', 'Class', 'Section', 'Absentees'];
    const rows = absences.map((r) => [
      r.timestamp.toISOString().split('T')[0],
      r.timestamp.toLocaleTimeString(),
      r.teacherName,
      r.subject,
      r.session,
      r.division,
      r.class,
      r.section,
      r.absentees,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const str = String(cell ?? '').replace(/"/g, '""');
            return /[",\n]/.test(str) ? `"${str}"` : str;
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_reports_${reportTimeframe}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 0);
  };

  // Group by Class for Card View
  const aggregatedCards = useMemo(() => {
    const active = absences.filter((r) => (r.status || 'active') !== 'archived');
    const norm = (v: string) => String(v || '').trim().toLowerCase();
    const grouped = new Map<string, AggregatedAbsence>();

    active.forEach((r) => {
      const key = [norm(r.division), norm(r.class), norm(r.section)].join('||');
      const existing = grouped.get(key);

      const students =
        Array.isArray(r.students) && r.students.length > 0
          ? r.students
          : String(r.absentees || '')
              .split(',')
              .map((n) => ({
                name: n.trim(),
                status: r.attendanceStatus || 'Unexcused',
                reason: r.reason || '',
              }))
              .filter((s) => s.name);

      if (!existing) {
        const studentMap = new Map();
        students.forEach((s) => {
          const nm = norm(s.name);
          if (nm && !studentMap.has(nm)) {
            studentMap.set(nm, s);
          }
        });

        grouped.set(key, {
          division: r.division,
          class: r.class,
          section: r.section,
          teacherName: r.teacherName,
          subject: r.subject,
          session: r.session,
          students: Array.from(studentMap.values()),
          count: studentMap.size,
          timestamp: r.timestamp,
        });
      } else {
        if (r.timestamp > existing.timestamp) {
          existing.timestamp = r.timestamp;
        }
        const studentMap = new Map();
        existing.students.forEach((s) => studentMap.set(norm(s.name), s));
        students.forEach((s) => {
          const nm = norm(s.name);
          if (nm && !studentMap.has(nm)) {
            studentMap.set(nm, s);
          }
        });
        existing.students = Array.from(studentMap.values());
        existing.count = existing.students.length;
      }
    });

    return Array.from(grouped.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }, [absences]);

  // Sorted list for Table View
  const sortedTableReports = useMemo(() => {
    const active = absences.filter((r) => (r.status || 'active') !== 'archived');
    return active.slice().sort((a, b) => {
      let valA: unknown = a[sortKey as keyof AbsenceRecord];
      let valB: unknown = b[sortKey as keyof AbsenceRecord];

      if (sortKey === 'timestamp') {
        valA = a.timestamp.getTime();
        valB = b.timestamp.getTime();
      }

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === 'string') {
        const cmp = (valA as string).localeCompare(String(valB));
        return sortDir === 'asc' ? cmp : -cmp;
      }

      if (typeof valA === 'number') {
        return sortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
      }

      return 0;
    });
  }, [absences, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Modern Glass Header */}
      <header className="header" role="banner">
        <div className="header-title" aria-label="Supervisor Dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(2, 132, 199, 0.15)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
            <i className="fas fa-user-shield"></i>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Supervisor Dashboard
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Live Division Attendance Monitoring
            </div>
          </div>
        </div>
        <nav className="toolbar" aria-label="Header actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ThemeToggle />
          <button
            onClick={handleExportCSV}
            className="btn btn-primary"
            title="Export reports as CSV"
            aria-label="Export CSV"
            style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="fas fa-file-csv"></i>
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleLogout}
            className="btn-logout"
            title="Logout"
            aria-label="Logout"
          >
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main id="main" className="container" role="main" style={{ margin: '16px auto', padding: '0 16px' }}>
        {/* Division Scope Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '12px 18px',
            marginBottom: '16px',
            borderRadius: '10px',
            backgroundColor: 'var(--card-bg, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🏢</span>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
                Assigned Division Scope
              </div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                {divisions && divisions.length > 0 ? (
                  divisions.map((div) => (
                    <span
                      key={div}
                      className="badge"
                      style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                      }}
                    >
                      {div} Division
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0369a1' }}>All Divisions</span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #e2e8f0',
              }}
            >
              📅 Today: {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
              Showing <b>{absences.length}</b> {reportTimeframe === 'today' ? "today's" : 'active'} report{absences.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        <section className="content" aria-label="Data">
          <div className="action-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <h2 className="page-title" style={{ margin: 0 }}>Absence Reports</h2>
              
              {/* Daily Filter Toggle */}
              <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--card-bg, #f1f5f9)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)' }}>
                <button
                  type="button"
                  onClick={() => setReportTimeframe('today')}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: reportTimeframe === 'today' ? '#0284c7' : 'transparent',
                    color: reportTimeframe === 'today' ? '#ffffff' : 'var(--text-color, #475569)',
                    transition: 'all 0.2s',
                  }}
                >
                  <i className="fas fa-calendar-day" style={{ marginRight: '5px' }}></i> Today&apos;s Reports
                </button>
                <button
                  type="button"
                  onClick={() => setReportTimeframe('all')}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: reportTimeframe === 'all' ? '#0284c7' : 'transparent',
                    color: reportTimeframe === 'all' ? '#ffffff' : 'var(--text-color, #475569)',
                    transition: 'all 0.2s',
                  }}
                >
                  <i className="fas fa-history" style={{ marginRight: '5px' }}></i> All Active
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div className="view-toggle" role="tablist" aria-label="View selector">
                <button
                  id="viewCards"
                  className={viewMode === 'cards' ? 'active' : ''}
                  role="tab"
                  aria-selected={viewMode === 'cards'}
                  onClick={() => setViewMode('cards')}
                >
                  Cards
                </button>
                <button
                  id="viewTable"
                  className={viewMode === 'table' ? 'active' : ''}
                  role="tab"
                  aria-selected={viewMode === 'table'}
                  onClick={() => setViewMode('table')}
                >
                  Table
                </button>
              </div>

              <button
                className="btn btn-accent"
                onClick={handleArchiveToday}
                aria-label="Archive today's absences"
                title="Archive and clear today's reports for next session"
                style={{
                  backgroundColor: '#f59e0b',
                  color: '#ffffff',
                  borderColor: '#d97706',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                }}
              >
                <i className="fas fa-archive"></i> Archive Today
              </button>
            </div>
          </div>

          {loading && <LoadingSpinner message="Loading absence reports..." />}

          {/* Cards View */}
          {viewMode === 'cards' && !loading && (
            <div id="cardsView" className="content-cards">
              {aggregatedCards.length === 0 ? (
                <EmptyState
                  icon="fas fa-bell-slash"
                  message="No active absence reports found for your divisions."
                />
              ) : (
                <div
                  id="absenceList"
                  className="grid-auto"
                  style={{ gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
                >
                  {aggregatedCards.map((report, idx) => {
                    const formattedTime = report.timestamp.toLocaleString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      month: 'short',
                      day: 'numeric',
                    });

                    return (
                      <div key={idx} className="card compact">
                        <div className="card-header">
                          <i className="fas fa-chalkboard-teacher"></i>
                          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '10px' }}>
                            <span style={{ fontWeight: 700, fontSize: '14px' }}>
                              {report.teacherName || 'System Record'}
                            </span>
                            <span style={{ fontSize: '11px', opacity: 0.8 }}>
                              {report.subject || 'N/A'} —{' '}
                              <b style={{ color: '#22c55e' }}>Session {report.session || '?'}</b>
                            </span>
                          </div>
                          <span className="count-badge">{report.count || 0}</span>
                        </div>
                        <div className="card-body">
                          <div className="meta-rows" aria-label="Summary">
                            <div className="meta-row">
                              <span className="label">
                                <i className="fas fa-school"></i> Class
                              </span>
                              <span className="value">
                                {report.class} ({report.section})
                              </span>
                            </div>
                            <div className="meta-row">
                              <span className="label">
                                <i className="fas fa-building"></i> Division
                              </span>
                              <span className="value">{report.division}</span>
                            </div>
                            <div className="meta-row">
                              <span className="label">
                                <i className="fas fa-user-slash"></i> Students
                              </span>
                              <span
                                className="value"
                                style={{ whiteSpace: 'normal', color: '#c0392b', fontWeight: 600 }}
                              >
                                {report.students.map((s) => s.name).join(', ')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="card-footer">
                          <i className="fas fa-clock"></i> <b>Submitted:</b> {formattedTime}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && !loading && (
            <div id="tableView" className="content-table">
              {sortedTableReports.length === 0 ? (
                <EmptyState
                  icon="fas fa-bell-slash"
                  message="No active absence reports found for your divisions."
                />
              ) : (
                <table id="reportsTable">
                  <thead>
                    <tr>
                      <th
                        onClick={() => handleSort('timestamp')}
                        className={sortKey === 'timestamp' ? (sortDir === 'asc' ? 'sort-asc' : 'sort-desc') : ''}
                      >
                        Time
                      </th>
                      <th
                        onClick={() => handleSort('teacherName')}
                        className={sortKey === 'teacherName' ? (sortDir === 'asc' ? 'sort-asc' : 'sort-desc') : ''}
                      >
                        Teacher
                      </th>
                      <th
                        onClick={() => handleSort('subject')}
                        className={sortKey === 'subject' ? (sortDir === 'asc' ? 'sort-asc' : 'sort-desc') : ''}
                      >
                        Subject
                      </th>
                      <th
                        onClick={() => handleSort('session')}
                        className={sortKey === 'session' ? (sortDir === 'asc' ? 'sort-asc' : 'sort-desc') : ''}
                      >
                        Session
                      </th>
                      <th
                        onClick={() => handleSort('division')}
                        className={sortKey === 'division' ? (sortDir === 'asc' ? 'sort-asc' : 'sort-desc') : ''}
                      >
                        Division
                      </th>
                      <th
                        onClick={() => handleSort('class')}
                        className={sortKey === 'class' ? (sortDir === 'asc' ? 'sort-asc' : 'sort-desc') : ''}
                      >
                        Class
                      </th>
                      <th
                        onClick={() => handleSort('section')}
                        className={sortKey === 'section' ? (sortDir === 'asc' ? 'sort-asc' : 'sort-desc') : ''}
                      >
                        Section
                      </th>
                      <th
                        onClick={() => handleSort('absentees')}
                        className={sortKey === 'absentees' ? (sortDir === 'asc' ? 'sort-asc' : 'sort-desc') : ''}
                      >
                        Absentees
                      </th>
                    </tr>
                  </thead>
                  <tbody id="reportsTableBody">
                    {sortedTableReports.map((r) => {
                      const formattedTime = r.timestamp.toLocaleString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });

                      return (
                        <tr key={r.id}>
                          <td style={{ whiteSpace: 'nowrap' }}>{formattedTime}</td>
                          <td style={{ fontWeight: 700, color: '#2c3e50' }}>
                            {r.teacherName || 'System Record'}
                          </td>
                          <td style={{ fontStyle: 'italic' }}>{r.subject || 'N/A'}</td>
                          <td style={{ fontWeight: 'bold', color: '#22c55e' }}>
                            S{r.session || 'N/A'}
                          </td>
                          <td>{r.division || 'N/A'}</td>
                          <td>{r.class || 'N/A'}</td>
                          <td>{r.section || 'N/A'}</td>
                          <td style={{ color: '#c0392b', fontWeight: 600 }}>{r.absentees || ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
