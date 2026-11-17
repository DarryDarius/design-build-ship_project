import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlans, PlanError } from '../src/scheduler.js';

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
test('insufficient continuous block is explained',()=>{
  const x=base(); x.tasks[0].duration=120;
  assert.throws(()=>buildPlans(x),/uninterrupted block/);
});
test('time must use 15-minute steps',()=>{
  const x=base();x.start='14:47';
  assert.throws(()=>buildPlans(x),PlanError);
});
