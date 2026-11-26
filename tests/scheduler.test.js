import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlans } from '../src/scheduler.js';

const base = () => ({ start:'14:45',end:'18:00',fixed:[{id:'class',title:'Class',start:'16:00',end:'16:30'}],protected:[],completed:[],tasks:[
  {id:'must',title:'Assignment',duration:45,required:true},
  {id:'project',title:'Project',duration:90,required:false},
  {id:'reading',title:'Reading',duration:60,required:false},
] });
test('45-minute delay yields distinct honest choices', () => {
  const { plans, available } = buildPlans(base());
  assert.equal(available,165);
  assert.equal(plans.length,3);
  assert.deepEqual(plans.slice(0,2).map(p=>p.kept.map(t=>t.id)),[['project'],['reading']]);
  assert.deepEqual(plans.map(p => [p.open, p.longest]), [[30, 30], [60, 30], [120, 90]]);
  assert.deepEqual(plans[1].openIntervals, [[930, 960], [1050, 1080]]);
  for(const p of plans) {
    assert.ok(p.blocks.some(b=>b.id==='must'));
    assert.ok(p.blocks.some(b=>b.id==='class' && b.start===960));
    for(let i=1;i<p.blocks.length;i++) assert.ok(p.blocks[i].start>=p.blocks[i-1].end);
  }
});
test('cannot silently defer must-do work',()=>{
  const x=base(); x.tasks[1].required=true; x.tasks[2].required=true;
  assert.throws(()=>buildPlans(x),/Only 165 minutes remain/);
});
test('overlapping protected time is rejected',()=>{
  const x=base(); x.protected=[{id:'rest',title:'Rest',start:'16:15',end:'16:45'}];
  assert.throws(()=>buildPlans(x),/overlaps/);
});
test('completed tasks are excluded from replanning',()=>{
  const x=base(); x.completed=['project'];
  assert.equal(buildPlans(x).plans[0].kept.map(t=>t.id).join(), 'reading');
});
test('must-do work is placed before optional work when both fit',()=>{
  const x=base();
  const plan=buildPlans(x).plans[1];
  assert.equal(plan.blocks.filter(b=>b.kind==='task')[0].id,'must');
});
test('replan timeline omits fixed commitments already in the past',()=>{
  const x=base(); x.start='17:00'; x.tasks[0].duration=45;
  const plan=buildPlans(x).plans[0];
  assert.ok(!plan.blocks.some(b=>b.id==='class'));
});
test('insufficient continuous block is explained',()=>{
  const x=base(); x.tasks[0].duration=120;
  assert.throws(()=>buildPlans(x),/uninterrupted block/);
});
test('a single task and short protected time use exact minutes', () => {
  const x = {
    start: '14:07', end: '15:00',
    tasks: [{ id: 'only', title: 'Email', duration: 20, required: true }],
    protected: [{ id: 'break', title: 'Break', start: '14:23', end: '14:33' }],
  };
  const { plans } = buildPlans(x);
  assert.equal(plans.length, 1);
  assert.deepEqual(plans[0].blocks.map(b => [b.start, b.end]), [[863, 873], [873, 893]]);
  assert.deepEqual(plans[0].openIntervals, [[847, 863], [893, 900]]);
  assert.equal(plans[0].open, 23);
  assert.equal(plans[0].longest, 16);
});
test('the time line clips commitments at both edges of the window', () => {
  const x = base();
  x.tasks = x.tasks.slice(0, 1);
  x.fixed = [
    { id: 'early', title: 'Early', start: '14:10', end: '14:50' },
    { id: 'late', title: 'Late', start: '17:50', end: '18:15' },
    { id: 'outside', title: 'Outside', start: '18:15', end: '19:00' },
  ];
  const { plans } = buildPlans(x);
  assert.deepEqual(plans[0].blocks.filter(b => b.kind === 'fixed').map(b => [b.id, b.start, b.end]),
    [['early', 885, 890], ['late', 1070, 1080]]);
  assert.equal(plans[0].open, 135);
});
test('an exact fit has zero open time and a completed last task releases its time', () => {
  const x = {
    start: '11:00', end: '11:20',
    tasks: [{ id: 'only', title: 'Email', duration: 20, required: true }],
  };
  const { plans } = buildPlans(x);
  assert.deepEqual(plans[0].openIntervals, []);
  assert.equal(plans[0].longest, 0);
  assert.equal(buildPlans({ ...x, completed: ['only'] }).plans[0].open, 20);
  assert.throws(() => buildPlans({ ...x, tasks: [] }), /Add 1–5 tasks/);
});
test('long titles are rejected rather than silently cut off',()=>{
  const x=base(); x.tasks[0].title='A'.repeat(61);
  assert.throws(()=>buildPlans(x),/up to 60 characters/);
});
