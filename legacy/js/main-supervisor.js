(function(){
  function getTheme(){ return document.documentElement.getAttribute('data-theme') || 'light'; }
  function setTogglePressed(){ var btn = document.getElementById('themeToggle'); if(!btn) return; btn.setAttribute('aria-pressed', getTheme()==='dark' ? 'true' : 'false'); }

  function normalizeStr(s){ return String(s||'').toLowerCase(); }
  function inRange(date, start, end){ if(!(date instanceof Date)) return false; if(start && date < start) return false; if(end && date > end) return false; return true; }

  function getFilters(){ return {}; }

  function applyFilters(){
    var all = window.allAbsences || [];
    var rows = all.filter(function(r){ return r.status !== 'archived'; });
    window.renderReports(rows);
    return rows;
  }

  function bindEvents(){
    var si = null, sd = null, ed = null, ex = null;
    var vc = document.getElementById('viewCards');
    var vt = document.getElementById('viewTable');

    if(vc) vc.addEventListener('click', function(){ setView('cards'); });
    if(vt) vt.addEventListener('click', function(){ setView('table'); });
    // Filters removed
  }

  function setView(view){
    var cardsView = document.getElementById('cardsView');
    var tableView = document.getElementById('tableView');
    var viewCardsBtn = document.getElementById('viewCards');
    var viewTableBtn = document.getElementById('viewTable');
    if(view === 'cards'){
      cardsView.classList.remove('hidden');
      tableView.classList.add('hidden');
      viewCardsBtn.classList.add('active');
      viewTableBtn.classList.remove('active');
    } else {
      cardsView.classList.add('hidden');
      tableView.classList.remove('hidden');
      viewCardsBtn.classList.remove('active');
      viewTableBtn.classList.add('active');
      renderTable(applyFilters());
    }
  }

  var currentSort = { key: 'timestamp', dir: 'desc' };

  function renderTable(reports) {
    var tbody = document.getElementById('reportsTableBody');
    if (!tbody) return; // Safety check
    
    tbody.innerHTML = '';

    // Sort reports by time (newest first) before rendering
    var sortedReports = reports.slice().sort(function(a, b) {
        var dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
        var dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
        return dateB - dateA;
    });

    sortedReports.forEach(function(r) {
        var row = document.createElement('tr');

        // 1. Format the Timestamp
        var dateObj = r.timestamp instanceof Date ? r.timestamp : new Date(r.timestamp);
        var formattedTime = dateObj.toLocaleString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });

        // 2. Build the row to match your <thead> order:
        // Order: Time | Teacher | Subject | Division | Class | Section | Absentees
        row.innerHTML = `
            <td style="white-space: nowrap;">${formattedTime}</td>
            <td style="font-weight: 700; color: #2c3e50;">${r.teacherName || 'System Record'}</td>
            <td style="font-style: italic;">${r.subject || 'N/A'}</td>
            <td style="font-weight:bold; color:#22c55e;">S${r.session || 'N/A'}</td>
            <td>${r.division || 'N/A'}</td>
            <td>${r.class || 'N/A'}</td>
            <td>${r.section || 'N/A'}</td>
            <td style="color: #c0392b; font-weight: 600;">${r.absentees || ''}</td>
        `;

        tbody.appendChild(row);
    });

    // Update Header Sort Indicators
    var headers = document.querySelectorAll('#reportsTable th');
    headers.forEach(function(th) { th.classList.remove('sort-asc', 'sort-desc'); });
}

  function bindTableSort(){
    var headers = document.querySelectorAll('#reportsTable th');
    headers.forEach(function(th, i){
      th.style.cursor = 'pointer';
      th.addEventListener('click', function(){
        var keys = ['division', 'class', 'section', 'absentees', 'attendanceStatus', 'reason', 'timestamp'];
        var key = keys[i];
        if(currentSort.key === key){
          currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          currentSort.key = key;
          currentSort.dir = 'asc';
        }
        renderTable(applyFilters());
      });
    });
  }

  // Charts removed

  function init(){ document.documentElement.setAttribute('data-theme','light'); setTogglePressed(); bindEvents(); bindTableSort(); document.addEventListener('absences-updated', applyFilters); applyFilters(); }

  if(document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
