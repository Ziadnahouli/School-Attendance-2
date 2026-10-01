const firebaseConfig = { apiKey: "AIzaSyBX3-pcg4gCUzHdPuRhP9BPTKbJr4zM2Mc", authDomain: "school-attendance-81385.firebaseapp.com", projectId: "school-attendance-81385", storageBucket: "school-attendance-81385.firebasestorage.app", messagingSenderId: "232756214397", appId: "1:232756214397:web:67de1961741864be744f14" };

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let allClasses = [];

auth.onAuthStateChanged(async (user) => {
    if (!user) { window.location.href = "teacher_login.html"; return; }
    const teacherDocRef = db.collection("teachers").doc(user.uid);
    const teacherDocSnap = await teacherDocRef.get();
    if (!teacherDocSnap.exists) {
        alert("Access Denied: You do not have a teacher account.");
        await auth.signOut();
        window.location.href = "teacher_login.html";
        return;
    }
    document.body.style.display = "flex";
    document.getElementById("teacherName").innerText = user.email.split('@')[0];
    document.getElementById("currentDate").innerText = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    fetchClasses();
});

async function fetchClasses() {
    const divisionDropdown = document.getElementById('division');
    divisionDropdown.innerHTML = '<option value="" disabled selected>Loading divisions...</option>';
    divisionDropdown.disabled = true;

    try {
        const response = await fetch('https://ziad-school-app.onrender.com/classes');
        if (!response.ok) throw new Error('Could not fetch class list');
        allClasses = await response.json();

        divisionDropdown.innerHTML = '<option value="" disabled selected>-- Select a Division --</option>';
        
        // FILTER: Remove Preschool from the list
        const divisions = [...new Set(allClasses.map(c => c.division))]
            .filter(div => div.toLowerCase() !== "preschool") 
            .sort();

        divisions.forEach(div => {
            const option = document.createElement('option');
            option.value = div;
            option.textContent = div;
            divisionDropdown.appendChild(option);
        });
        divisionDropdown.disabled = false;
    } catch (error) {
        console.error("Error fetching classes:", error);
        divisionDropdown.innerHTML = '<option value="" disabled selected>Error loading divisions</option>';
    }
}

document.getElementById('division').addEventListener('change', (event) => {
    const selectedDivision = event.target.value;
    const classDropdown = document.getElementById('className');
    const sectionDropdown = document.getElementById('section');
    classDropdown.innerHTML = '<option value="">-- Select a Class --</option>';
    sectionDropdown.innerHTML = '<option value="">-- First Select a Class --</option>';
    sectionDropdown.disabled = true;
    const classesInDivision = [...new Set(allClasses.filter(c => c.division === selectedDivision).map(c => c.name))];
    if (classesInDivision.length > 0) {
        classesInDivision.sort().forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            classDropdown.appendChild(option);
        });
        classDropdown.disabled = false;
    } else {
        classDropdown.disabled = true;
    }
});

document.getElementById('className').addEventListener('change', (event) => {
    const selectedDivision = document.getElementById('division').value;
    const selectedClass = event.target.value;
    const sectionDropdown = document.getElementById('section');
    sectionDropdown.innerHTML = '<option value="">-- Select a Section --</option>';
    const sectionsForClass = allClasses.filter(c => c.division === selectedDivision && c.name === selectedClass).map(c => c.section);
    if (sectionsForClass.length > 0) {
        sectionsForClass.sort().forEach(sectionName => {
            const option = document.createElement('option');
            option.value = sectionName;
            option.textContent = sectionName;
            sectionDropdown.appendChild(option);
        });
        sectionDropdown.disabled = false;
    } else {
        sectionDropdown.disabled = true;
    }
});

async function submitAbsence() {
    // New Fields
    const teacherFullName = document.getElementById("teacherFullName").value;
    const subjectTaught = document.getElementById("subjectTaught").value;
    const sessionNum = document.getElementById("sessionNumber").value; 
    const division = document.getElementById("division").value;
    const className = document.getElementById("className").value;
    const section = document.getElementById("section").value;
    
    const chips = Array.from(document.querySelectorAll('#studentChips .chip[data-name]'));
    const absentList = chips.map(c => (c.dataset.name||'').trim()).join(', ');
    
    const students = chips.map(c => ({
        name: (c.dataset.name||'').trim(),
        status: (c.dataset.status||'Unexcused').trim(),
        reason: (c.dataset.reason||'').trim()
    }));

    if (!teacherFullName || !subjectTaught || !division || !className || !section || !absentList) { 
        alert("Please fill out all fields, including your name and subject."); 
        return; 
    }

    const submitBtn = document.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    try {
        const response = await fetch('https://ziad-school-app.onrender.com/absences', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                teacherName: teacherFullName,
                subject: subjectTaught,
                session: sessionNum,
                division: division,
                class: className,
                section: section,
                absentees: absentList,
                students: students,
                attendanceStatus: students[0]?.status || 'Unexcused'
            }),
        });
        if (!response.ok) throw new Error('Submission failed');
        
        alert("Absence report submitted successfully!");
        location.reload(); // Refresh to clear form

    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Absence';
    }
}

window.submitAbsence = submitAbsence;
window.logout = async function() { await auth.signOut(); window.location.href = "teacher_login.html"; }
window.goAbout = function() { window.open("about_us.html", "_blank"); }

document.addEventListener('DOMContentLoaded', () => {
    const studentInput = document.getElementById('studentName');
    const addBtn = document.getElementById('addStudentBtn');
    const chipsWrap = document.getElementById('studentChips');
    const studentStatus = document.getElementById('studentStatus');
    const studentReason = document.getElementById('studentReason');

    function addStudent(name, status, reason){
        const n = String(name||'').trim();
        if(!n) return;
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.dataset.name = n;
        chip.dataset.status = status || 'Unexcused';
        chip.dataset.reason = reason || '';
        const tag = chip.dataset.reason ? `${chip.dataset.status} · ${chip.dataset.reason}` : chip.dataset.status;
        chip.innerHTML = `<span>${n}</span> <span class="badge" style="margin-left:6px;">${tag}</span> <span class="chip-remove">×</span>`;
        chip.querySelector('.chip-remove').onclick = () => chip.remove();
        chipsWrap.appendChild(chip);
        studentInput.value = '';
        studentReason.value = '';
    }

    addBtn.addEventListener('click', () => addStudent(studentInput.value, studentStatus.value, studentReason.value));
});
