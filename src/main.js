import { buildPlans, clock, minutes, timelineDetails } from './scheduler.js';
import { changeSummary, openLabel, renderTimeline, timeLabel } from './timeline.js';

const $ = selector => document.querySelector(selector);
const storageKey = 'parallel-days-v1';
const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const minuteNow = (d = new Date()) => d.getHours() * 60 + d.getMinutes();
const task = (title = '', duration = 45, required = false) => ({ id: crypto.randomUUID(), title, duration, required });

function fresh() {
  const now = new Date();
  const start = minuteNow(now);
  return {
    day: localDay(now), start: clock(start), end: clock(Math.min(1439, start + 180)),
    fixed: [], protected: [], tasks: [task('', 45, true)], completed: [], sample: false,
  };
}

function sample() {
  return {
    day: localDay(), start: '14:00', end: '18:00', sample: true,
    fixed: [{ id: crypto.randomUUID(), title: 'Class', start: '16:00', end: '16:30' }],
    protected: [], completed: [],
    tasks: [task('Assignment', 45, true), task('Project draft', 90), task('Reading', 60)],
  };
}

let input = fresh();
let confirmed = { personal: null, sample: null };
let stored = null;
let draft = null;
let selected = 0;
let startNow = true;
let editingPrior = false;
let saving = false;
const mode = () => input.sample ? 'sample' : 'personal';
const savedPlan = () => confirmed[mode()];

function show(view) {
  for (const id of ['intro', 'editor', 'results', 'confirmed']) {
    $(`#${id}`).hidden = id !== view;
  }
  window.scrollTo(0, 0);
  $(`#${view}-title`).focus({ preventScroll: true });
}

function notice(selector, message) {
  const box = $(selector);
  box.textContent = message;
  box.hidden = !message;
}

function restorePlan(saved, plan) {
  if (!Array.isArray(plan.blocks) || !plan.blocks.every(block =>
    block && Number.isInteger(block.start) && Number.isInteger(block.end) &&
    block.end > block.start && ['task', 'fixed', 'protected'].includes(block.kind))) {
    throw new Error('Invalid saved blocks');
  }
  const { plans, start, end } = buildPlans(saved);
  const timing = timelineDetails(plan.blocks, start, end);
  const tasks = timing.blocks.filter(block => block.kind === 'task');
  const fixed = timing.blocks.filter(block => block.kind !== 'task');
  const ids = new Set(tasks.map(block => block.id));
  const choice = plans.find(candidate => {
    const expected = [...candidate.required, ...candidate.kept];
    return expected.length === tasks.length && expected.length === ids.size &&
      expected.every(task => ids.has(task.id));
  });
  const baseline = plans[0].blocks.filter(block => block.kind !== 'task');
  if (!choice || timing.blocks.some((block, index) => index && block.start < timing.blocks[index - 1].end) ||
      plan.blocks.filter(block => block.kind === 'task').some(block => block.start < start || block.end > end) ||
      baseline.length !== fixed.length || baseline.some((block, index) =>
        ['id', 'title', 'kind', 'start', 'end'].some(key => block[key] !== fixed[index][key]))) {
    throw new Error('Saved blocks do not match the plan');
  }
  const expected = new Map([...choice.required, ...choice.kept].map(task => [task.id, task]));
  if (tasks.some(block => {
    const task = expected.get(block.id);
    return task.title !== block.title || task.required !== block.required || task.duration !== block.end - block.start;
  })) throw new Error('Saved tasks do not match the plan');
  return { ...choice, ...timing };
}

function load() {
  try {
    stored = localStorage.getItem(storageKey);
    if (!stored) return;
    const data = JSON.parse(stored);
    const value = data?.confirmed;
    if (![1, 2].includes(data?.version) || !value?.input || !value?.plan) throw new Error();
    const { input: saved, plan } = value;
    if (saved.sample === true) return;
    if (saved.sample !== false && saved.sample !== undefined) throw new Error('Invalid plan type');
    saved.sample = false;
    saved.day ||= localDay(new Date(value.at));
    saved.completed ??= [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(saved.day) ||
        !['tasks', 'fixed', 'protected', 'completed'].every(key => Array.isArray(saved[key]))) {
      throw new Error();
    }
    value.plan = restorePlan(saved, plan);
    if (typeof value.lastChange?.time !== 'string' || typeof value.lastChange?.tasks !== 'string') delete value.lastChange;
    confirmed.personal = value;
    input = structuredClone(saved);
    showConfirmed();
  } catch {
    confirmed.personal = null;
    notice('#load-error', 'Your saved plan could not be opened. You can still make a new plan.');
  }
}

function savePersonal(value) {
  function write() {
    if (value.input.day !== localDay()) throw new Error('This draft is from an earlier day. Return home to start today’s plan.');
    if (localStorage.getItem(storageKey) !== stored) {
      throw new Error('The saved plan changed in another tab. Reload this page to open the latest plan.');
    }
    const next = JSON.stringify({ version: 2, confirmed: value });
    localStorage.setItem(storageKey, next);
    stored = next;
  }
  return navigator.locks ? navigator.locks.request(storageKey, write) : write();
}

function button(label, accessibleName, click, className = 'text-button') {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = label;
  if (accessibleName) el.setAttribute('aria-label', accessibleName);
  el.className = className;
  el.addEventListener('click', click);
  return el;
}

function field(label, type, value, onChange) {
  const wrap = document.createElement('label');
  wrap.textContent = label;
  const el = document.createElement('input');
  el.type = type;
  el.value = value ?? '';
  if (type === 'text') el.maxLength = 60;
  if (type === 'number') {
    el.min = '15';
    el.max = '240';
    el.step = '1';
    el.inputMode = 'numeric';
    el.setAttribute('aria-describedby', 'task-hint');
  }
  el.addEventListener('input', () => onChange(el.value));
  wrap.append(el);
  return wrap;
}

function focusRow(host, index, fallback) {
  const row = host.children[Math.min(index, host.children.length - 1)];
  (row?.querySelector('input[type=text]') || fallback).focus();
}

function renderRows() {
  for (const kind of ['fixed', 'protected']) {
    const host = $(`#${kind}-list`);
    const add = $(`[data-add=${kind}]`);
    host.replaceChildren();
    input[kind].forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'repeat-row block-row';
      row.append(
        field('Name', 'text', item.title, v => item.title = v),
        field('Start', 'time', item.start, v => item.start = v),
        field('End', 'time', item.end, v => item.end = v),
        button('Remove', `Remove ${item.title || kind}`, () => {
          input[kind].splice(index, 1);
          renderRows();
          focusRow(host, index, add);
        }),
      );
      host.append(row);
    });
    add.disabled = input[kind].length >= (kind === 'fixed' ? 3 : 2);
  }
  const host = $('#task-list');
  const add = $('[data-add=tasks]');
  host.replaceChildren();
  input.tasks.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'repeat-row task-row';
    const name = field('Task', 'text', item.title, v => item.title = v);
    const duration = field('Minutes', 'number', item.duration, v => item.duration = v);
    const presets = document.createElement('div');
    presets.className = 'presets';
    for (const count of [15, 30, 45, 60, 90]) {
      presets.append(button(String(count), `Set duration to ${count} minutes`, () => {
        item.duration = count;
        duration.lastChild.value = count;
        duration.lastChild.focus();
      }, 'preset'));
    }
    const options = document.createElement('div');
    options.className = 'task-options';
    const must = document.createElement('label');
    must.className = 'check-label';
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = item.required;
    check.addEventListener('change', () => item.required = check.checked);
    must.append(check, 'Must do today');
    options.append(must);
    const remove = button('Remove', `Remove task ${index + 1}`, () => {
      input.tasks.splice(index, 1);
      input.completed = input.completed.filter(id => id !== item.id);
      renderRows();
      focusRow(host, index, add);
    });
    const order = document.createElement('div');
    order.className = 'order-controls';
    for (const [delta, arrow, direction] of [[-1, '↑', 'up'], [1, '↓', 'down']]) {
      const next = index + delta;
      const move = button(arrow, `Move task ${index + 1} ${direction}`, () => {
        [input.tasks[index], input.tasks[next]] = [input.tasks[next], input.tasks[index]];
        renderRows();
        focusRow(host, next, add);
      }, 'preset');
      move.disabled = next < 0 || next >= input.tasks.length;
      order.append(move);
    }
    order.hidden = input.tasks.length < 2;
    options.append(order);
    if (editingPrior) {
      const finished = document.createElement('label');
      finished.className = 'check-label';
      const done = document.createElement('input');
      done.type = 'checkbox';
      done.checked = input.completed.includes(item.id);
      done.addEventListener('change', () => {
        input.completed = input.completed.filter(id => id !== item.id);
        if (done.checked) input.completed.push(item.id);
      });
      finished.append(done, 'Actually finished');
      options.append(finished);
    }
    row.append(name, remove, duration, presets, options);
    host.append(row);
  });
  add.disabled = input.tasks.length >= 5;
}

function setStartMode(value) {
  startNow = value;
  $('#start-now').checked = value;
  $('#start-time').disabled = value;
  if (value) input.start = clock(minuteNow());
  $('#start-time').value = input.start;
  $('#start-time').removeAttribute('aria-invalid');
  $('#start-error').hidden = true;
}

function edit() {
  draft = null;
  notice('#form-error', '');
  $('#sample-banner').hidden = !input.sample;
  $('#saved-banner').hidden = !savedPlan();
  $('#start-mode').hidden = input.sample;
  setStartMode(startNow && !input.sample);
  $('#end-time').value = input.end;
  $('#time-blocks').open = Boolean(input.fixed.length || input.protected.length);
  renderRows();
  show('editor');
}

function startPersonal() {
  input = fresh();
  startNow = true;
  editingPrior = false;
  edit();
}

function compare(next) {
  const snapshot = structuredClone(next);
  const result = buildPlans(snapshot);
  draft = {
    ...result, input: snapshot,
    previous: editingPrior && savedPlan()?.input.day === snapshot.day ? savedPlan() : null,
  };
  selected = 0;
  notice('#results-error', '');
  renderResults();
}

function titles(tasks) {
  return tasks.map(t => t.title).join(', ');
}

function renderSelection() {
  const plan = draft.plans[selected];
  for (const [index, card] of [...$('#option-list').children].entries()) {
    card.setAttribute('aria-pressed', String(index === selected));
  }
  $('#detail-summary').textContent = openLabel(plan);
  renderTimeline($('#result-axis'), $('#timeline'), draft.input, plan, draft.previous);
  notice('#detail-change', draft.previous ? changeSummary(draft.previous, draft.input, plan).tasks : '');
}

function renderResults() {
  $('#results-mode').textContent = draft.input.sample ? 'Sample day · Draft' : 'Today · Draft';
  $('#results-lead').textContent = draft.previous
    ? changeSummary(draft.previous, draft.input, draft.plans[0]).time
    : `${draft.available} min available${draft.plans.length === 1 ? ' · One option fits' : ''}`;
  notice('#results-warning', draft.impossible.length ? `Cannot fit today: ${draft.impossible.join(', ')}.` : '');
  $('#back-confirmed').hidden = !savedPlan();
  const list = $('#option-list');
  list.replaceChildren();
  draft.plans.forEach((plan, index) => {
    const card = button('', null, () => {
      selected = index;
      renderSelection();
    }, 'option-card');
    const title = document.createElement('strong');
    title.className = 'option-title';
    title.textContent = plan.title;
    const metrics = document.createElement('span');
    metrics.className = 'option-metrics';
    metrics.textContent = openLabel(plan);
    const facts = document.createElement('span');
    facts.className = 'option-facts';
    for (const [label, value] of [
      ['Keep', titles([...plan.required, ...plan.kept]) || 'No remaining tasks'],
      ['Move to later', titles(plan.deferred) || 'Nothing'],
    ]) {
      const line = document.createElement('span');
      const key = document.createElement('b');
      key.textContent = label;
      line.append(key, document.createTextNode(value));
      facts.append(line);
    }
    card.append(title, metrics, facts);
    list.append(card);
  });
  renderSelection();
  show('results');
}

function startSample() {
  input = sample();
  confirmed.sample = null;
  startNow = false;
  editingPrior = false;
  compare(input);
}

function showHome() {
  $('#resume-plan').hidden = !confirmed.personal;
  show('intro');
}

function currentConfirmed() {
  return savedPlan()?.input.sample || savedPlan()?.input.day === localDay();
}

function showConfirmed() {
  const value = savedPlan();
  if (!value) return showHome();
  const { input: saved, plan, lastChange } = value;
  const expired = !currentConfirmed();
  const ended = !saved.sample && !expired && minuteNow() >= minutes(saved.end);
  $('#confirmed-mode').textContent = saved.sample ? 'Sample day · Confirmed' : 'Confirmed';
  $('#confirmed-title').textContent = plan.title;
  $('#confirmed-notice').textContent = saved.sample ? 'Fictional afternoon · Available in this session.'
    : expired ? `This plan is from ${saved.day}. Start a new plan for today.`
    : ended ? 'This window has ended. Start a new plan to continue today.'
    : 'Saved in this browser. Tasks are marked complete only when you say they are.';
  $('#confirmed-summary').textContent = openLabel(plan);
  renderTimeline($('#confirmed-axis'), $('#confirmed-timeline'), saved, plan);
  $('#last-change').hidden = !lastChange;
  notice('#last-change-time', lastChange?.time || '');
  notice('#last-change-tasks', lastChange?.tasks || '');
  $('#replan').disabled = expired || ended;
  $('#view-alternatives').disabled = expired || ended;
  $('#confirmed-sample').hidden = saved.sample;
  $('#replan').setAttribute('aria-expanded', 'false');
  $('#quick-panel').hidden = true;
  notice('#quick-error', '');
  show('confirmed');
}

function editConfirmed({ addTask = false, focusStart = false } = {}) {
  const value = savedPlan();
  if (!currentConfirmed()) return showConfirmed();
  const next = structuredClone(value.input);
  if (addTask && next.tasks.length >= 5) {
    notice('#quick-error', 'This plan has five tasks. Edit details to remove a task before adding one.');
    return;
  }
  input = next;
  startNow = !focusStart && !input.sample && minutes(input.start) <= minuteNow();
  if (focusStart && !input.sample) input.start = clock(Math.max(minutes(input.start), minuteNow()));
  editingPrior = true;
  if (addTask) input.tasks.push(task());
  edit();
  if (focusStart) $('#start-time').focus();
  if (addTask) $('#task-list .task-row:last-child input').focus();
}

function quickReplan(target, finishedId = null) {
  if (!currentConfirmed()) return showConfirmed();
  const next = structuredClone(savedPlan().input);
  const now = next.sample ? minutes(next.start) : minuteNow();
  const start = target ?? Math.max(now, minutes(next.start));
  if (start < now) {
    renderQuick();
    notice('#quick-error', 'That start time has passed. Choose Start now or set another time.');
    $('#quick-delays button')?.focus();
    return;
  }
  if (start >= minutes(next.end)) {
    notice('#quick-error', 'Your start would be after the window ends. Set another start or change the finish time.');
    return;
  }
  next.start = clock(start);
  if (finishedId) next.completed.push(finishedId);
  editingPrior = true;
  try {
    compare(next);
    input = next;
    startNow = false;
  } catch (error) {
    notice('#quick-error', error.message);
  }
}

function renderQuick() {
  const value = savedPlan();
  const from = minutes(value.input.start);
  const end = minutes(value.input.end);
  const now = minuteNow();
  const targets = $('#quick-delays');
  targets.replaceChildren();
  if (!value.input.sample && now >= from && now < end) {
    targets.append(button('Start now', null, () => quickReplan(minuteNow()), 'button secondary'));
  }
  for (const delay of [30, 45, 60]) {
    const target = from + delay;
    if (target >= end || (!value.input.sample && target <= now)) continue;
    targets.append(button(`Start at ${timeLabel(target)} (+${delay} min)`, null, () => quickReplan(target), 'button secondary'));
  }
  const host = $('#quick-finished');
  host.replaceChildren();
  const scheduled = value.plan.blocks.filter(b => b.kind === 'task' && !value.input.completed.includes(b.id));
  if (!scheduled.length) return;
  const heading = document.createElement('h3');
  heading.textContent = 'Mark a task finished and replan';
  const controls = document.createElement('div');
  controls.className = 'quick-actions';
  for (const item of scheduled) {
    controls.append(button(item.title, `Mark ${item.title} finished and compare`, () => quickReplan(null, item.id), 'button secondary'));
  }
  host.append(heading, controls);
}

$('#home-link').addEventListener('click', event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  showHome();
});
$('#start-own').addEventListener('click', startPersonal);
$('#new-day').addEventListener('click', startPersonal);
$('#clear-sample').addEventListener('click', startPersonal);
$('#start-demo').addEventListener('click', startSample);
$('#confirmed-sample').addEventListener('click', startSample);
$('#resume-plan').addEventListener('click', () => {
  input = structuredClone(confirmed.personal.input);
  showConfirmed();
});
$('#back-confirmed').addEventListener('click', showConfirmed);
$('#show-saved').addEventListener('click', showConfirmed);
$('#edit-plan').addEventListener('click', () => {
  input = structuredClone(draft.input);
  edit();
});
$('#start-now').addEventListener('change', event => setStartMode(event.target.checked));
$('#use-current').addEventListener('click', () => {
  setStartMode(true);
  $('#start-now').focus();
});
$('#start-time').addEventListener('input', event => {
  input.start = event.target.value;
  event.target.removeAttribute('aria-invalid');
  $('#start-error').hidden = true;
});
$('#end-time').addEventListener('input', event => input.end = event.target.value);
$('#plan-form').addEventListener('input', () => notice('#form-error', ''));
for (const add of document.querySelectorAll('[data-add]')) {
  add.addEventListener('click', () => {
    const kind = add.dataset.add;
    if (kind === 'tasks') input.tasks.push(task());
    else {
      const start = startNow || !input.start ? minuteNow() : minutes(input.start);
      input[kind].push({
        id: crypto.randomUUID(), title: '', start: clock(Math.min(start, 1438)),
        end: clock(Math.min(1439, start + (kind === 'protected' ? 10 : 30))),
      });
    }
    renderRows();
    focusRow($(`#${kind === 'tasks' ? 'task' : kind}-list`), input[kind].length - 1, add);
  });
}
$('#plan-form').addEventListener('submit', event => {
  event.preventDefault();
  const now = new Date();
  if (!input.sample && input.day !== localDay(now)) {
    notice('#form-error', 'This draft belongs to an earlier day. Return home to start today’s plan.');
    $('#form-error').focus();
    return;
  }
  if (startNow) {
    input.start = clock(minuteNow(now));
    $('#start-time').value = input.start;
  }
  if (!input.sample && input.start && minutes(input.start) < minuteNow(now)) {
    $('#start-error-text').textContent = 'That start time has passed.';
    $('#start-error').hidden = false;
    $('#start-time').setAttribute('aria-invalid', 'true');
    $('#start-time').focus();
    return;
  }
  try {
    compare(input);
  } catch (error) {
    notice('#form-error', error.message);
    $('#form-error').focus();
  }
});

$('#choose-plan').addEventListener('click', () => {
  const plan = draft?.plans[selected];
  if (!plan) return;
  const replacing = !draft.input.sample && stored ? ' This replaces the plan stored in this browser.' : '';
  $('#dialog-summary').textContent = `Keep ${titles([...plan.required, ...plan.kept]) || 'the time open'}. Move to later: ${titles(plan.deferred) || 'nothing'}. ${openLabel(plan)}.${replacing}`;
  const dialog = $('#confirm-dialog');
  dialog.returnValue = '';
  dialog.showModal();
});
$('#confirm-dialog').addEventListener('close', async () => {
  if ($('#confirm-dialog').returnValue !== 'confirm' || !draft || saving) return;
  if (!draft.input.sample && draft.input.day !== localDay()) {
    notice('#results-error', 'This draft is from an earlier day. Return home to start today’s plan.');
    $('#results-error').focus();
    return;
  }
  const plan = draft.plans[selected];
  const pending = draft;
  const value = { input: draft.input, plan, at: new Date().toISOString() };
  if (draft.previous) value.lastChange = changeSummary(draft.previous, draft.input, plan);
  saving = true;
  $('#choose-plan').disabled = true;
  try {
    if (!value.input.sample) await savePersonal(value);
  } catch (error) {
    const message = error.name === 'Error' ? error.message : 'This browser could not save your plan. Allow site storage and try again.';
    notice('#results-error', message);
    $('#results-error').focus();
    return;
  } finally {
    saving = false;
    $('#choose-plan').disabled = false;
  }
  confirmed[value.input.sample ? 'sample' : 'personal'] = value;
  if (pending !== draft || $('#results').hidden) return;
  input = structuredClone(draft.input);
  draft = null;
  showConfirmed();
});
$('#replan').addEventListener('click', () => {
  if (!currentConfirmed()) return showConfirmed();
  const panel = $('#quick-panel');
  panel.hidden = !panel.hidden;
  $('#replan').setAttribute('aria-expanded', String(!panel.hidden));
  notice('#quick-error', '');
  if (!panel.hidden) {
    renderQuick();
    ($('#quick-delays button') || $('#set-start')).focus();
  }
});
$('#set-start').addEventListener('click', () => editConfirmed({ focusStart: true }));
$('#quick-add').addEventListener('click', () => editConfirmed({ addTask: true }));
$('#quick-edit').addEventListener('click', () => editConfirmed());
$('#view-alternatives').addEventListener('click', () => {
  const value = savedPlan();
  const next = structuredClone(value.input);
  if (!currentConfirmed()) return showConfirmed();
  if (!next.sample) next.start = clock(Math.max(minuteNow(), minutes(next.start)));
  editingPrior = true;
  try {
    compare(next);
    input = next;
    startNow = false;
    const match = draft.plans.findIndex(plan => plan.title === value.plan.title);
    if (match >= 0) {
      selected = match;
      renderSelection();
    }
  } catch {
    editConfirmed();
    $('#plan-form').requestSubmit();
  }
});
load();
