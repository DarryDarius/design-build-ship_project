export class PlanError extends Error {}

export function minutes(value) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || '')) throw new PlanError('Enter a valid time.');
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}
export function clock(n) { return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`; }
const length = (s) => s.reduce((n, [a, b]) => n + b - a, 0);

function subtract(slots, start, end) {
  return slots.flatMap(([a, b]) => end <= a || start >= b ? [[a, b]] : [
    ...(start > a ? [[a, start]] : []), ...(end < b ? [[end, b]] : []),
  ]);
}

function fit(tasks, slots, placed = []) {
  if (!tasks.length) return placed;
  const [task, ...rest] = tasks;
  for (const [a, b] of slots) {
    for (let start = a; start + task.duration <= b; start += 15) {
      const answer = fit(rest, subtract(slots, start, start + task.duration), [
        ...placed, { id: task.id, title: task.title, start, end: start + task.duration, kind: 'task', required: task.required },
      ]);
      if (answer) return answer;
    }
  }
  return null;
}

function checkedTime(value, field) {
  let n;
  try { n = minutes(value); } catch { throw new PlanError(`Enter a valid ${field}.`); }
  if (n % 15) throw new PlanError(`${field} must use a 15-minute step.`);
  return n;
}

export function buildPlans(input) {
  const start = checkedTime(input.start, 'start time');
  const end = checkedTime(input.end, 'finish time');
  if (end <= start || end - start > 720) throw new PlanError('Finish time must be later than the start, within 12 hours.');
  const blocks = [...(input.fixed || []).map(x => ({ ...x, kind: 'fixed' })), ...(input.protected || []).map(x => ({ ...x, kind: 'protected' }))];
  if ((input.fixed || []).length > 3 || (input.protected || []).length > 2) throw new PlanError('Too many fixed or protected blocks.');
  const baseline = blocks.map(x => {
    const a = checkedTime(x.start, `${x.title || 'Block'} start`), b = checkedTime(x.end, `${x.title || 'Block'} end`);
    if (!x.title?.trim() || x.title.trim().length > 60 || b <= a) throw new PlanError('Each fixed or protected block needs a name of up to 60 characters and a later end time.');
    return { id: x.id, title: x.title.trim(), start: a, end: b, kind: x.kind };
  }).sort((a, b) => a.start - b.start);
  for (let i = 1; i < baseline.length; i++) if (baseline[i].start < baseline[i - 1].end) {
    throw new PlanError(`“${baseline[i - 1].title}” overlaps “${baseline[i].title}”. Change one of those times.`);
  }
  const all = input.tasks || [];
  if (all.length < 2 || all.length > 5) throw new PlanError('Add 2–5 tasks to compare what stays and what waits.');
  const tasks = all.map(x => {
    const duration = Number(x.duration);
    if (!x.title?.trim() || x.title.trim().length > 60) throw new PlanError('Give each task a name of up to 60 characters.');
    if (!Number.isInteger(duration) || duration < 15 || duration > 240 || duration % 15) throw new PlanError(`“${x.title}” needs 15–240 minutes in 15-minute steps.`);
    return { id: x.id, title: x.title.trim(), duration, required: Boolean(x.required) };
  });
  if (new Set(tasks.map(x => x.id)).size !== tasks.length) throw new PlanError('Task IDs must be unique.');
  const completed = new Set(input.completed || []);
  const active = tasks.filter(x => !completed.has(x.id));
  const required = active.filter(x => x.required), optional = active.filter(x => !x.required);
  let slots = [[start, end]];
  for (const b of baseline) slots = subtract(slots, b.start, b.end);
  const available = length(slots);
  const requiredMinutes = required.reduce((n, x) => n + x.duration, 0);
  if (requiredMinutes > available) throw new PlanError(`Only ${available} minutes remain, but today's must-do tasks need ${requiredMinutes}. Change a duration, finish time, or must-do choice.`);
  const requiredFit = fit([...required].sort((a, b) => b.duration - a.duration), slots);
  if (!requiredFit) throw new PlanError('Must-do tasks need a longer uninterrupted block than today has. Change a block or task duration.');

  const feasible = [];
  for (let mask = 0; mask < (1 << optional.length); mask++) {
    const chosen = optional.filter((_, i) => mask & (1 << i));
    const placed = fit([...required].sort((a, b) => b.duration - a.duration).concat([...chosen].sort((a, b) => b.duration - a.duration)), slots);
    if (placed) feasible.push({ mask, placed });
  }
  const rank = (a, b) => {
    for (let i = 0; i < optional.length; i++) {
      const delta = Number(Boolean(b.mask & (1 << i))) - Number(Boolean(a.mask & (1 << i)));
      if (delta) return delta;
    }
    return 0;
  };
  feasible.sort(rank);
  const picks = [feasible[0]];
  const firstExcluded = optional.findIndex((_, i) => !(picks[0].mask & (1 << i)) && feasible.some(f => f.mask & (1 << i)));
  if (firstExcluded >= 0) {
    const other = feasible.find(f => f.mask & (1 << firstExcluded) && f.mask !== picks[0].mask);
    if (other) picks.push(other);
  }
  if (optional.length && picks.every(p => p.mask !== 0)) picks.push(feasible.find(f => f.mask === 0));
  const unique = [...new Map(picks.filter(Boolean).map(p => [p.mask, p])).values()].slice(0, 3);
  const impossible = optional.filter((_, i) => !feasible.some(f => f.mask & (1 << i))).map(x => x.title);
  const plans = unique.map((p, index) => {
    const kept = optional.filter((_, i) => p.mask & (1 << i));
    const deferred = optional.filter((_, i) => !(p.mask & (1 << i)));
    const blocks = [...baseline.filter(b => b.end > start).map(b => ({ ...b, start: Math.max(b.start, start) })), ...p.placed].sort((a, b) => a.start - b.start || a.end - b.end);
    const open = available - p.placed.reduce((n, b) => n + b.end - b.start, 0);
    const title = p.mask === 0 && optional.length ? 'Leave room to breathe' :
      kept.length === optional.length ? 'Fit everything in' :
      `Keep ${kept[0]?.title || 'the essentials'}`;
    return { id: `option-${index + 1}`, title, kept, deferred, blocks, open, available, required };
  });
  return { plans, impossible, available, start, end };
}
