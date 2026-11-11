const fs = require('node:fs');
const vm = require('node:vm');
function createGame({width = 1200, height = 700, reduced = false, source = 'index.html'} = {}) {
  const metrics = {buffers: 0, drawImages: 0, shadows: 0, domWrites: 0, tones: []};
  let now = 1000, raf, seed = 135798;
  const elements = new Map();
  const noop = () => {};
  function context() {
    return new Proxy({}, {get(target, key) {
      if (key === 'drawImage') return () => metrics.drawImages++;
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({addColorStop: noop});
      if (key === 'measureText') return t => ({width: t.length * 10});
      return key in target ? target[key] : noop;
    }, set(target, key, value) {if (key === 'shadowBlur' && value > 0) metrics.shadows++; target[key] = value; return true;}});
  }
  function element(id) {
    if (elements.has(id)) return elements.get(id);
    const handlers = {}, classes = new Set(); let text = '';
    const e = {id, style:{setProperty:noop}, dataset:{}, children:[], hidden:false, open:false, value:'70', checked:true,
      classList:{add: x => classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle(x, value){if(value === undefined) value = !classes.has(x); value ? classes.add(x) : classes.delete(x); return value;}},
      addEventListener(k,f){(handlers[k] ||= []).push(f);}, dispatch(k,event={}){for (const f of handlers[k] || []) f({preventDefault:noop,target:e,...event});},click(){e.dispatch('click');},
      setAttribute:noop,getAttribute:()=>null,focus:noop,appendChild:noop,prepend:noop,remove:noop,setPointerCapture:noop,releasePointerCapture:noop,hasPointerCapture:()=>true,
      getBoundingClientRect:()=>({x:0,y:0,left:0,top:0,width,height}),getContext:context,toDataURL:()=>'',
      showModal(){e.open=true;},close(){e.open=false;},animate:()=>({cancel:noop}), querySelector:()=>null};
    Object.defineProperty(e,'textContent',{get:()=>text,set:v=>{text=String(v);metrics.domWrites++;}});
    elements.set(id,e);return e;
  }
  const params = () => ({value:0,setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},cancelScheduledValues:noop});
  class AudioContext {
    state='running'; sampleRate=48000; destination={}; get currentTime(){return now/1000;}
    resume(){return Promise.resolve();}
    createGain(){return {gain:params(),connect:noop,disconnect:noop};}
    createDynamicsCompressor(){return {threshold:params(),knee:params(),ratio:params(),attack:params(),release:params(),connect:noop};}
    createStereoPanner(){return {pan:params(),connect:noop,disconnect:noop};}
    createOscillator(){const frequency=params();return {frequency,connect:noop,disconnect:noop,start: t=>metrics.tones.push({time:now/1000,scheduled:t}),stop:noop};}
    createBuffer(ch,n){metrics.buffers++;return {getChannelData:()=>new Float32Array(n),duration:n/48000};}
    createBufferSource(){return {connect:noop,disconnect:noop,start:noop,stop:noop};}
    createBiquadFilter(){return {frequency:params(),Q:params(),connect:noop,disconnect:noop};}
  }
  const modeButtons = ['classic','arcade','zen'].map(mode=>{const e=element('mode-'+mode);e.dataset.mode=mode;return e;});
  element('lives').children=[element('life0'),element('life1'),element('life2')];
  const document = {hidden:false,fullscreenEnabled:true,getElementById:element,createElement:kind=>element(kind+'-'+elements.size),
    querySelectorAll:selector=>selector.includes('data-mode')?modeButtons:selector.includes('dialog')?[...elements.values()].filter(e=>e.id.includes('dialog')&&e.open):[],
    querySelector:selector=>selector.includes('dialog')?[...elements.values()].find(e=>e.id.includes('dialog')&&e.open):null,
    addEventListener:(...args)=>element('document').addEventListener(...args),body:element('body')};
  const math=Object.create(Math);math.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  const sandbox={document,AudioContext,Math:math,URLSearchParams,location:{search:'?test=1'},localStorage:{getItem:()=>null,setItem:noop},performance:{now:()=>now},
    requestAnimationFrame:fn=>{raf=fn;return 1;},cancelAnimationFrame:noop,matchMedia:()=>({matches:reduced,addEventListener:noop}),ResizeObserver:class{observe(){}},
    devicePixelRatio:1,innerWidth:width,innerHeight:height,navigator:{vibrate:noop},addEventListener:(...args)=>element('window').addEventListener(...args),setTimeout:noop,clearTimeout:noop,console};
  sandbox.window=sandbox;
  const code=fs.readFileSync(source,'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(code,sandbox,{filename:'game.js'});
  function tick(ms){now+=ms;const cb=raf;cb(now);}
  function advance(ms,step=1000/60){while(ms>0.00001){const delta=Math.min(ms,step);tick(delta);ms-=delta;}}
  const state=()=>sandbox.fruitNinjaSnapshot();
  function start(mode='zen'){element('mode-'+mode).click();element('start-button').click();advance(2600);}
  function move(x,y,extra={}){element('game').dispatch('pointermove',{pointerId:1,clientX:x,clientY:y,timeStamp:now,...extra});}
  function down(x,y){element('game').dispatch('pointerdown',{button:0,pointerId:1,pointerType:'mouse',clientX:x,clientY:y,timeStamp:now});}
  function up(){element('game').dispatch('pointerup',{pointerId:1});}
  function hit(f){down(f.x-f.r-12,f.y);move(f.x+f.r+12,f.y);up();}
  return {state,element,document,metrics,advance,tick,start,down,move,up,hit,now:()=>now};
}
module.exports={createGame};
