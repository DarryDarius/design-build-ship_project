import { buildPlans, clock, minutes } from './scheduler.js';

const $ = (s) => document.querySelector(s);
const key = 'parallel-days-v1';
const copy = (x) => structuredClone(x);
const uid = () => crypto.randomUUID();
const nextQuarter = () => { const d = new Date(); return clock(Math.min(1425, Math.ceil((d.getHours() * 60 + d.getMinutes()) / 15) * 15)); };
const fresh = () => { const start = nextQuarter(); return { start, end: clock(Math.min(1425, minutes(start) + 180)), fixed: [], protected: [], tasks: [{ id: uid(), title: '', duration: 45, required: true }], completed: [], sample: false }; };
const sample = () => ({ start: '14:45', end: '18:00', fixed: [{ id: uid(), title: 'Class', start: '16:00', end: '16:30' }], protected: [], tasks: [
  { id: uid(), title: 'Assignment', duration: 45, required: true }, { id: uid(), title: 'Project draft', duration: 90, required: false }, { id: uid(), title: 'Reading', duration: 60, required: false },
], completed: [], sample: true });
let input = fresh(), confirmed = null, draft = null, selected = 0, editingAfterConfirm = false;

function load() {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !data.confirmed?.plan?.blocks || !Array.isArray(data.confirmed?.input?.tasks)) throw new Error('Invalid saved plan');
    confirmed = data.confirmed;
    input = copy(confirmed.input);
    showConfirmed();
  } catch { try { localStorage.removeItem(key); } catch {} window.setTimeout(() => { const box = $('#results-notice'); box.textContent = 'The saved plan could not be read. Start a new day to make a new one.'; }, 0); }
}
function save(value) {
  try {
    const raw = JSON.stringify({ version: 1, confirmed: value });
    localStorage.setItem(key, raw);
    if (localStorage.getItem(key) !== raw) throw new Error('Save failed');
    return true;
  } catch { return false; }
}
function show(view) {
  for (const id of ['intro', 'editor', 'results', 'confirmed']) $(`#${id}`).hidden = id !== view;
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function showNotice(text) {
  const box = $('#results-notice'); box.textContent = text; box.hidden = false;
}
function field(label, type, value, onChange, options = {}) {
  const wrap = document.createElement('label'); wrap.textContent = label;
  const el = document.createElement('input'); el.type = type; el.value = value ?? '';
  if (type === 'number') { el.min = options.min ?? '15'; el.max = options.max ?? '240'; el.step = '15'; }
  if (type === 'time') el.step = '900';
  el.addEventListener('input', () => onChange(type === 'number' ? el.value : el.value));
  wrap.append(el); return wrap;
}
function action(label, title, click, className = 'remove') {
  const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.title = title; b.setAttribute('aria-label', title); b.className = className; b.addEventListener('click', click); return b;
}
function renderRows() {
  for (const kind of ['fixed', 'protected']) {
    const host = $(`#${kind}-list`); host.replaceChildren();
    input[kind].forEach((item) => {
      const row = document.createElement('div'); row.className = 'repeat-row';
      row.append(field('Name', 'text', item.title, v => item.title = v), field('Start', 'time', item.start, v => item.start = v), field('End', 'time', item.end, v => item.end = v), action('×', `Remove ${item.title || kind}`, () => { input[kind] = input[kind].filter(x => x.id !== item.id); renderRows(); }));
      host.append(row);
    });
    $(`[data-add="${kind}"]`).disabled = input[kind].length >= (kind === 'fixed' ? 3 : 2);
  }
  const host = $('#task-list'); host.replaceChildren();
  input.tasks.forEach((task, index) => {
    const row = document.createElement('div'); row.className = 'repeat-row task-row';
    row.append(field('Task', 'text', task.title, v => task.title = v), field('Minutes', 'number', task.duration, v => task.duration = v));
    const check = document.createElement('label'); check.className = 'check-label';
    const box = document.createElement('input'); box.type = 'checkbox'; box.checked = task.required; box.addEventListener('change', () => task.required = box.checked);
    check.append(box, 'Must do today'); row.append(check);
    const controls = document.createElement('div'); controls.className = 'order-controls';
    controls.append(action('↑', `Move ${task.title || 'task'} up`, () => moveTask(index, -1)), action('↓', `Move ${task.title || 'task'} down`, () => moveTask(index, 1)));
    controls.children[0].disabled = index === 0; controls.children[1].disabled = index === input.tasks.length - 1; row.append(controls);
    row.append(action('×', `Remove ${task.title || 'task'}`, () => { input.tasks.splice(index, 1); input.completed = input.completed.filter(id => id !== task.id); renderRows(); }));
    if (editingAfterConfirm) {
      const done = document.createElement('label'); done.className = 'check-label';
      const d = document.createElement('input'); d.type = 'checkbox'; d.checked = input.completed.includes(task.id); d.addEventListener('change', () => input.completed = d.checked ? [...input.completed, task.id] : input.completed.filter(id => id !== task.id));
      done.append(d, 'Actually finished'); row.append(done);
    }
    host.append(row);
  });
  $('[data-add="tasks"]').disabled = input.tasks.length >= 5;
}
function moveTask(i, direction) { const j = i + direction; if (j < 0 || j >= input.tasks.length) return; [input.tasks[i], input.tasks[j]] = [input.tasks[j], input.tasks[i]]; renderRows(); }
function edit() {
  draft = null; $('#form-error').hidden = true; $('#sample-banner').hidden = !input.sample;
  $('#saved-banner').hidden = !confirmed;
  $('#start-time').value = input.start; $('#end-time').value = input.end;
  renderRows(); show('editor');
}
function planLabel(plan) {
  return `Keep ${plan.kept.length ? plan.kept.map(t => t.title).join(', ') : 'the essentials'} · Defer ${plan.deferred.length ? plan.deferred.map(t => t.title).join(', ') : 'nothing'} · ${plan.open} minutes open.`;
}
function timeline(host, blocks) {
  host.replaceChildren();
  for (const b of blocks) {
    const li = document.createElement('li'); li.className = b.kind;
    const time = document.createElement('time'); time.textContent = `${clock(b.start)}–${clock(b.end)}`;
    const body = document.createElement('div'); const title = document.createElement('strong'); title.textContent = b.title;
    const detail = document.createElement('small'); detail.textContent = b.kind === 'task' ? (b.required ? 'Must do · planned time' : 'Can wait · planned time') : b.kind === 'fixed' ? 'Fixed commitment' : 'Protected time';
    body.append(title, detail); li.append(time, body); host.append(li);
  }
}
function showResults() {
  if (!draft) return edit();
  $('#results-notice').hidden = !draft.impossible.length;
  if (draft.impossible.length) showNotice(`Cannot fit today: ${draft.impossible.join(', ')}. They remain deferred in every option.`);
  $('#results-lead').textContent = draft.plans.length === 1 ? 'Only one meaningfully different arrangement fits these constraints.' : `${draft.available} usable minutes remain. Compare what each choice keeps and lets wait.`;
  const host = $('#option-list'); host.replaceChildren();
  draft.plans.forEach((p, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'option-card'; b.setAttribute('aria-pressed', String(i === selected));
    const top = document.createElement('span'); top.className = 'option-top'; top.textContent = `POSSIBILITY ${String(i + 1).padStart(2, '0')}`;
    const title = document.createElement('span'); title.className = 'option-title'; title.textContent = p.title;
    const facts = document.createElement('span'); facts.className = 'option-facts';
    for (const [label, value] of [['Keep', p.kept.map(t => t.title).join(', ') || 'The essentials'], ['Later', p.deferred.map(t => t.title).join(', ') || 'Nothing else']]) {
      const item = document.createElement('span'), strong = document.createElement('strong'); strong.textContent = label; item.append(strong, document.createTextNode(value)); facts.append(item);
    }
    const bottom = document.createElement('span'); bottom.className = 'option-bottom'; bottom.textContent = `${p.open} min open · ${p.required.length} must-do task${p.required.length === 1 ? '' : 's'}`;
    b.append(top, title, facts, bottom); b.addEventListener('click', () => { selected = i; showResults(); host.children[i].focus({ preventScroll: true }); }); host.append(b);
  });
  const p = draft.plans[selected] || draft.plans[0]; $('#detail-title').textContent = p.title; $('#detail-summary').textContent = planLabel(p); timeline($('#timeline'), p.blocks);
  if ($('#results').hidden) show('results');
}
function showConfirmed() {
  if (!confirmed) return show('intro');
  $('#confirmed .notice').textContent = confirmed.input.sample ? 'Fictional sample saved in this browser. Try your own day to make a personal plan.' : 'Saved in this browser only. Your tasks are scheduled, not automatically marked complete.';
  $('#confirmed-title').textContent = confirmed.plan.title;
  $('#confirmed-summary').textContent = planLabel(confirmed.plan);
  timeline($('#confirmed-timeline'), confirmed.plan.blocks);
  show('confirmed');
}

$('#start-own').addEventListener('click', () => { input = fresh(); editingAfterConfirm = false; edit(); });
$('#start-demo').addEventListener('click', () => { input = sample(); editingAfterConfirm = false; edit(); });
$('#clear-sample').addEventListener('click', () => { input = fresh(); edit(); });
$('#back-home').addEventListener('click', () => confirmed ? showConfirmed() : show('intro'));
$('#show-saved').addEventListener('click', showConfirmed);
$('#edit-plan').addEventListener('click', edit);
for (const b of document.querySelectorAll('[data-add]')) b.addEventListener('click', () => {
  const kind = b.dataset.add;
  if (kind === 'tasks') input.tasks.push({ id: uid(), title: '', duration: 45, required: false });
  else input[kind].push({ id: uid(), title: '', start: input.start, end: input.end });
  renderRows();
});
$('#plan-form').addEventListener('submit', (event) => {
  event.preventDefault(); input.start = $('#start-time').value; input.end = $('#end-time').value;
  try { draft = buildPlans(input); selected = 0; $('#form-error').hidden = true; showResults(); }
  catch (error) { const box = $('#form-error'); box.textContent = error.message; box.hidden = false; box.scrollIntoView({ block: 'center' }); }
});
$('#choose-plan').addEventListener('click', () => { const p = draft?.plans[selected]; if (!p) return; $('#dialog-summary').textContent = planLabel(p); $('#confirm-dialog').showModal(); });
$('#confirm-dialog').addEventListener('close', () => {
  if ($('#confirm-dialog').returnValue !== 'confirm' || !draft) return;
  const value = { input: copy(input), plan: copy(draft.plans[selected]), at: new Date().toISOString() };
  if (!save(value)) { showNotice('This browser could not save your plan. Please allow site storage and try again.'); return; }
  confirmed = value; editingAfterConfirm = false; showConfirmed();
});
$('#replan').addEventListener('click', () => {
  input = copy(confirmed.input);
  const now = nextQuarter();
  if (minutes(now) > minutes(input.start) && minutes(now) < minutes(input.end)) input.start = now;
  editingAfterConfirm = true; edit();
});
$('#view-alternatives').addEventListener('click', () => { input = copy(confirmed.input); draft = buildPlans(input); selected = draft.plans.findIndex(p => p.title === confirmed.plan.title); if (selected < 0) selected = 0; showResults(); });
$('#new-day').addEventListener('click', () => { input = fresh(); editingAfterConfirm = false; edit(); });
load();
