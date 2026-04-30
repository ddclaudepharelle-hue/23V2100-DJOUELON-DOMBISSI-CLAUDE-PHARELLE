/* ── SGS PLUS — app.js ── */

const MALADIES_COLORS = {
  'Paludisme':   '#1565C0',
  'Typhoïde':    '#E65100',
  'Tuberculose': '#6A1B9A',
  'VIH/SIDA':    '#B71C1C',
  'Choléra':     '#00695C',
  'Diabète':     '#1B5E20',
  'Hypertension':'#880E4F',
  'Pneumonie':   '#0D47A1',
  'Autre':       '#78909C'
};

let _patients = null;
let _charts = {};
let _currentPage = 1;
let _filtered = [];
const PER_PAGE = 8;

async function fetchPatients() {
  if (_patients) return _patients;
  const res = await fetch('/api/patients');
  _patients = await res.json();
  return _patients;
}

function calcAge(ddn) {
  if (!ddn) return null;
  const b = new Date(ddn), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
}

function ageGroup(age) {
  if (age === null) return 'Inconnu';
  if (age < 15)  return '0-14 ans';
  if (age < 25)  return '15-24 ans';
  if (age < 40)  return '25-39 ans';
  if (age < 60)  return '40-59 ans';
  return '60+ ans';
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

/* ══════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════ */
async function initDashboard() {
  const patients = await fetchPatients();
  const n = patients.length;

  document.getElementById('s-total').textContent = n;

  if (n === 0) {
    ['s-guerison','s-mortalite','s-maladie'].forEach(id => {
      document.getElementById(id).textContent = '—';
    });
    return;
  }

  const gueris = patients.filter(p => p.statut === 'Guéri').length;
  const deces  = patients.filter(p => p.statut === 'Décédé').length;
  document.getElementById('s-guerison').textContent  = Math.round(gueris / n * 100) + '%';
  document.getElementById('s-mortalite').textContent = Math.round(deces  / n * 100) + '%';

  const mCount = {};
  patients.forEach(p => { mCount[p.maladie] = (mCount[p.maladie] || 0) + 1; });
  const topM = Object.entries(mCount).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('s-maladie').textContent = topM ? topM[0] : '—';

  buildChartMaladie(mCount);
  buildChartSexe(patients);
  buildChartAge(patients);
}

function destroyChart(key) {
  if (_charts[key]) { _charts[key].destroy(); _charts[key] = null; }
}

function buildChartMaladie(mCount) {
  destroyChart('maladie');
  const labels = Object.keys(mCount);
  const data   = Object.values(mCount);
  const colors = labels.map(l => MALADIES_COLORS[l] || '#78909C');

  const leg = document.getElementById('leg-maladie');
  leg.innerHTML = labels.map((l, i) =>
    `<span><span class="legend-dot" style="background:${colors[i]}"></span>${l} (${mCount[l]})</span>`
  ).join('');

  _charts.maladie = new Chart(document.getElementById('chartMaladie'), {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

function buildChartSexe(patients) {
  destroyChart('sexe');
  const m = patients.filter(p => p.sexe === 'Masculin').length;
  const f = patients.filter(p => p.sexe === 'Féminin').length;

  document.getElementById('leg-sexe').innerHTML =
    `<span><span class="legend-dot" style="background:#1565C0"></span>Masculin (${m})</span>
     <span><span class="legend-dot" style="background:#880E4F"></span>Féminin (${f})</span>`;

  _charts.sexe = new Chart(document.getElementById('chartSexe'), {
    type: 'pie',
    data: {
      labels: ['Masculin', 'Féminin'],
      datasets: [{ data: [m, f], backgroundColor: ['#1565C0', '#880E4F'], borderWidth: 2, borderColor: '#fff' }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

function buildChartAge(patients) {
  destroyChart('age');
  const groups = ['0-14 ans', '15-24 ans', '25-39 ans', '40-59 ans', '60+ ans'];
  const colors = ['#42A5F5', '#66BB6A', '#FFA726', '#EF5350', '#AB47BC'];
  const counts = groups.map(g =>
    patients.filter(p => ageGroup(calcAge(p.ddn)) === g).length
  );

  document.getElementById('leg-age').innerHTML = groups.map((g, i) =>
    `<span><span class="legend-dot" style="background:${colors[i]}"></span>${g}</span>`
  ).join('');

  _charts.age = new Chart(document.getElementById('chartAge'), {
    type: 'bar',
    data: {
      labels: groups,
      datasets: [{ data: counts, backgroundColor: colors, borderRadius: 4, borderSkipped: false }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#F1F5F9' } },
        x: { grid: { display: false }, ticks: { autoSkip: false } }
      }
    }
  });
}

/* ══════════════════════════════════════════
   LISTE PATIENTS
══════════════════════════════════════════ */
async function initListe() {
  const patients = await fetchPatients();
  _filtered = [...patients];
  renderTable();
}

function filterTable() {
  const q = (document.getElementById('searchInput').value || '').toLowerCase();
  fetchPatients().then(patients => {
    _filtered = patients.filter(p =>
      (p.nom || '').toLowerCase().includes(q) ||
      (p.prenom || '').toLowerCase().includes(q) ||
      (p.maladie || '').toLowerCase().includes(q)
    );
    _currentPage = 1;
    renderTable();
  });
}

function renderTable() {
  const total = _filtered.length;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  if (_currentPage > pages) _currentPage = 1;

  const slice = _filtered.slice((_currentPage - 1) * PER_PAGE, _currentPage * PER_PAGE);

  const badge = document.getElementById('count-badge');
  if (badge) badge.textContent = `${total} patient${total > 1 ? 's' : ''}`;

  const info = document.getElementById('page-info');
  if (info) info.textContent = `Page ${_currentPage} / ${pages}`;

  const prev = document.getElementById('prev-btn');
  const next = document.getElementById('next-btn');
  if (prev) prev.disabled = _currentPage <= 1;
  if (next) next.disabled = _currentPage >= pages;

  const STATUS_BADGE = {
    'Guéri':        'badge-green',
    'Décédé':       'badge-red',
    'En traitement':'badge-blue',
    'Référé':       'badge-orange'
  };

  const body = document.getElementById('patient-body');
  if (!body) return;

  if (slice.length === 0) {
    body.innerHTML = '<tr><td colspan="9" class="loading-row">Aucun résultat trouvé.</td></tr>';
    return;
  }

  body.innerHTML = slice.map((p, i) => {
    const num = (_currentPage - 1) * PER_PAGE + i + 1;
    const age = calcAge(p.ddn);
    const sc  = STATUS_BADGE[p.statut] || 'badge-blue';
    return `<tr>
      <td>${num}</td>
      <td><strong>${p.nom}</strong></td>
      <td>${p.prenom}</td>
      <td>${age !== null ? age + ' ans' : '—'}</td>
      <td>${p.sexe}</td>
      <td><span class="badge badge-blue">${p.maladie}</span></td>
      <td><span class="badge ${sc}">${p.statut}</span></td>
      <td>${p.tel || '—'}</td>
      <td><button class="btn-danger" onclick="deletePatient('${p.id}')">Suppr.</button></td>
    </tr>`;
  }).join('');
}

function changePage(d) {
  _currentPage += d;
  renderTable();
}

async function deletePatient(id) {
  if (!confirm('Supprimer ce patient ?')) return;
  await fetch('/api/patients/' + id, { method: 'DELETE' });
  _patients = null;
  await initListe();
  showToast('Patient supprimé.');
}

/* ══════════════════════════════════════════
   FORMULAIRE
══════════════════════════════════════════ */
async function submitPatient() {
  const nom     = document.getElementById('f-nom').value.trim();
  const prenom  = document.getElementById('f-prenom').value.trim();
  const sexe    = document.getElementById('f-sexe').value;
  const maladie = document.getElementById('f-maladie').value;
  const statut  = document.getElementById('f-statut').value;

  if (!nom || !prenom || !sexe || !maladie || !statut) {
    showToast('Veuillez remplir tous les champs obligatoires (*).');
    return;
  }

  const data = {
    nom, prenom,
    ddn:     document.getElementById('f-ddn').value,
    sexe, maladie, statut,
    tel:     document.getElementById('f-tel').value,
    adresse: document.getElementById('f-adresse').value,
    obs:     document.getElementById('f-obs').value
  };

  const res = await fetch('/api/patients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (res.ok) {
    _patients = null;
    showToast('Patient enregistré avec succès !');
    setTimeout(() => { window.location.href = '/patients'; }, 900);
  } else {
    showToast('Erreur lors de l\'enregistrement.');
  }
}

function resetForm() {
  ['f-nom','f-prenom','f-ddn','f-sexe','f-tel','f-adresse','f-maladie','f-statut','f-obs'].forEach(id => {
    document.getElementById(id).value = '';
  });
}
