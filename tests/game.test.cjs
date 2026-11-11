const {createGame}=require('./harness.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const results=[];
function test(name,fn){try{fn();results.push({name,pass:true});console.log('PASS '+name);}catch(e){results.push({name,pass:false,error:e.message});console.log('FAIL '+name+': '+e.message);}}
test('round timer stays accurate during 100ms frame delays',()=>{const g=createGame();g.start();const start=g.state().elapsed;g.advance(1000,100);assert.ok(Math.abs(g.state().elapsed-start-1)<.015,`advanced ${(g.state().elapsed-start).toFixed(3)}s in 1s`);});
test('the same fruit has a consistent readable radius',()=>{const g=createGame();g.start();const sizes={};for(let i=0;i<300;i++){g.advance(100);for(const e of g.state().entities){if(e.bomb)continue;(sizes[e.type] ||= []).push(e.r);}}const spread=Math.max(...Object.values(sizes).map(a=>Math.max(...a)/Math.min(...a)));assert.ok(spread<=1.06,`radius varies by ${((spread-1)*100).toFixed(1)}%`);});
test('a curved coalesced pointer path hits the crossed fruit',()=>{const g=createGame();g.start();g.advance(550);const f=g.state().entities.find(e=>!e.bomb);assert.ok(f);const y=f.y-f.r*2.4;g.down(f.x-f.r-60,y);g.move(f.x+f.r+60,y,{getCoalescedEvents:()=>[{clientX:f.x,clientY:f.y,timeStamp:g.now()-2},{clientX:f.x+f.r+60,clientY:y,timeStamp:g.now()}]});g.up();assert.ok(g.state().sliced>=1,'coalesced curved swipe was missed');});
test('audio noise is cached across successive fruit slices',()=>{const g=createGame();g.start();for(let i=0;i<45;i++){g.advance(160);for(const e of g.state().entities)if(!e.bomb&&e.y>130&&e.y<g.state().H-60)g.hit(e);}assert.ok(g.state().sliced>=5);assert.ok(g.metrics.buffers<=2,`${g.metrics.buffers} audio buffers allocated for ${g.state().sliced} fruit`);});
test('classic missed fruit produces a distinct multi-tone alarm',()=>{const g=createGame();g.start('classic');let before;for(let i=0;i<500&&g.state().misses===0;i++){before=g.metrics.tones.length;g.advance(10);}assert.ok(g.state().misses>0);assert.ok(g.metrics.tones.length-before>=2,`only ${g.metrics.tones.length-before} tone(s) at miss`);});
test('pause freezes elapsed time and fruit positions',()=>{const g=createGame();g.start();g.advance(400);g.element('pause-button').click();const s=g.state();g.advance(1200,100);assert.equal(g.state().elapsed,s.elapsed);assert.equal(g.state().entities[0].y,s.entities[0].y);g.element('resume-button').click();assert.equal(g.state().phase,'playing');});
test('classic ends after three misses; zen ignores misses',()=>{const g=createGame();g.start('classic');g.advance(10000);assert.equal(g.state().misses,3);assert.equal(g.state().phase,'result');const z=createGame();z.start();z.advance(12000);assert.equal(z.state().misses,0);assert.equal(z.state().phase,'playing');});
const baseline=process.argv.includes('--baseline');
fs.mkdirSync('work',{recursive:true});fs.writeFileSync(baseline?'work/baseline-tests.json':'work/game-tests.json',JSON.stringify(results,null,2));
console.log(`${results.filter(r=>r.pass).length}/${results.length} passed`);
if(!baseline&&results.some(r=>!r.pass))process.exitCode=1;
