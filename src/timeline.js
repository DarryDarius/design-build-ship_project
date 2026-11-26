import { clock, minutes, timelineDetails } from './scheduler.js';

export function timeLabel(value) {
  const total = typeof value === 'string' ? minutes(value) : value;
  const hour = Math.floor(total / 60);
  const minute = String(total % 60).padStart(2, '0');
  return `${hour % 12 || 12}:${minute} ${hour < 12 ? 'AM' : 'PM'}`;
}

export function openLabel(plan) {
  return plan.open ? `${plan.open} min open · ${plan.longest} min uninterrupted` : 'No open time';
}

export function changeSummary(previous, input, plan) {
  const old = new Map(previous.plan.blocks.filter(b => b.kind === 'task').map(b => [b.id, b]));
  const next = new Map(plan.blocks.filter(b => b.kind === 'task').map(b => [b.id, b]));
  const tasks = new Set(input.tasks.map(t => t.id));
  const done = new Set(input.completed);
  const details = [];
  for (const [label, matches] of [
    ['Marked finished', [...old.values()].filter(b => done.has(b.id))],
    ['Removed', [...old.values()].filter(b => !tasks.has(b.id))],
    ['Moved to later', [...old.values()].filter(b => tasks.has(b.id) && !done.has(b.id) && !next.has(b.id))],
    ['Now scheduled', [...next.values()].filter(b => !old.has(b.id))],
    ['Rescheduled', [...next.values()].filter(b => old.has(b.id) && (old.get(b.id).start !== b.start || old.get(b.id).end !== b.end))],
  ]) {
    if (matches.length) details.push(`${label}: ${matches.map(b => b.title).join(', ')}`);
  }
  const before = previous.input.start;
  const after = input.start;
  const difference = minutes(after) - minutes(before);
  const starts = difference === 0 ? `Same start · ${timeLabel(after)}`
    : `${Math.abs(difference)} min ${difference > 0 ? 'later' : 'earlier'} · ${timeLabel(before)} → ${timeLabel(after)}`;
  const available = previous.plan.available === plan.available
    ? `${plan.available} min available`
    : `${previous.plan.available} → ${plan.available} min available`;
  return { time: `${starts} · ${available}`, tasks: details.join(' · ') || 'The same tasks remain scheduled.' };
}

export function renderTimeline(axis, list, input, plan, previous = null) {
  const start = minutes(input.start);
  const end = minutes(input.end);
  const origin = previous ? Math.min(minutes(previous.input.start), start) : start;
  const limit = previous ? Math.max(minutes(previous.input.end), end) : end;
  const timing = timelineDetails(plan.blocks, start, end);
  const entries = [...timing.blocks, ...timing.openIntervals.map(([a, b]) => ({
    kind: 'open', title: 'Open time', start: a, end: b,
  }))].sort((a, b) => a.start - b.start);

  const scale = document.createElement('div');
  scale.className = 'axis-scale';
  for (const at of [origin, limit]) {
    const label = document.createElement('span');
    label.textContent = timeLabel(at);
    scale.append(label);
  }

  const track = document.createElement('div');
  track.className = 'time-track';
  track.setAttribute('aria-hidden', 'true');
  for (const block of entries) {
    const bar = document.createElement('span');
    bar.className = block.kind;
    bar.style.left = `${100 * (block.start - origin) / (limit - origin)}%`;
    bar.style.width = `${100 * (block.end - block.start) / (limit - origin)}%`;
    track.append(bar);
  }

  const caption = document.createElement('p');
  caption.className = 'axis-caption';
  if (previous && previous.input.start !== input.start) {
    const marker = document.createElement('span');
    marker.className = 'start-marker';
    marker.style.left = `${100 * (Math.max(start, minutes(previous.input.start)) - origin) / (limit - origin)}%`;
    track.append(marker);
    caption.textContent = `Previous start ${timeLabel(previous.input.start)} · New start ${timeLabel(start)}`;
  }

  const legend = document.createElement('div');
  legend.className = 'legend';
  for (const [kind, label] of [['task', 'Task'], ['fixed', 'Fixed'], ['protected', 'Protected'], ['open', 'Open']]) {
    if (!entries.some(b => b.kind === kind)) continue;
    const item = document.createElement('span');
    item.className = kind;
    item.textContent = label;
    legend.append(item);
  }
  axis.replaceChildren(scale, track, caption, legend);
  list.replaceChildren();
  for (const block of entries) {
    const row = document.createElement('li');
    row.className = block.kind;
    const time = document.createElement('span');
    time.className = 'interval';
    time.textContent = `${clock(block.start)}–${clock(block.end)}`;
    const label = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = block.title;
    const detail = document.createElement('small');
    detail.textContent = {
      task: block.required ? 'Must do · scheduled' : 'Scheduled',
      fixed: 'Fixed commitment',
      protected: 'Protected time',
      open: `${block.end - block.start} min`,
    }[block.kind];
    label.append(title, detail);
    row.append(time, label);
    list.append(row);
  }
}
