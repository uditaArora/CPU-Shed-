/* ============================================================
   script.js — Simulator Logic (used by simulator.html)
   ============================================================ */
let processes = [], colorIndex = 0;
let chartWT = null, chartTAT = null, chartCPU = null;
const COLORS = ['--c0','--c1','--c2','--c3','--c4','--c5','--c6','--c7','--c8','--c9'];
const ALGO_DESC = {
  fcfs: '<strong>FCFS</strong> — Processes run in arrival order. Simple but can cause the "convoy effect" where short jobs wait behind long ones.',
  sjf:  '<strong>SJF</strong> — Picks the shortest burst time next. Minimises average waiting time but can starve long processes.',
  rr:   '<strong>Round Robin</strong> — Each process gets a fixed quantum. Excellent for time-sharing systems.',
  priority: '<strong>Priority Scheduling</strong> — Selects the highest-priority (lowest number) process. Can starve low-priority jobs.'
};
const PRESETS = {
  simple:  [{pid:'P1',arrival:0,burst:8,priority:2},{pid:'P2',arrival:2,burst:4,priority:1},{pid:'P3',arrival:4,burst:2,priority:3}],
  medium:  [{pid:'P1',arrival:0,burst:6,priority:3},{pid:'P2',arrival:1,burst:4,priority:1},{pid:'P3',arrival:2,burst:8,priority:4},{pid:'P4',arrival:3,burst:3,priority:2},{pid:'P5',arrival:5,burst:2,priority:1}],
  complex: [{pid:'P1',arrival:0,burst:10,priority:3},{pid:'P2',arrival:1,burst:3,priority:1},{pid:'P3',arrival:2,burst:6,priority:4},{pid:'P4',arrival:3,burst:1,priority:2},{pid:'P5',arrival:5,burst:5,priority:5},{pid:'P6',arrival:6,burst:2,priority:1}]
};

function getCssColor(i) { return getComputedStyle(document.documentElement).getPropertyValue(COLORS[i % 10]).trim(); }
function toast(msg, type='info') {
  const c = document.getElementById('toast-container');
  if (!c) return;
  const t = document.createElement('div'); t.className = `toast ${type}`; t.textContent = msg;
  c.appendChild(t); setTimeout(() => t.remove(), 3200);
}
function showError(msg) { toast('⚠ ' + msg, 'error'); }
function showSuccess(msg) { toast('✓ ' + msg, 'success'); }

// Algorithm card click
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.algo-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.algo-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      card.querySelector('input[type=radio]').checked = true;
      onAlgoChange();
    });
  });
  onAlgoChange();
});

function getAlgo() { const r = document.querySelector('input[name=algo]:checked'); return r ? r.value : 'fcfs'; }
function syncQuantum(v) { document.getElementById('inp-quantum').value = v; }
function syncQuantumRange(v) { document.getElementById('inp-quantum-range').value = v; }

function onAlgoChange() {
  const algo = getAlgo();
  const qf = document.getElementById('quantum-field');
  const pf = document.getElementById('priority-field');
  const tp = document.getElementById('th-priority');
  if (qf) qf.classList.toggle('hidden', algo !== 'rr');
  if (pf) pf.classList.toggle('hidden', algo !== 'priority');
  if (tp) tp.classList.toggle('hidden', algo !== 'priority');
  document.querySelectorAll('.col-priority').forEach(el => el.classList.toggle('hidden', algo !== 'priority'));
  const ad = document.getElementById('algo-desc');
  if (ad) ad.innerHTML = ALGO_DESC[algo] || '';
  const sp = document.getElementById('stat-algo-pill');
  if (sp) sp.textContent = algo.toUpperCase();
  renderProcessTable();
}

function autoGenerate() {
  const countEl = document.getElementById('autogen-count');
  const count = Math.max(2, Math.min(12, parseInt(countEl?.value || 5, 10)));
  resetAll(true);
  const algo = getAlgo();
  for (let i = 0; i < count; i++) {
    processes.push({
      pid: 'P' + (i + 1),
      arrival: Math.floor(Math.random() * 8),
      burst: Math.floor(Math.random() * 9) + 1,
      priority: Math.floor(Math.random() * 5) + 1,
      color: getCssColor(colorIndex++)
    });
  }
  renderProcessTable();
  showSuccess(`Generated ${count} random processes!`);
}

function loadPreset(name) {
  resetAll(true);
  const data = PRESETS[name];
  if (!data) return;
  colorIndex = 0;
  data.forEach(p => processes.push({ ...p, color: getCssColor(colorIndex++) }));
  renderProcessTable();
  showSuccess(`Loaded "${name}" preset.`);
}

function addProcess() {
  const pid = document.getElementById('inp-pid')?.value.trim();
  const arrival = document.getElementById('inp-arrival')?.value.trim();
  const burst = document.getElementById('inp-burst')?.value.trim();
  const prioRaw = document.getElementById('inp-priority')?.value.trim();
  const algo = getAlgo();
  if (!pid) return showError('Enter a Process ID.');
  if (arrival === '') return showError('Enter an Arrival Time.');
  if (burst === '') return showError('Enter a Burst Time.');
  const at = parseInt(arrival, 10), bt = parseInt(burst, 10);
  if (isNaN(at) || at < 0) return showError('Arrival Time must be ≥ 0.');
  if (isNaN(bt) || bt < 1) return showError('Burst Time must be ≥ 1.');
  if (processes.some(p => p.pid === pid)) return showError(`PID "${pid}" already exists.`);
  let priority = 1;
  if (algo === 'priority') {
    if (!prioRaw) return showError('Enter a Priority value.');
    priority = parseInt(prioRaw, 10);
    if (isNaN(priority) || priority < 1) return showError('Priority must be ≥ 1.');
  }
  processes.push({ pid, arrival: at, burst: bt, priority, color: getCssColor(colorIndex++) });
  renderProcessTable();
  ['inp-pid','inp-arrival','inp-burst','inp-priority'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('inp-pid')?.focus();
}

function deleteProcess(i) { processes.splice(i, 1); renderProcessTable(); }

function renderProcessTable() {
  const tbody = document.getElementById('process-tbody');
  const empty = document.getElementById('table-empty');
  const isPrio = getAlgo() === 'priority';
  if (!tbody) return;
  tbody.innerHTML = '';
  const sc = document.getElementById('stat-proc-count');
  if (sc) sc.textContent = processes.length;
  if (!processes.length) { if (empty) empty.classList.remove('hidden'); return; }
  if (empty) empty.classList.add('hidden');
  processes.forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="pid-cell"><span class="pid-dot" style="background:${p.color}"></span>${p.pid}</td>
      <td>${p.arrival}</td><td>${p.burst}</td>
      <td class="col-priority${isPrio ? '' : ' hidden'}">${p.priority}</td>
      <td><button class="btn-del" onclick="deleteProcess(${i})">✕</button></td>`;
    tbody.appendChild(tr);
  });
}

function runScheduler() {
  if (!processes.length) return showError('Add at least one process first.');
  const algo = getAlgo();
  let timeline = [], results = [];
  if (algo === 'fcfs') ({timeline, results} = fcfs());
  else if (algo === 'sjf') ({timeline, results} = sjf());
  else if (algo === 'rr') ({timeline, results} = roundRobin());
  else if (algo === 'priority') ({timeline, results} = priorityScheduling());
  renderStats(timeline, results);
  renderGantt(timeline);
  renderCharts(results);
  renderMetrics(results);
  const sec = document.getElementById('results-section');
  sec.classList.remove('hidden');
  setTimeout(() => sec.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  showSuccess('Scheduling complete! 🎉');
}

// ── ALGORITHMS ────────────────────────────────────────────
function fcfs() {
  const sorted = [...processes].sort((a, b) => a.arrival - b.arrival);
  const timeline = [], results = []; let clock = 0;
  for (const p of sorted) {
    if (clock < p.arrival) { timeline.push({pid:'Idle',start:clock,end:p.arrival,color:null}); clock = p.arrival; }
    const start = clock, end = clock + p.burst;
    timeline.push({pid:p.pid,start,end,color:p.color});
    results.push({pid:p.pid,arrival:p.arrival,burst:p.burst,completion:end,turnaround:end-p.arrival,waiting:end-p.arrival-p.burst,response:start-p.arrival,color:p.color});
    clock = end;
  }
  return {timeline, results};
}

function sjf() {
  const rem = processes.map(p => ({...p}));
  const timeline = [], results = []; let clock = 0, done = 0;
  while (done < rem.length) {
    const ready = rem.filter(p => p.arrival <= clock && !p.completed);
    if (!ready.length) {
      const next = Math.min(...rem.filter(p => !p.completed).map(p => p.arrival));
      timeline.push({pid:'Idle',start:clock,end:next,color:null}); clock = next; continue;
    }
    ready.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival);
    const p = ready[0]; const start = clock, end = clock + p.burst;
    timeline.push({pid:p.pid,start,end,color:p.color});
    results.push({pid:p.pid,arrival:p.arrival,burst:p.burst,completion:end,turnaround:end-p.arrival,waiting:end-p.arrival-p.burst,response:start-p.arrival,color:p.color});
    rem.find(r => r.pid === p.pid).completed = true; clock = end; done++;
  }
  return {timeline, results};
}

function roundRobin() {
  const quantum = parseInt(document.getElementById('inp-quantum')?.value || '2', 10) || 2;
  const procs = processes.map(p => ({...p, remaining:p.burst, completed:false, firstRun:-1}));
  procs.sort((a, b) => a.arrival - b.arrival);
  const timeline = [], queue = []; let clock = 0, done = 0, nextCheck = 0;
  while (nextCheck < procs.length && procs[nextCheck].arrival <= clock) queue.push(nextCheck++);
  while (done < procs.length) {
    if (!queue.length) {
      if (nextCheck >= procs.length) break;
      const next = procs[nextCheck].arrival;
      timeline.push({pid:'Idle',start:clock,end:next,color:null}); clock = next;
      while (nextCheck < procs.length && procs[nextCheck].arrival <= clock) queue.push(nextCheck++);
      continue;
    }
    const idx = queue.shift(), p = procs[idx];
    if (p.firstRun < 0) p.firstRun = clock;
    const run = Math.min(quantum, p.remaining);
    timeline.push({pid:p.pid,start:clock,end:clock+run,color:p.color});
    clock += run; p.remaining -= run;
    while (nextCheck < procs.length && procs[nextCheck].arrival <= clock) queue.push(nextCheck++);
    if (!p.remaining) { p.completed = true; p.completion = clock; done++; }
    else queue.push(idx);
  }
  const results = procs.map(p => ({pid:p.pid,arrival:p.arrival,burst:p.burst,completion:p.completion,turnaround:p.completion-p.arrival,waiting:p.completion-p.arrival-p.burst,response:p.firstRun-p.arrival,color:p.color}));
  return {timeline, results};
}

function priorityScheduling() {
  const rem = processes.map(p => ({...p}));
  const timeline = [], results = []; let clock = 0, done = 0;
  while (done < rem.length) {
    const ready = rem.filter(p => p.arrival <= clock && !p.completed);
    if (!ready.length) {
      const next = Math.min(...rem.filter(p => !p.completed).map(p => p.arrival));
      timeline.push({pid:'Idle',start:clock,end:next,color:null}); clock = next; continue;
    }
    ready.sort((a, b) => a.priority - b.priority || a.arrival - b.arrival);
    const p = ready[0]; const start = clock, end = clock + p.burst;
    timeline.push({pid:p.pid,start,end,color:p.color});
    results.push({pid:p.pid,arrival:p.arrival,burst:p.burst,completion:end,turnaround:end-p.arrival,waiting:end-p.arrival-p.burst,response:start-p.arrival,color:p.color});
    rem.find(r => r.pid === p.pid).completed = true; clock = end; done++;
  }
  return {timeline, results};
}

// ── RENDER ────────────────────────────────────────────────
function renderStats(timeline, results) {
  const n = results.length;
  const totalTime = timeline[timeline.length-1]?.end || 0;
  const idleTime = timeline.filter(s => s.pid === 'Idle').reduce((a, s) => a + (s.end - s.start), 0);
  const cpuUtil = totalTime ? (((totalTime-idleTime)/totalTime)*100).toFixed(1) : 0;
  const avgWT  = (results.reduce((a, r) => a + r.waiting, 0) / n).toFixed(2);
  const avgTAT = (results.reduce((a, r) => a + r.turnaround, 0) / n).toFixed(2);
  const throughput = totalTime ? (n / totalTime).toFixed(3) : 0;
  document.getElementById('stats-row').innerHTML = `
    <div class="stat-card card-pink"><span class="stat-card-label">Avg Waiting Time</span><span class="stat-card-value">${avgWT}</span><span class="stat-card-unit">time units</span></div>
    <div class="stat-card card-purple"><span class="stat-card-label">Avg Turnaround</span><span class="stat-card-value">${avgTAT}</span><span class="stat-card-unit">time units</span></div>
    <div class="stat-card card-green"><span class="stat-card-label">CPU Utilization</span><span class="stat-card-value">${cpuUtil}%</span><span class="stat-card-unit">of total time</span></div>
    <div class="stat-card card-amber"><span class="stat-card-label">Throughput</span><span class="stat-card-value">${throughput}</span><span class="stat-card-unit">proc / time unit</span></div>`;
}

function renderGantt(timeline) {
  const chart = document.getElementById('gantt-chart');
  const axis  = document.getElementById('gantt-axis');
  const legend = document.getElementById('gantt-legend');
  chart.innerHTML = axis.innerHTML = legend.innerHTML = '';
  if (!timeline.length) return;
  const totalTime = timeline[timeline.length-1].end;
  const seen = new Set();
  timeline.forEach((seg, idx) => {
    const pct = Math.max(((seg.end-seg.start)/totalTime)*100, 1.5);
    const isIdle = seg.pid === 'Idle';
    const block = document.createElement('div');
    block.className = 'gantt-block' + (isIdle ? ' idle' : '');
    block.style.width = pct + '%';
    block.style.animationDelay = (idx * 0.04) + 's';
    if (!isIdle) { block.style.background = seg.color; block.style.boxShadow = `0 2px 12px ${seg.color}55`; }
    block.textContent = seg.pid;
    block.setAttribute('data-tip', `${seg.pid} [${seg.start}→${seg.end}] (${seg.end-seg.start}u)`);
    chart.appendChild(block);
    if (!isIdle && !seen.has(seg.pid)) {
      seen.add(seg.pid);
      const li = document.createElement('div'); li.className = 'legend-item';
      li.innerHTML = `<span class="legend-dot" style="background:${seg.color}"></span>${seg.pid}`;
      legend.appendChild(li);
    }
  });
  [...new Set(timeline.flatMap(s => [s.start, s.end]))].sort((a,b)=>a-b).forEach(t => {
    const span = document.createElement('span'); span.className = 'gantt-tick';
    span.textContent = t; span.style.left = (t/totalTime*100)+'%';
    axis.appendChild(span);
  });
}

function renderCharts(results) {
  const labels = results.map(r => r.pid);
  const wt  = results.map(r => r.waiting);
  const tat = results.map(r => r.turnaround);
  const colors = results.map(r => r.color || '#ec4899');
  const totalTime = Math.max(...results.map(r => r.completion));
  const activeBurst = results.reduce((a,r)=>a+r.burst,0);
  const opts = { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
    scales:{x:{ticks:{color:'#9ca3af',font:{family:'JetBrains Mono',size:11}},grid:{color:'rgba(236,72,153,.08)'}},y:{ticks:{color:'#9ca3af',font:{family:'JetBrains Mono',size:11}},grid:{color:'rgba(236,72,153,.08)'},beginAtZero:true}}};
  if (chartWT)  {chartWT.destroy();  chartWT=null;}
  if (chartTAT) {chartTAT.destroy(); chartTAT=null;}
  if (chartCPU) {chartCPU.destroy(); chartCPU=null;}
  chartWT = new Chart(document.getElementById('chart-waiting'), {type:'bar', data:{labels, datasets:[{data:wt, backgroundColor:colors.map(c=>c+'99'), borderColor:colors, borderWidth:2, borderRadius:8}]}, options:opts});
  chartTAT = new Chart(document.getElementById('chart-turnaround'), {type:'bar', data:{labels, datasets:[{data:tat, backgroundColor:colors.map(c=>c+'99'), borderColor:colors, borderWidth:2, borderRadius:8}]}, options:opts});
  chartCPU = new Chart(document.getElementById('chart-cpu'), {type:'doughnut', data:{
    labels:['CPU Active','Idle'], datasets:[{data:[activeBurst, Math.max(totalTime-activeBurst,0)], backgroundColor:['rgba(236,72,153,.8)','rgba(236,72,153,.1)'], borderColor:['#ec4899','rgba(236,72,153,.2)'], borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'70%',plugins:{legend:{display:true,position:'bottom',labels:{color:'#6b7280',font:{size:11},boxWidth:12}}}}});
}

function renderMetrics(results) {
  const tbody = document.getElementById('metrics-tbody'); tbody.innerHTML = '';
  let totalWT=0, totalTAT=0;
  const maxWT = Math.max(...results.map(r=>r.waiting), 1);
  results.forEach(r => {
    totalWT+=r.waiting; totalTAT+=r.turnaround;
    const pct = Math.round((r.waiting/maxWT)*80)+4;
    const tr = document.createElement('tr');
    tr.innerHTML=`<td class="pid-cell"><span class="pid-dot" style="background:${r.color||'#ec4899'}"></span>${r.pid}</td><td>${r.arrival}</td><td>${r.burst}</td><td>${r.completion}</td><td style="color:var(--secondary);font-weight:700">${r.turnaround}</td><td style="color:var(--primary);font-weight:700">${r.waiting}</td><td style="color:var(--amber);font-weight:700">${r.response??'-'}</td><td><div class="mini-bar-wrap"><div class="mini-bar" style="width:${pct}px"></div></div></td>`;
    tbody.appendChild(tr);
  });
  const n=results.length;
  document.getElementById('averages-box').innerHTML=`
    <div class="avg-card"><span class="avg-label">Avg Waiting</span><span class="avg-value">${(totalWT/n).toFixed(2)}</span><span class="avg-unit">time units</span></div>
    <div class="avg-card"><span class="avg-label">Avg Turnaround</span><span class="avg-value">${(totalTAT/n).toFixed(2)}</span><span class="avg-unit">time units</span></div>
    <div class="avg-card"><span class="avg-label">Processes</span><span class="avg-value">${n}</span><span class="avg-unit">total</span></div>`;
}

function resetAll(silent=false) {
  processes=[]; colorIndex=0; renderProcessTable();
  const rs = document.getElementById('results-section');
  if (rs) rs.classList.add('hidden');
  ['gantt-chart','gantt-axis','gantt-legend','metrics-tbody','averages-box','stats-row'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML='';});
  ['inp-pid','inp-arrival','inp-burst','inp-priority'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const iq=document.getElementById('inp-quantum'); if(iq)iq.value='2';
  const iqr=document.getElementById('inp-quantum-range'); if(iqr)iqr.value='2';
  if(chartWT){chartWT.destroy();chartWT=null;} if(chartTAT){chartTAT.destroy();chartTAT=null;} if(chartCPU){chartCPU.destroy();chartCPU=null;}
  if(!silent) showSuccess('Reset complete.');
}

onAlgoChange();