(function(){
  function getStoredTheme(){ try { return localStorage.getItem('theme') || 'light'; } catch(e){ return 'light'; } }
  function storeTheme(t){ try { localStorage.setItem('theme', t); } catch(e){} }
  function applyTheme(t){ document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light'); }
  function toggleTheme(){ var cur = document.documentElement.getAttribute('data-theme') || 'light'; var next = cur === 'dark' ? 'light' : 'dark'; applyTheme(next); storeTheme(next); return next; }
  function initThemeToggle(buttonId){ applyTheme(getStoredTheme()); var btn = document.getElementById(buttonId); if(!btn) return; btn.addEventListener('click', function(){ toggleTheme(); }); }

  function toCSV(rows){ return rows.map(function(r){ return r.map(function(cell){ var s = String(cell==null?"":cell).replace(/"/g,'""'); if(/[",\n]/.test(s)) s='"'+s+'"'; return s; }).join(','); }).join('\n'); }
  function download(filename, text){ var blob = new Blob([text], {type: 'text/csv;charset=utf-8;'}); var link = document.createElement('a'); var url = URL.createObjectURL(blob); link.setAttribute('href', url); link.setAttribute('download', filename); document.body.appendChild(link); link.click(); setTimeout(function(){ URL.revokeObjectURL(url); document.body.removeChild(link); }, 0); }
  function exportCSV(filename, data){ if(!Array.isArray(data) || data.length===0){ download(filename, ''); return; } var headers = Object.keys(data[0]); var rows = [headers].concat(data.map(function(obj){ return headers.map(function(h){ return obj[h]; }); })); download(filename, toCSV(rows)); }

  window.UI = { initThemeToggle: initThemeToggle, exportCSV: exportCSV };
})();
