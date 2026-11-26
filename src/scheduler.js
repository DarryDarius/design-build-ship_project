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
  for (const [start, limit] of slots) {
    const end = start + task.duration;
    if (end > limit) continue;
    // Without task-specific deadlines, each interval can be packed from its left edge.
    const answer = fit(rest, subtract(slots, start, end), [
      ...placed, { id: task.id, title: task.title, start, end, kind: 'task', required: task.required },
    ]);
    if (answer) return answer;
  }
  return null;
}

function checkedTime(value, field) {
  try { return minutes(value); } catch { throw new PlanError(`Enter a valid ${field}.`); }
}

export function timelineDetails(blocks, start, end) {
  const occupied = blocks.filter(b => b.end > start && b.start < end && b.end > b.start)
    .map(b => ({ ...b, start: Math.max(start, b.start), end: Math.min(end, b.end) }))
    .sort((a, b) => a.start - b.start || a.end - b.end);
  let openIntervals = [[start, end]];
  for (const block of occupied) openIntervals = subtract(openIntervals, block.start, block.end);
  return {
    blocks: occupied,
    openIntervals,
    open: length(openIntervals),
    longest: Math.max(0, ...openIntervals.map(([a, b]) => b - a)),
  };
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
  if (all.length < 1 || all.length > 5) throw new PlanError('Add 1–5 tasks to make a plan.');
  const tasks = all.map(x => {
    const duration = Number(x.duration);
    if (!x.title?.trim() || x.title.trim().length > 60) throw new PlanError('Give each task a name of up to 60 characters.');
    if (!Number.isInteger(duration) || duration < 15 || duration > 240) throw new PlanError(`“${x.title}” needs a whole number from 15 to 240 minutes.`);
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
  const longest = Math.max(0, ...slots.map(([a, b]) => b - a));
  if (requiredMinutes > available) throw new PlanError(`Only ${available} minutes remain. Your must-do tasks need ${requiredMinutes} minutes, so you’re short by ${requiredMinutes - available}. Try a later finish time or adjust a task.`);
  const tooLong = required.find(t => t.duration > longest);
  if (tooLong) throw new PlanError(`“${tooLong.title}” needs an uninterrupted block of ${tooLong.duration} minutes. Your longest available block is ${longest} minutes.`);
  const requiredFit = fit([...required].sort((a, b) => b.duration - a.duration), slots);
  if (!requiredFit) throw new PlanError('Your must-do tasks fit individually but cannot fit together in the available blocks. Try a later finish time or adjust a task.');

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
    const timing = timelineDetails([...baseline, ...p.placed], start, end);
    const title = p.mask === 0 && optional.length ? 'Leave room to breathe' :
      active.length === 0 ? 'Keep the time open' :
      kept.length === optional.length ? 'Fit everything in' :
      `Keep ${kept[0]?.title || 'the essentials'}`;
    return { id: `option-${index + 1}`, title, kept, deferred, ...timing, available, required };
  });
  return { plans, impossible, available, start, end };
}
