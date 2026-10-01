const firebaseConfig = { apiKey: "AIzaSyBX3-pcg4gCUzHdPuRhP9BPTKbJr4zM2Mc", authDomain: "school-attendance-81385.firebaseapp.com", projectId: "school-attendance-81385", storageBucket: "school-attendance-81385.firebasestorage.app", messagingSenderId: "232756214397", appId: "1:232756214397:web:67de1961741864be744f14" };
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global variables for supervisor data
let supervisorDivisions = [];
window.allAbsences = [];

// Authentication state change handler
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        // Redirect to login if not authenticated
        window.location.href = "supervisor_login.html";
        return;
    }

    // Check if user is a principal/supervisor
    const supervisorDocRef = db.collection("principals").doc(user.uid);
    const supervisorDocSnap = await supervisorDocRef.get();

    if (!supervisorDocSnap.exists) {
        alert("Access Denied: You do not have a supervisor account.");
        await auth.signOut();
        window.location.href = "supervisor_login.html";
        return;
    }

    // Store allowed divisions and show dashboard
    supervisorDivisions = supervisorDocSnap.data().divisions || [];
    document.body.style.display = "flex";
    document.getElementById('loading').classList.add('visible');
    subscribeToAbsences();
    // Group cards by Division/Class/Section so multiple reports collapse into one card
    window.groupByClass = true;
});

function subscribeToAbsences(){
    try {
        db.collection('absences').onSnapshot((snapshot) => {
            const allowedDivs = (supervisorDivisions || []).map(d => String(d||'').trim().toLowerCase());
            const docs = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    teacherName: data.teacherName || 'System Record',
                    subject: data.subject || 'N/A',
                    session: data.session || 'N/A',
                    division: data.division,
                    class: data.class,
                    section: data.section,
                    absentees: data.absentees,
                    attendanceStatus: data.attendanceStatus || 'Unexcused',
                    reason: data.reason || '',
                    students: Array.isArray(data.students) ? data.students : [],
                    status: data.status || 'active',
                    timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
    };
            }).filter(report => {
                const div = String(report.division||'').trim().toLowerCase();
                return allowedDivs.includes(div);
            });
            window.allAbsences = docs;
            const activeAbsences = window.allAbsences.filter(r => (r.status||'active') !== 'archived');
            renderReports(activeAbsences);
            document.getElementById('loading').classList.remove('visible');
            document.dispatchEvent(new Event('absences-updated'));
        }, (error) => {
            console.error('Realtime subscription error:', error);
            document.getElementById('loading').classList.remove('visible');
        });
    } catch (error) {
        console.error('Failed to subscribe to absences:', error);
        document.getElementById('loading').classList.remove('visible');
    }
}
window.renderReports = renderReports;

// Reset all absences (dangerous)
async function resetAbsencesAll(){
    if(!confirm('This will delete ALL reports. Are you sure?')) return;
    try{
        document.getElementById('loading').classList.add('visible');
        const resp = await fetch('https://ziad-school-app.onrender.com/absences/all', { method: 'DELETE' });
        if(!resp.ok) throw new Error('Server responded with ' + resp.status);
    }catch(e){
        alert('Failed to reset: ' + e.message);
    }finally{
        document.getElementById('loading').classList.remove('visible');
    }
}
window.resetAbsencesAll = resetAbsencesAll;

function renderReports(reportsToDisplay) {
    const reportsContainer = document.getElementById("absenceList");
    const emptyStateContainer = document.getElementById("empty-state-container");
    reportsContainer.innerHTML = '';

    const norm = (v) => String(v||'').trim().toLowerCase();
    
    function extractStudents(r){
        return (Array.isArray(r.students) && r.students.length > 0
            ? r.students.map(s=>({ name: String(s.name||'').trim(), status: String(s.status||r.attendanceStatus||'Unexcused').trim(), reason: String(s.reason||r.reason||'').trim() }))
            : String(r.absentees||'').split(',').map(n=>({ name: String(n||'').trim(), status: String(r.attendanceStatus||'Unexcused').trim(), reason: String(r.reason||'').trim() })).filter(s=>s.name));
    }

    let aggregated = [];
    if(window.groupByClass){
        const grouped = new Map();
        reportsToDisplay.forEach(r => {
            const key = [norm(r.division), norm(r.class), norm(r.section)].join('||');
            const existing = grouped.get(key);
            if(!existing){
                grouped.set(key, {
                    division: r.division,
                    class: r.class,
                    section: r.section,
                    teacherName: r.teacherName, // <--- SAVES TEACHER NAME
                    subject: r.subject,
                    session: r.session,         
                    statuses: new Set([(r.attendanceStatus||'').trim()]),
                    reasons: new Set([(r.reason||'').trim()].filter(Boolean)),
                    studentsMap: new Map(),
                    timestamp: r.timestamp
                });
            } else {
                existing.statuses.add((r.attendanceStatus||'').trim());
                const rz = (r.reason||'').trim(); if(rz) existing.reasons.add(rz);
                if (r.timestamp > existing.timestamp) existing.timestamp = r.timestamp;
            }
            const bucket = grouped.get(key);
            extractStudents(r).forEach(s => {
                const nm = norm(s.name); if(!nm) return;
                if(!bucket.studentsMap.has(nm)){ bucket.studentsMap.set(nm, { name: s.name, status: s.status, reason: s.reason }); }
            });
        });
        aggregated = Array.from(grouped.values()).map(item => ({
            ...item,
            students: Array.from(item.studentsMap.values()),
            count: item.studentsMap.size
        }));
    } else {
        aggregated = reportsToDisplay.map(r => ({
            ...r,
            students: extractStudents(r),
            count: extractStudents(r).length
        }));
    }

    aggregated.sort((a,b) => b.timestamp - a.timestamp);

    if (aggregated.length > 0) {
        emptyStateContainer.style.display = 'none';
        aggregated.forEach(reportData => {
            const card = document.createElement("div");
            card.className = "card compact";
            const formattedTime = reportData.timestamp.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
            
            card.innerHTML = `
    <div class="card-header">
        <i class="fas fa-chalkboard-teacher"></i> 
        <div style="display:flex; flex-direction:column; margin-left:10px;">
            <span style="font-weight:700; font-size:14px;">${reportData.teacherName || 'System Record'}</span>
            <span style="font-size:11px; opacity:0.8;">
                ${reportData.subject || 'N/A'} — <b style="color: #22c55e;">Session ${reportData.session || '?'}</b>
            </span>
        </div>
        <span class="count-badge">${reportData.count || 0}</span>
    </div>
    <div class="card-body">
        <div class="meta-rows" aria-label="Summary">
            <div class="meta-row">
                <span class="label"><i class="fas fa-school"></i> Class</span>
                <span class="value">${reportData.class} (${reportData.section})</span>
            </div>
            <div class="meta-row">
                <span class="label"><i class="fas fa-building"></i> Division</span>
                <span class="value">${reportData.division}</span>
            </div>
            <div class="meta-row">
                <span class="label"><i class="fas fa-user-slash"></i> Students</span>
                <span class="value" style="white-space: normal; color: #c0392b; font-weight:600;">
                    ${reportData.students.map(s => s.name).join(', ')}
                </span>
            </div>
        </div>
    </div>
    <div class="card-footer">
        <i class="fas fa-clock"></i> <b>Submitted:</b> ${formattedTime}
    </div>
`;
            reportsContainer.appendChild(card);
        });
    } else {
        emptyStateContainer.style.display = 'block';
    }
}

// REMOVE THE OLD DOMContentLoaded BLOCK AT THE BOTTOM AND USE THIS INSTEAD:
document.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard initialized");
});

window.resetAbsences = async function() {
    if (!confirm("Are you sure you want to permanently delete today's absences? This action cannot be undone.")) return;
    try {
        const response = await fetch('https://ziad-school-app.onrender.com/absences/today', {
            method: 'DELETE'
        });
        const resultText = await response.text();
        alert(resultText);
        if (response.ok) {
            document.getElementById('loading').classList.add('visible');
            fetchAbsences();
        }
    } catch (error) {
        alert("An error occurred: " + error.message);
    }
}

window.logout = async function() { await auth.signOut(); window.location.href = "supervisor_login.html"; }
window.goAbout = function() { window.open("about_us.html", "_blank"); }

document.addEventListener('DOMContentLoaded', async () => {
    const filtersContainer = document.querySelector('.filters-container');
    const filtersHeader = document.querySelector('.filters-header');
    const filtersContent = document.getElementById('filters-content');
    const filtersToggle = document.getElementById('filters-toggle');

    filtersHeader.addEventListener('click', () => {
        filtersContent.classList.toggle('collapsed');
        if (filtersContent.classList.contains('collapsed')) {
            filtersToggle.innerHTML = '<i class="fas fa-chevron-down"></i>';
        } else {
            filtersToggle.innerHTML = '<i class="fas fa-chevron-up"></i>';
        }
    });
});
