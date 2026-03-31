const socket = io();
let timelineChart, levelChart, sourceChart;
let alertCount = 0;

// ── Navigation ──────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const page = item.dataset.page;
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    item.classList.add('active');
    document.getElementById(`page-${page}`).classList.add('active');
    if (page === 'logs') loadLogs();
    if (page === 'alerts') loadAlerts();
  });
});

// ── Socket.io ────────────────────────────────────────────────────────
socket.on('connect', () => {
  const s = document.getElementById('conn-status');
  s.innerHTML = '<span class="dot connected"></span> Connected';
});
socket.on('disconnect', () => {
  const s = document.getElementById('conn-status');
  s.innerHTML = '<span class="dot disconnected"></span> Disconnected';
});
socket.on('new_log', log => {
  prependLogEntry(log, true);
});
socket.on('new_alert', alert => {
  alertCount++;
  updateBadge();
  if (document.getElementById('page-alerts').classList.contains('active')) {
    prependAlert(alert);
  }
});

// ── Dashboard ────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [statsRes, alertsRes] = await Promise.all([
      fetch('/api/logs/stats'),
      fetch('/api/alerts')
    ]);
    const stats  = await statsRes.json();
    const alerts = await alertsRes.json();

    const byLevel = {};
    stats.levelStats.forEach(l => { byLevel[l._id] = l.count; });

    document.getElementById('stat-total').textContent    = stats.totalLogs.toLocaleString();
    document.getElementById('stat-critical').textContent = (byLevel['CRITICAL'] || 0).toLocaleString();
    document.getElementById('stat-errors').textContent   = (byLevel['ERROR'] || 0).toLocaleString();
    document.getElementById('stat-alerts').textContent   = alerts.filter(a => !a.resolved).length;
    document.getElementById('last-updated').textContent  = 'Updated ' + new Date().toLocaleTimeString();

    renderCharts(stats);
    renderIPTable(stats.topIPs);
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

function renderCharts(stats) {
  const colors = { INFO: '#3fb950', WARNING: '#d29922', ERROR: '#f85149', CRITICAL: '#ff7b72' };

  // Timeline
  const tCtx = document.getElementById('timeline-chart').getContext('2d');
  const tLabels = stats.timelineStats.map(t => t._id);
  const tCounts = stats.timelineStats.map(t => t.count);
  const tErrors = stats.timelineStats.map(t => t.errors);

  if (timelineChart) timelineChart.destroy();
  timelineChart = new Chart(tCtx, {
    type: 'line',
    data: {
      labels: tLabels,
      datasets: [
        { label: 'Total', data: tCounts, borderColor: '#58a6ff', backgroundColor: 'rgba(88,166,255,.08)', tension: .3, fill: true, pointRadius: 0 },
        { label: 'Errors', data: tErrors, borderColor: '#f85149', backgroundColor: 'rgba(248,81,73,.08)', tension: .3, fill: true, pointRadius: 0 }
      ]
    },
    options: chartDefaults()
  });

  // Level Doughnut
  const lCtx = document.getElementById('level-chart').getContext('2d');
  const levels = stats.levelStats.map(l => l._id);
  const lCounts = stats.levelStats.map(l => l.count);
  if (levelChart) levelChart.destroy();
  levelChart = new Chart(lCtx, {
    type: 'doughnut',
    data: {
      labels: levels,
      datasets: [{ data: lCounts, backgroundColor: levels.map(l => colors[l] || '#8b949e'), borderWidth: 0 }]
    },
    options: { ...chartDefaults(), cutout: '65%' }
  });

  // Source Bar
  const sCtx = document.getElementById('source-chart').getContext('2d');
  if (sourceChart) sourceChart.destroy();
  sourceChart = new Chart(sCtx, {
    type: 'bar',
    data: {
      labels: stats.sourceStats.map(s => s._id),
      datasets: [{ data: stats.sourceStats.map(s => s.count), backgroundColor: '#58a6ff88', borderRadius: 4 }]
    },
    options: { ...chartDefaults(), indexAxis: 'y', plugins: { legend: { display: false } } }
  });
}

function chartDefaults() {
  return {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: '#8b949e', font: { size: 12 }, boxWidth: 12 }
      }
    },
    scales: {
      x: { ticks: { color: '#8b949e', font: { size: 11 } }, grid: { color: '#21262d' } },
      y: { ticks: { color: '#8b949e', font: { size: 11 } }, grid: { color: '#21262d' } }
    }
  };
}

function renderIPTable(ips) {
  const tbody = document.getElementById('ip-table');
  const levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  tbody.innerHTML = ips.map((ip, i) => {
    const risk = levels[Math.min(i, 3)];
    const riskColor = { LOW: '#3fb950', MEDIUM: '#d29922', HIGH: '#f85149', CRITICAL: '#ff7b72' }[risk];
    return `<tr>
      <td>${ip._id}</td>
      <td>${ip.count.toLocaleString()}</td>
      <td style="color:${riskColor};font-weight:700">${risk}</td>
    </tr>`;
  }).join('');
}

// ── Logs ────────────────────────────────────────────────────────────
async function loadLogs() {
  const level  = document.getElementById('filter-level').value;
  const source = document.getElementById('filter-source').value;
  const params = new URLSearchParams({ limit: 100 });
  if (level)  params.set('level', level);
  if (source) params.set('source', source);

  const res  = await fetch(`/api/logs?${params}`);
  const data = await res.json();
  const stream = document.getElementById('log-stream');
  stream.innerHTML = data.logs.map(log => logEntryHTML(log)).join('');
}

function prependLogEntry(log, animate = false) {
  if (!document.getElementById('page-logs').classList.contains('active')) return;
  const stream = document.getElementById('log-stream');
  const div = document.createElement('div');
  div.innerHTML = logEntryHTML(log, animate);
  stream.prepend(div.firstChild);
  if (stream.children.length > 200) stream.lastChild.remove();
}

function logEntryHTML(log, animate = false) {
  const t = new Date(log.timestamp).toLocaleTimeString();
  return `<div class="log-entry${animate ? ' new' : ''}">
    <span class="time">${t}</span>
    <span class="level level-${log.level}">${log.level}</span>
    <span class="source">${log.source}</span>
    <span class="msg">${log.message} ${log.ip ? '· ' + log.ip : ''}</span>
  </div>`;
}

document.getElementById('filter-level').addEventListener('change', loadLogs);
document.getElementById('filter-source').addEventListener('change', loadLogs);
document.getElementById('refresh-logs').addEventListener('click', loadLogs);

// ── Alerts ───────────────────────────────────────────────────────────
async function loadAlerts() {
  const res    = await fetch('/api/alerts');
  const alerts = await res.json();
  const list   = document.getElementById('alerts-list');

  if (alerts.length === 0) {
    list.innerHTML = '<div class="ai-placeholder">No alerts yet. Run an AI scan to detect anomalies.</div>';
    return;
  }
  list.innerHTML = alerts.map(alertHTML).join('');
  attachResolveHandlers();
}

function prependAlert(alert) {
  const list = document.getElementById('alerts-list');
  const div = document.createElement('div');
  div.innerHTML = alertHTML(alert);
  list.prepend(div.firstChild);
  attachResolveHandlers();
}

function alertHTML(alert) {
  const time = new Date(alert.createdAt).toLocaleString();
  return `<div class="alert-card ${alert.severity}${alert.resolved ? ' resolved' : ''}" id="alert-${alert._id}">
    <div class="alert-header">
      <span class="alert-title">${alert.title}</span>
      <span class="alert-severity sev-${alert.severity}">${alert.severity}</span>
    </div>
    <p class="alert-desc">${alert.description}</p>
    ${alert.aiAnalysis ? `<div class="alert-ai">🤖 ${alert.aiAnalysis}</div>` : ''}
    <div class="alert-footer">
      <span class="alert-meta">${alert.type} · ${time}</span>
      ${!alert.resolved ? `<button class="btn-resolve" data-id="${alert._id}">✓ Resolve</button>` : '<span style="color:#3fb950;font-size:12px">✓ Resolved</span>'}
    </div>
  </div>`;
}

function attachResolveHandlers() {
  document.querySelectorAll('.btn-resolve').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      await fetch(`/api/alerts/${id}/resolve`, { method: 'PATCH' });
      document.getElementById(`alert-${id}`).classList.add('resolved');
      btn.replaceWith(Object.assign(document.createElement('span'), { textContent: '✓ Resolved', style: 'color:#3fb950;font-size:12px' }));
    });
  });
}

document.getElementById('run-scan').addEventListener('click', async () => {
  const btn = document.getElementById('run-scan');
  btn.textContent = 'Scanning...';
  btn.disabled = true;
  await fetch('/api/alerts/scan', { method: 'POST' });
  await loadAlerts();
  btn.textContent = '⬡ Run AI Scan';
  btn.disabled = false;
});

function updateBadge() {
  const badge = document.getElementById('alert-badge');
  badge.textContent = alertCount;
  badge.classList.toggle('hidden', alertCount === 0);
}

// ── AI Analysis ──────────────────────────────────────────────────────
document.getElementById('get-summary').addEventListener('click', async () => {
  const output = document.getElementById('ai-output');
  output.innerHTML = '<div class="loading">Analyzing logs with Groq AI...</div>';

  const res  = await fetch('/api/ai/summary');
  const data = await res.json();

  output.innerHTML = `<div class="ai-card">
    <div class="ai-status status-${data.status}">${data.status}</div>
    <p class="ai-summary">${data.summary}</p>
    <ul class="ai-highlights">
      ${(data.highlights || []).map(h => `<li>${h}</li>`).join('')}
    </ul>
  </div>`;
});

// ── Init ─────────────────────────────────────────────────────────────
loadDashboard();
setInterval(loadDashboard, 30000);
