'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/components/auth/AuthContext';
import { fetchClasses, submitAbsenceReport } from '@/lib/api';
import { addAbsenceDirectly } from '@/lib/firestore';
import { ClassInfo, StudentAbsentee } from '@/lib/types';
import Footer from '@/components/layout/Footer';

export default function TeacherDashboardPage() {
  return (
    <ProtectedRoute allowedRole="teacher" loginPath="/teacher/login">
      <TeacherDashboardContent />
    </ProtectedRoute>
  );
}

function TeacherDashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Teacher info
  const teacherNamePrefix = user?.email ? user.email.split('@')[0] : 'Teacher';
  const currentDateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Form State
  const [teacherFullName, setTeacherFullName] = useState('');
  const [subjectTaught, setSubjectTaught] = useState('');
  const [sessionNumber, setSessionNumber] = useState('');

  // Cascading class selection
  const [allClasses, setAllClasses] = useState<ClassInfo[]>([]);
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Absent student input
  const [studentNameInput, setStudentNameInput] = useState('');
  const [studentStatusInput, setStudentStatusInput] = useState<'Unexcused' | 'Excused' | 'Late'>('Unexcused');
  const [studentReasonInput, setStudentReasonInput] = useState('');
  const [absentStudents, setAbsentStudents] = useState<StudentAbsentee[]>([]);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-scheme', 'teacher');
    return () => {
      document.documentElement.removeAttribute('data-scheme');
    };
  }, []);

  // Fetch classes
  useEffect(() => {
    async function load() {
      setLoadingClasses(true);
      try {
        const classes = await fetchClasses();
        setAllClasses(classes);
      } catch (err) {
        console.error('Error fetching classes:', err);
      } finally {
        setLoadingClasses(false);
      }
    }
    load();
  }, []);

  // Computed divisions
  const divisions = useMemo(() => {
    const list = Array.from(new Set(allClasses.map((c) => c.division)))
      .filter(Boolean)
      .sort();
    return list;
  }, [allClasses]);

  // Computed classes in chosen division
  const classesInDivision = useMemo(() => {
    if (!selectedDivision) return [];
    return Array.from(
      new Set(allClasses.filter((c) => c.division === selectedDivision).map((c) => c.name))
    ).sort();
  }, [allClasses, selectedDivision]);

  // Computed sections for chosen class
  const sectionsForClass = useMemo(() => {
    if (!selectedDivision || !selectedClass) return [];
    return Array.from(
      new Set(
        allClasses
          .filter((c) => c.division === selectedDivision && c.name === selectedClass)
          .map((c) => c.section)
      )
    ).sort();
  }, [allClasses, selectedDivision, selectedClass]);

  const handleDivisionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDivision(e.target.value);
    setSelectedClass('');
    setSelectedSection('');
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClass(e.target.value);
    setSelectedSection('');
  };

  const handleAddStudent = () => {
    const name = studentNameInput.trim();
    if (!name) return;

    setAbsentStudents((prev) => [
      ...prev,
      {
        name,
        status: studentStatusInput,
        reason: studentReasonInput.trim(),
      },
    ]);

    setStudentNameInput('');
    setStudentReasonInput('');
  };

  const handleRemoveStudent = (index: number) => {
    setAbsentStudents((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLogout = async () => {
    await logout();
    router.push('/teacher/login');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !teacherFullName.trim() ||
      !subjectTaught.trim() ||
      !sessionNumber ||
      !selectedDivision ||
      !selectedClass ||
      !selectedSection ||
      absentStudents.length === 0
    ) {
      alert('Please fill out all fields, including your name, subject, and at least one absent student.');
      return;
    }

    const absentList = absentStudents.map((s) => s.name).join(', ');

    setSubmitting(true);
    const payload = {
      teacherName: teacherFullName.trim(),
      subject: subjectTaught.trim(),
      session: sessionNumber,
      division: selectedDivision,
      class: selectedClass,
      section: selectedSection,
      absentees: absentList,
      students: absentStudents,
      attendanceStatus: absentStudents[0]?.status || 'Unexcused',
    };

    try {
      const res = await submitAbsenceReport(payload);
      alert(res.message || 'Absence report submitted successfully!');
      // Reset form
      setAbsentStudents([]);
      setSelectedClass('');
      setSelectedSection('');
      setSessionNumber('');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      alert('Error submitting absence: ' + msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="header">
        <div className="header-title">
          <i className="fas fa-chalkboard-teacher"></i> Teacher Dashboard
        </div>
        <button onClick={handleLogout} className="btn btn-accent" aria-label="Logout">
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </header>

      <main className="container" style={{ margin: '24px auto' }}>
        <div className="welcome-card">
          <span>
            👋 Welcome back, <b id="teacherName">{teacherNamePrefix}</b>
          </span>
          <span>
            Today&apos;s Date: <b id="currentDate">{currentDateStr}</b>
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="layout-teacher">
            {/* Left Column: Form Details & Students */}
            <div className="col-left">
              <div className="form-container">
                <h3>
                  <i className="fas fa-clipboard-list"></i> Submit Daily Absence Report
                </h3>

                <div className="form-group">
                  <label htmlFor="teacherFullName">Teacher Name:</label>
                  <input
                    type="text"
                    id="teacherFullName"
                    className="input"
                    placeholder="Teacher Full Name"
                    value={teacherFullName}
                    onChange={(e) => setTeacherFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="subjectTaught">Subject:</label>
                  <input
                    type="text"
                    id="subjectTaught"
                    className="input"
                    placeholder="e.g. Mathematics, Science"
                    value={subjectTaught}
                    onChange={(e) => setSubjectTaught(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sessionNumber">Session Number:</label>
                  <select
                    id="sessionNumber"
                    className="input"
                    value={sessionNumber}
                    onChange={(e) => setSessionNumber(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      -- Select Session --
                    </option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={String(s)}>
                        Session {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Absent Students Selection */}
                <div className="form-group">
                  <label>Add Absent Students:</label>
                  <div
                    className="input-with-icon"
                    style={{ marginTop: '8px', alignItems: 'stretch', gap: '8px' }}
                  >
                    <i className="fas fa-user-plus"></i>
                    <input
                      id="studentName"
                      type="text"
                      placeholder="Student name"
                      value={studentNameInput}
                      onChange={(e) => setStudentNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddStudent();
                        }
                      }}
                    />
                    <select
                      id="studentStatus"
                      className="input"
                      style={{ minWidth: '130px' }}
                      value={studentStatusInput}
                      onChange={(e) =>
                        setStudentStatusInput(e.target.value as 'Unexcused' | 'Excused' | 'Late')
                      }
                    >
                      <option value="Unexcused">Unexcused</option>
                      <option value="Excused">Excused</option>
                      <option value="Late">Late</option>
                    </select>
                    <input
                      id="studentReason"
                      type="text"
                      placeholder="Reason (optional)"
                      value={studentReasonInput}
                      onChange={(e) => setStudentReasonInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddStudent();
                        }
                      }}
                    />
                    <button
                      type="button"
                      id="addStudentBtn"
                      className="btn btn-accent"
                      onClick={handleAddStudent}
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                  </div>

                  {/* Chips Container */}
                  <div id="studentChips" className="chip-select" style={{ marginTop: '8px' }}>
                    {absentStudents.map((st, index) => {
                      const tag = st.reason ? `${st.status} · ${st.reason}` : st.status;
                      return (
                        <button key={index} type="button" className="chip">
                          <span>{st.name}</span>
                          <span className="badge" style={{ marginLeft: '6px' }}>
                            {tag}
                          </span>
                          <span
                            className="chip-remove"
                            style={{ marginLeft: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                            onClick={() => handleRemoveStudent(index)}
                          >
                            ×
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button type="submit" className="btn-submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Submitting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i> Submit Absence
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Right Column: Cascading Class Selection */}
            <div className="col-right">
              <div className="form-container">
                <h3>
                  <i className="fas fa-sliders-h"></i> Select Class
                </h3>

                <div className="form-group">
                  <label htmlFor="division">Select Division:</label>
                  <select
                    id="division"
                    value={selectedDivision}
                    onChange={handleDivisionChange}
                    disabled={loadingClasses}
                    required
                  >
                    <option value="" disabled>
                      {loadingClasses ? 'Loading divisions...' : '-- Select a Division --'}
                    </option>
                    {divisions.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="className">Class Name:</label>
                  <select
                    id="className"
                    value={selectedClass}
                    onChange={handleClassChange}
                    disabled={!selectedDivision || classesInDivision.length === 0}
                    required
                  >
                    <option value="">
                      {!selectedDivision ? '-- First Select a Division --' : '-- Select a Class --'}
                    </option>
                    {classesInDivision.map((cName) => (
                      <option key={cName} value={cName}>
                        {cName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="section">Section:</label>
                  <select
                    id="section"
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    disabled={!selectedClass || sectionsForClass.length === 0}
                    required
                  >
                    <option value="">
                      {!selectedClass ? '-- First Select a Class --' : '-- Select a Section --'}
                    </option>
                    {sectionsForClass.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}
