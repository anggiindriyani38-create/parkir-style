// ========== STATE ==========
let currentUser = null;
let settings = JSON.parse(localStorage.getItem('parkir_settings')) || {
  maxSlots: 100,
  rates: { Motor: 2000, Mobil: 5000, 'Box / Truk': 8000 }
};
let parked = JSON.parse(localStorage.getItem('parkir_parked')) || [];
let history = JSON.parse(localStorage.getItem('parkir_history')) || [];

// ========== LOGIN ==========
function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');

  if (!email || pass.length < 4) {
    err.style.display = 'block';
    err.textContent = 'Email dan password minimal 4 karakter';
    return;
  }

  // Admin
  if ((email.toLowerCase() === 'luqman nur azizumajid' || email.toLowerCase() === 'luqman') && pass === '12345') {
    currentUser = { name: 'Luqman Nur Azizumajid', role: 'admin', email };
    startApp();
    return;
  }

  // Pengguna biasa
  currentUser = {
    name: email.includes('@') ? email.split('@')[0] : email,
    role: 'user',
    email
  };
  startApp();
}

function doLoginGoogle() {
  currentUser = { name: 'Pengguna Google', role: 'user', email: 'google@user.com' };
  startApp();
}

function startApp() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('user-name-display').textContent =
    currentUser.name + (currentUser.role === 'admin' ? ' (Admin)' : '');

  updateDateTime();
  setInterval(updateDateTime, 1000);
  setInterval(renderParked, 20000);

  loadSettingsToForm();
  updateStats();
  renderParked();
  renderHistory();
  applyRoleRestriction();
}

function logout() {
  currentUser = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').style.display = 'none';
}

// ========== ROLE ==========
function applyRoleRestriction() {
  const isAdmin = currentUser && currentUser.role === 'admin';

  // Tab Pengaturan
  const tabSettings = document.getElementById('tab-settings');
  if (tabSettings) {
    tabSettings.style.display = isAdmin ? 'inline-block' : 'none';
  }

  // Tombol Hapus Riwayat
  const btnHapus = document.getElementById('btn-hapus-riwayat');
  if (btnHapus) {
    btnHapus.style.display = isAdmin ? 'inline-block' : 'none';
  }

  // Jika user biasa sedang di tab settings, pindah ke operasional
  if (!isAdmin) {
    const panel = document.getElementById('panel-settings');
    if (panel && panel.classList.contains('active')) {
      switchTab('ops');
    }
  }
}

// ========== UTILS ==========
function updateDateTime() {
  const now = new Date();
  const options = {
    weekday: 'long', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  };
  document.getElementById('current-datetime').textContent =
    now.toLocaleDateString('id-ID', options);
}

function formatTime(ts) {
  return new Date(ts).toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatDuration(ms) {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return m + ' menit';
  return h + ' jam ' + m + ' menit';
}

function calcFee(type, entryTime, exitTime) {
  const ms = exitTime - entryTime;
  const hours = Math.max(1, Math.ceil(ms / 3600000));
  const rate = settings.rates[type] || 2000;
  return hours * rate;
}

function generateTicket() {
  const num = String(parked.length + history.length + 1).padStart(4, '0');
  return 'TKT-' + num;
}

function saveData() {
  localStorage.setItem('parkir_parked', JSON.stringify(parked));
  localStorage.setItem('parkir_history', JSON.stringify(history));
  localStorage.setItem('parkir_settings', JSON.stringify(settings));
}

// ========== STATS ==========
function updateStats() {
  const today = new Date().toDateString();
  const exitedToday = history.filter(h => new Date(h.exitTime).toDateString() === today);
  const revenueToday = exitedToday.reduce((sum, h) => sum + h.fee, 0);

  document.getElementById('stat-parked').textContent = parked.length;
  document.getElementById('stat-available').textContent = settings.maxSlots - parked.length;
  document.getElementById('stat-exited').textContent = exitedToday.length;
  document.getElementById('stat-revenue').textContent =
    'Rp ' + revenueToday.toLocaleString('id-ID');
}

// ========== TABS ==========
function switchTab(tab) {
  // Cegah user biasa membuka settings
  if (tab === 'settings' && currentUser.role !== 'admin') {
    alert('Hanya Admin yang dapat mengakses Pengaturan');
    return;
  }

  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + tab).classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add('active');
}

// ========== OPERASIONAL ==========
function addVehicle() {
  const plate = document.getElementById('input-plate').value.trim().toUpperCase();
  const type = document.getElementById('input-type').value;
  const note = document.getElementById('input-note').value.trim();

  if (!plate) {
    alert('Plat nomor wajib diisi!');
    return;
  }
  if (parked.some(p => p.plate === plate)) {
    alert('Kendaraan dengan plat ini sudah parkir!');
    return;
  }
  if (parked.length >= settings.maxSlots) {
    alert('Slot parkir sudah penuh!');
    return;
  }

  const vehicle = {
    ticket: generateTicket(),
    plate,
    type,
    note,
    entryTime: Date.now()
  };

  parked.push(vehicle);
  saveData();
  updateStats();
  renderParked();

  document.getElementById('input-plate').value = '';
  document.getElementById('input-note').value = '';
}

function exitVehicle(ticket) {
  const idx = parked.findIndex(p => p.ticket === ticket);
  if (idx === -1) return;

  const vehicle = parked[idx];
  const exitTime = Date.now();
  const fee = calcFee(vehicle.type, vehicle.entryTime, exitTime);
  const duration = formatDuration(exitTime - vehicle.entryTime);

  const record = {
    ...vehicle,
    exitTime,
    duration,
    fee
  };

  history.unshift(record);
  parked.splice(idx, 1);
  saveData();
  updateStats();
  renderParked();
  renderHistory();

  showStruk(record);
}

function renderParked() {
  const keyword = (document.getElementById('search-parked')?.value || '').toLowerCase();
  const tbody = document.getElementById('parked-tbody');
  const filtered = parked.filter(p =>
    p.plate.toLowerCase().includes(keyword) ||
    p.ticket.toLowerCase().includes(keyword)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Tidak ada kendaraan sedang parkir.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    const dur = formatDuration(Date.now() - p.entryTime);
    return `
      <tr>
        <td>${p.ticket}</td>
        <td><strong>${p.plate}</strong></td>
        <td>${p.type}</td>
        <td>${formatTime(p.entryTime)}</td>
        <td>${dur}</td>
        <td>
          <button class="btn-sm btn-green" onclick="exitVehicle('${p.ticket}')">Keluar</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ========== RIWAYAT ==========
function renderHistory() {
  const keyword = (document.getElementById('search-history')?.value || '').toLowerCase();
  const tbody = document.getElementById('history-tbody');
  const filtered = history.filter(h =>
    h.plate.toLowerCase().includes(keyword) ||
    h.ticket.toLowerCase().includes(keyword)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty">Belum ada riwayat transaksi.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(h => `
    <tr>
      <td>${h.ticket}</td>
      <td><strong>${h.plate}</strong></td>
      <td>${h.type}</td>
      <td>${formatTime(h.entryTime)}</td>
      <td>${formatTime(h.exitTime)}</td>
      <td>${h.duration}</td>
      <td>Rp ${h.fee.toLocaleString('id-ID')}</td>
      <td>
        <button class="btn-sm btn-outline" onclick="printStruk('${h.ticket}')">Cetak</button>
      </td>
    </tr>
  `).join('');
}

function printStruk(ticket) {
  const h = history.find(x => x.ticket === ticket);
  if (h) showStruk(h);
}

function exportCSV() {
  if (history.length === 0) {
    alert('Belum ada data untuk diexport');
    return;
  }
  let csv = 'Tiket,Plat,Jenis,Masuk,Keluar,Durasi,Biaya\n';
  history.forEach(h => {
    csv += `${h.ticket},${h.plate},${h.type},"${formatTime(h.entryTime)}","${formatTime(h.exitTime)}",${h.duration},${h.fee}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'riwayat_parkir.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function clearHistory() {
  if (currentUser.role !== 'admin') {
    alert('Hanya Admin yang dapat menghapus riwayat');
    return;
  }
  if (!confirm('Yakin ingin menghapus semua riwayat transaksi?')) return;
  history = [];
  saveData();
  updateStats();
  renderHistory();
}

// ========== PENGATURAN ==========
function loadSettingsToForm() {
  document.getElementById('set-max').value = settings.maxSlots;
  document.getElementById('set-motor').value = settings.rates.Motor;
  document.getElementById('set-mobil').value = settings.rates.Mobil;
  document.getElementById('set-truk').value = settings.rates['Box / Truk'];
}

function saveSettings() {
  if (currentUser.role !== 'admin') {
    alert('Hanya Admin yang dapat mengubah pengaturan');
    return;
  }

  const max = parseInt(document.getElementById('set-max').value) || 100;
  const motor = parseInt(document.getElementById('set-motor').value) || 2000;
  const mobil = parseInt(document.getElementById('set-mobil').value) || 5000;
  const truk = parseInt(document.getElementById('set-truk').value) || 8000;

  settings = {
    maxSlots: max,
    rates: { Motor: motor, Mobil: mobil, 'Box / Truk': truk }
  };
  saveData();
  updateStats();
  alert('Pengaturan berhasil disimpan!');
}

// ========== STRUK ==========
function showStruk(data) {
  const content = document.getElementById('struk-content');
  content.innerHTML = `
    <div class="row">
      <span class="label">No. Tiket</span>
      <span class="value">${data.ticket}</span>
    </div>
    <div class="row">
      <span class="label">Plat Nomor</span>
      <span class="value">${data.plate}</span>
    </div>
    <div class="row">
      <span class="label">Jenis</span>
      <span class="value">${data.type}</span>
    </div>
    <div class="row">
      <span class="label">Waktu Masuk</span>
      <span class="value">${formatTime(data.entryTime)}</span>
    </div>
    <div class="row">
      <span class="label">Waktu Keluar</span>
      <span class="value">${formatTime(data.exitTime)}</span>
    </div>
    <div class="row">
      <span class="label">Durasi</span>
      <span class="value">${data.duration}</span>
    </div>
    <div class="row total">
      <span class="label">Total Biaya</span>
      <span class="value">Rp ${data.fee.toLocaleString('id-ID')}</span>
    </div>
  `;
  document.getElementById('struk-modal').classList.add('show');
}

function closeStruk() {
  document.getElementById('struk-modal').classList.remove('show');
}

document.getElementById('struk-modal').addEventListener('click', function(e) {
  if (e.target === this) closeStruk();
});

// Auto focus
document.getElementById('login-email').focus();