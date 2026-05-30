/* ============================================================
   learn.js — Step-by-step algorithm simulations
   ============================================================ */

// Sample data for learn simulations
const LEARN_DATA = [
  {pid:'P1', arrival:0, burst:6, priority:3, color:'#ec4899'},
  {pid:'P2', arrival:2, burst:2, priority:1, color:'#a855f7'},
  {pid:'P3', arrival:4, burst:8, priority:4, color:'#f43f5e'},
  {pid:'P4', arrival:5, burst:3, priority:2, color:'#06b6d4'},
];

// State per algorithm
const state = {};

function initState(algo) {
  const quantum = algo === 'rr' ? parseInt(document.getElementById('rr-quantum')?.value || '2', 10) : 2;
  const procs = LEARN_DATA.map(p => ({...p, remaining: p.burst, completed: false, firstRun: -1, completion: 0}));
  state[algo] = {
    procs, quantum, clock: 0, done: 0,
    timeline: [], queue: [], nextCheck: 0,
    stepCount: 0, autoTimer: null,
    // for RR: init queue
  };
  if (algo === 'rr') {
    procs.sort((a,b) => a.arrival - b.arrival);
    const s = state[algo];
    while (s.nextCheck < procs.length && procs[s.nextCheck].arrival <= s.clock) s.queue.push(s.nextCheck++);
  }
  renderLearnUI(algo);
  clearLog(algo);
  addLog(algo, 0, 'Simulation ready. Press "Next Step" to begin.');
}

function showAlgo(algo, btn) {
  document.querySelectorAll('.algo-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.algo-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('section-' + algo)?.classList.add('active');
  btn.classList.add('active');
  if (!state[algo]) initState(algo);
}

function learnReset(algo) {
  const s = state[algo];
  if (s?.autoTimer) { clearInterval(s.autoTimer); s.autoTimer = null; }
  state[algo] = null;
  initState(algo);
}

function learnAuto(algo) {
  const s = state[algo] || (initState(algo), state[algo]);
  if (s.autoTimer) { clearInterval(s.autoTimer); s.autoTimer = null; return; }
  s.autoTimer = setInterval(() => {
    const finished = learnStep(algo);
    if (finished) { clearInterval(s.autoTimer); s.autoTimer = null; }
  }, 900);
}

function learnStep(algo) {
  if (!state[algo]) initState(algo);
  if (algo === 'fcfs') return stepFCFS();
  if (algo === 'sjf')  return stepSJF();
  if (algo === 'rr')   return stepRR();
  if (algo === 'priority') return stepPriority();
}

// ── FCFS ──────────────────────────────────────────────────
function stepFCFS() {
  const s = state['fcfs'];
  if (s.done >= s.procs.length) { addLog('fcfs', s.clock, '✅ All processes completed!'); return true; }
  const sorted = [...s.procs].sort((a,b) => a.arrival - b.arrival);
  const pending = sorted.filter(p => !p.completed);
  const p = pending[0];
  if (s.clock < p.arrival) {
    addLog('fcfs', s.clock, `CPU idle — next process ${p.pid} arrives at t=${p.arrival}`);
    s.timeline.push({pid:'Idle', start:s.clock, end:p.arrival, color:null});
    s.clock = p.arrival;
  } else {
    addLog('fcfs', s.clock, `▶ Running ${p.pid} (burst=${p.burst}) until t=${s.clock+p.burst}`);
    s.timeline.push({pid:p.pid, start:s.clock, end:s.clock+p.burst, color:p.color});
    s.clock += p.burst;
    p.completed = true; p.completion = s.clock;
    s.done++;
    addLog('fcfs', s.clock, `✓ ${p.pid} finished. TAT=${p.completion-p.arrival}, WT=${p.completion-p.arrival-p.burst}`);
  }
  renderLearnUI('fcfs');
  if (s.done >= s.procs.length) { addLog('fcfs', s.clock, '🎉 All done!'); return true; }
  return false;
}

// ── SJF ───────────────────────────────────────────────────
function stepSJF() {
  const s = state['sjf'];
  if (s.done >= s.procs.length) { addLog('sjf', s.clock, '✅ All processes completed!'); return true; }
  const ready = s.procs.filter(p => p.arrival <= s.clock && !p.completed);
  if (!ready.length) {
    const next = Math.min(...s.procs.filter(p => !p.completed).map(p => p.arrival));
    addLog('sjf', s.clock, `CPU idle — waiting for next arrival at t=${next}`);
    s.timeline.push({pid:'Idle', start:s.clock, end:next, color:null});
    s.clock = next;
  } else {
    ready.sort((a,b) => a.burst - b.burst || a.arrival - b.arrival);
    const p = ready[0];
    const readyPids = ready.map(r => `${r.pid}(${r.burst})`).join(', ');
    addLog('sjf', s.clock, `Ready: [${readyPids}] → Picked shortest: ${p.pid}(${p.burst})`);
    s.timeline.push({pid:p.pid, start:s.clock, end:s.clock+p.burst, color:p.color});
    s.clock += p.burst;
    p.completed = true; p.completion = s.clock;
    s.done++;
    addLog('sjf', s.clock, `✓ ${p.pid} done. TAT=${p.completion-p.arrival}, WT=${p.completion-p.arrival-p.burst}`);
  }
  renderLearnUI('sjf');
  if (s.done >= s.procs.length) { addLog('sjf', s.clock, '🎉 All done!'); return true; }
  return false;
}

// ── RR ────────────────────────────────────────────────────
function stepRR() {
  const s = state['rr'];
  if (s.done >= s.procs.length) { addLog('rr', s.clock, '✅ All processes completed!'); return true; }
  const procs = s.procs;
  if (!s.queue.length) {
    if (s.nextCheck >= procs.length) { addLog('rr', s.clock, '✅ All done!'); return true; }
    const next = procs[s.nextCheck].arrival;
    s.timeline.push({pid:'Idle', start:s.clock, end:next, color:null});
    addLog('rr', s.clock, `Queue empty. CPU idle until t=${next}`);
    s.clock = next;
    while (s.nextCheck < procs.length && procs[s.nextCheck].arrival <= s.clock) s.queue.push(s.nextCheck++);
  } else {
    const idx = s.queue.shift(), p = procs[idx];
    if (p.firstRun < 0) p.firstRun = s.clock;
    const run = Math.min(s.quantum, p.remaining);
    s.timeline.push({pid:p.pid, start:s.clock, end:s.clock+run, color:p.color});
    addLog('rr', s.clock, `▶ ${p.pid} runs for ${run}u (remaining before: ${p.remaining})`);
    s.clock += run; p.remaining -= run;
    while (s.nextCheck < procs.length && procs[s.nextCheck].arrival <= s.clock) s.queue.push(s.nextCheck++);
    if (!p.remaining) {
      p.completed = true; p.completion = s.clock; s.done++;
      addLog('rr', s.clock, `✓ ${p.pid} completed! TAT=${p.completion-p.arrival}, WT=${p.completion-p.arrival-p.burst}`);
    } else {
      s.queue.push(idx);
      addLog('rr', s.clock, `⟳ ${p.pid} still has ${p.remaining}u left → back of queue`);
    }
  }
  renderLearnUI('rr');
  if (s.done >= s.procs.length) { addLog('rr', s.clock, '🎉 All done!'); return true; }
  return false;
}

// ── Priority ──────────────────────────────────────────────
function stepPriority() {
  const s = state['priority'];
  if (s.done >= s.procs.length) { addLog('priority', s.clock, '✅ All processes completed!'); return true; }
  const ready = s.procs.filter(p => p.arrival <= s.clock && !p.completed);
  if (!ready.length) {
    const next = Math.min(...s.procs.filter(p => !p.completed).map(p => p.arrival));
    s.timeline.push({pid:'Idle', start:s.clock, end:next, color:null});
    addLog('priority', s.clock, `CPU idle — next arrival at t=${next}`);
    s.clock = next;
  } else {
    ready.sort((a,b) => a.priority - b.priority || a.arrival - b.arrival);
    const p = ready[0];
    const readyPids = ready.map(r => `${r.pid}(P${r.priority})`).join(', ');
    addLog('priority', s.clock, `Ready: [${readyPids}] → Highest priority: ${p.pid} (P${p.priority})`);
    s.timeline.push({pid:p.pid, start:s.clock, end:s.clock+p.burst, color:p.color});
    s.clock += p.burst;
    p.completed = true; p.completion = s.clock;
    s.done++;
    addLog('priority', s.clock, `✓ ${p.pid} done. TAT=${p.completion-p.arrival}, WT=${p.completion-p.arrival-p.burst}`);
  }
  renderLearnUI('priority');
  if (s.done >= s.procs.length) { addLog('priority', s.clock, '🎉 All done!'); return true; }
  return false;
}

// ── RENDER LEARN UI ───────────────────────────────────────
function renderLearnUI(algo) {
  const s = state[algo];
  if (!s) return;

  // Clock
  const clockEl = document.getElementById(algo + '-clock');
  if (clockEl) clockEl.textContent = s.clock;

  // Bubbles
  const bubbles = document.getElementById(algo + '-bubbles');
  if (bubbles) {
    bubbles.innerHTML = '';
    // current running pid from last timeline entry
    const lastSeg = s.timeline[s.timeline.length - 1];
    const runningPid = lastSeg && lastSeg.pid !== 'Idle' ? lastSeg.pid : null;

    s.procs.forEach(p => {
      const div = document.createElement('div');
      div.className = 'proc-bubble';
      if (p.pid === runningPid && !p.completed) div.classList.add('running');
      else if (p.completed) div.classList.add('done');
      else if (p.arrival <= s.clock) div.classList.add('waiting');
      div.style.background = p.completed ? '#9ca3af' : p.color;
      const extraInfo = algo === 'rr' ? `${p.remaining}u` : (algo === 'priority' ? `P${p.priority}` : `${p.burst}u`);
      div.innerHTML = `${p.pid}<span class="bub-sub">${extraInfo}</span>`;
      div.title = `${p.pid}: arrival=${p.arrival}, burst=${p.burst}${algo==='priority'?', prio='+p.priority:''}`;
      bubbles.appendChild(div);
    });
  }

  // Mini Gantt
  const gantt = document.getElementById(algo + '-gantt');
  if (gantt && s.timeline.length) {
    gantt.innerHTML = '';
    const total = s.timeline[s.timeline.length-1].end;
    s.timeline.forEach(seg => {
      const div = document.createElement('div');
      const pct = Math.max(((seg.end - seg.start) / total) * 100, 2);
      div.className = 'gantt-mini-block' + (seg.pid === 'Idle' ? ' idle' : '');
      div.style.width = pct + '%';
      if (seg.pid !== 'Idle') div.style.background = seg.color;
      div.textContent = seg.pid;
      div.title = `${seg.pid} [${seg.start}→${seg.end}]`;
      gantt.appendChild(div);
    });
  }
}

function addLog(algo, clock, msg) {
  const log = document.getElementById(algo + '-log');
  if (!log) return;
  const div = document.createElement('div');
  div.className = 'log-entry';
  div.innerHTML = `<span class="log-time">t=${clock}</span><span class="log-msg">${msg}</span>`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function clearLog(algo) {
  const log = document.getElementById(algo + '-log');
  if (log) log.innerHTML = '';
}

// Initialize FCFS on load
document.addEventListener('DOMContentLoaded', () => {
  initState('fcfs');
});
