# School Attendance Management System

A web-based attendance management system built with Next.js 14, React, TypeScript, and Firebase Firestore. Designed for schools with role-based access for Administrators, Supervisors (Principals), and Teachers.

## Features

### 🛡️ Administrator Panel
- **Role & User Management**: Create, edit, and manage accounts for Supervisors and Teachers with secure password reset workflows.
- **Curriculum & Division Management**: Add, delete, and synchronize classes, divisions, and sections.
- **Archived Reports & Export Center**:
  - Filter historical attendance by division and date range.
  - Live search across students, teachers, subjects, and absence reasons.
  - **Export to CSV / Excel**: Properly encoded with UTF-8 BOM (`\uFEFF`) for clean Excel compatibility.
  - **Print / PDF Summary**: One-click printable view with clean PDF formatting.
  - **Manual Day Archiving**: Archive active reports immediately to start fresh without waiting for midnight.

### 📋 Supervisor (Principal) Dashboard
- **Division-Specific Routing**: Supervisors only see live attendance reports for their assigned divisions (Secondary, Elementary, Middle School, etc.).
- **Daily Fresh Board**: Real-time attendance feed updates dynamically and refreshes every morning with only today's new reports.
- **Timeframe Toggle**: Switch between **Today's Reports** and **All Active**.
- **Historical Safe Archiving**: Safely move daily records to the historical archive.

### 👩‍🏫 Teacher Portal
- **Rapid Absence Reporting**: Submit absence, tardiness, and excused records by division, class, and period session.
- **Multi-Student Entry**: Submit individual student names, attendance statuses (Absent, Late, Excused), and custom reasons.
- **Direct Real-Time Sync**: Instant submission directly to Firestore with fallback resilience.

### ⏰ Automated Daily Archiving & Vercel Integration
- **Zero Server Overhead**: Deploys seamlessly on Vercel with zero external server dependencies (Render completely decommissioned).
- **Daily Midnight Cron**: Automatically marks previous day's active reports as `status: 'archived'` at 00:00 UTC via `/api/cron/archive` configured in `vercel.json`.

---

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Authentication**: Firebase Authentication
- **Database**: Google Cloud Firestore (real-time listeners and atomic batch transactions)
- **Hosting & Cron**: Vercel (`vercel.json`)
- **Styling**: Modern responsive CSS with custom design tokens

---

## Getting Started

### 1. Clone & Install
```bash
git clone https://github.com/Ziadnahouli/School-Attendance-2.git
cd School-Attendance-2
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the project root:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## Deploying to Vercel

1. Push this repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Add the `NEXT_PUBLIC_FIREBASE_*` environment variables in your Vercel Project Settings.
4. Deploy! Vercel will automatically configure the `/api/cron/archive` schedule defined in `vercel.json`.

---

## License

© 2026 RHTI. All rights reserved. Made by Ziad.