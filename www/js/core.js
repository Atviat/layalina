'use strict';
/* ====== أيهم — النواة: أدوات، إعدادات، صوت مكاني، إدخال ====== */
const $=id=>document.getElementById(id);
const TAU=Math.PI*2;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const B=v=>v?1:0;
function mkRng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ---------- الإعدادات ---------- */
const PRESETS=[
  {res:0,fps:1,shadow:0,fx:0,auto:1},   // منخفض
  {res:1,fps:0,shadow:1,fx:1,auto:1},   // متوسط
  {res:2,fps:0,shadow:2,fx:1,auto:1},   // عالٍ
  {res:3,fps:0,shadow:2,fx:2,auto:0}    // فائق
];
const S0={vol:8,music:6,view:0,preset:1,res:1,fps:0,shadow:1,fx:1,auto:1,bright:10,
  sens:10,sensY:10,inv:0,dz:12,fov:70,bob:1,rumble:1,infStam:1,aimAssist:0};
const S=Object.assign({},S0);
try{Object.assign(S,JSON.parse(localStorage.getItem('layalina_s2')||'{}'))}catch(e){}
function saveS(){try{localStorage.setItem('layalina_s2',JSON.stringify(S))}catch(e){}}
function applyPreset(i){Object.assign(S,PRESETS[i]);S.preset=i}

/* ---------- ضوضاء قيمية (للخامات) ---------- */
function hash2(x,y,s){let h=Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(s,1274126177)|0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296}
function vnoise(x,y,per,s){ // قابلة للتكرار (tileable) بدورة per
  const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;
  const u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const x0=((xi%per)+per)%per,x1=(x0+1)%per,y0=((yi%per)+per)%per,y1=(y0+1)%per;
  const a=hash2(x0,y0,s),b=hash2(x1,y0,s),c=hash2(x0,y1,s),d=hash2(x1,y1,s);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
}
function fbm(x,y,per,oct,s){let t=0,a=.5,f=1,p=per;for(let i=0;i<oct;i++){t+=a*vnoise(x*f,y*f,p,s+i*17);a*=.5;f*=2;p*=2}return t}

/* ---------- الصوت: مكاني ثلاثي الأبعاد (بانر + مسافة + حجب بالجدران + صدى) ---------- */
let AC=null,master,sfxBus,musBus,noiseBuf,revIn,windG,windBP,droneG,padG,padOscs=[],genG=null;
function ensureAudio(){
  if(AC){if(AC.state==='suspended')AC.resume();return}
  try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){AC=null;return}
  master=AC.createGain();master.gain.value=1;master.connect(AC.destination);
  sfxBus=AC.createGain();sfxBus.gain.value=S.vol/10;sfxBus.connect(master);
  musBus=AC.createGain();musBus.gain.value=S.music/10;musBus.connect(master);
  noiseBuf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);
  const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  // صدى
  revIn=AC.createGain();const dl=AC.createDelay(1);dl.delayTime.value=.34;const fb=AC.createGain();fb.gain.value=.46;
  const rlp=AC.createBiquadFilter();rlp.type='lowpass';rlp.frequency.value=1700;
  revIn.connect(dl);dl.connect(rlp);rlp.connect(fb);fb.connect(dl);const ro=AC.createGain();ro.gain.value=.55;rlp.connect(ro);ro.connect(sfxBus);
  // رياح
  const ws=AC.createBufferSource();ws.buffer=noiseBuf;ws.loop=true;
  windBP=AC.createBiquadFilter();windBP.type='bandpass';windBP.frequency.value=450;windBP.Q.value=.7;
  windG=AC.createGain();windG.gain.value=.15;
  const lfo=AC.createOscillator();lfo.frequency.value=.11;const lg=AC.createGain();lg.gain.value=240;lfo.connect(lg);lg.connect(windBP.frequency);lfo.start();
  ws.connect(windBP);windBP.connect(windG);windG.connect(sfxBus);ws.start();
  // موسيقى توتر: عناقيد نصف نغمة + نبرة عالية خافتة
  padG=AC.createGain();padG.gain.value=.0;
  [[49,'sawtooth'],[51.9,'sawtooth'],[73.4,'sine'],[77.8,'sine']].forEach(a=>{
    const o=AC.createOscillator();o.type=a[1];o.frequency.value=a[0];const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=220;
    o.connect(lp);lp.connect(padG);o.start();padOscs.push(o)});
  padG.connect(musBus);
  droneG=AC.createGain();droneG.gain.value=0;const ho=AC.createOscillator();ho.type='sine';ho.frequency.value=2093;ho.connect(droneG);ho.start();droneG.connect(musBus);
}
function route(src,o){
  o=o||{};let n=src;
  if(o.lp){const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=o.lp;n.connect(f);n=f}
  if(AC.createStereoPanner&&o.pan){const p=AC.createStereoPanner();p.pan.value=clamp(o.pan,-1,1);n.connect(p);n=p}
  n.connect(o.bus||sfxBus);
  if(o.rev){const g=AC.createGain();g.gain.value=o.rev;n.connect(g);g.connect(revIn)}
}
function tone(f,d,type,v,f2,o,delay){
  if(!AC)return;o=o||{};v*=(o.vol==null?1:o.vol);if(v<.0004)return;const t=AC.currentTime+(delay||0);
  const os=AC.createOscillator(),g=AC.createGain();os.type=type||'sine';
  os.frequency.setValueAtTime(f,t);if(f2)os.frequency.exponentialRampToValueAtTime(f2,t+d);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(v,.0002),t+Math.min(.03,d/3));g.gain.exponentialRampToValueAtTime(.0001,t+d);
  os.connect(g);route(g,o);os.start(t);os.stop(t+d+.05);
}
function noise(d,f,v,type,o,delay,q){
  if(!AC)return;o=o||{};v*=(o.vol==null?1:o.vol);if(v<.0004)return;const t=AC.currentTime+(delay||0);
  const s=AC.createBufferSource();s.buffer=noiseBuf;
  const fl=AC.createBiquadFilter();fl.type=type||'lowpass';fl.frequency.value=f;fl.Q.value=q||1;
  const g=AC.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(v,.0002),t+Math.min(.03,d/3));g.gain.exponentialRampToValueAtTime(.0001,t+d);
  s.connect(fl);fl.connect(g);route(g,o);s.start(t,Math.random());s.stop(t+d+.05);
}
// موضع صوتي بالنسبة للاعب: بانر، مسافة، حجب (جدار)، صدى
function sp(x,y){
  if(typeof P==='undefined'||!P)return{};
  const dx=x-P.x,dy=y-P.y,d=Math.hypot(dx,dy);
  let rel=Math.atan2(dy,dx)-P.a;rel=Math.atan2(Math.sin(rel),Math.cos(rel));
  const o={pan:Math.sin(rel)*Math.min(1,.25+d/4),vol:clamp(1.1/(1+d*.30),0,1.2),rev:clamp(d*.025,0,.45)};
  if(Math.abs(rel)>1.57)o.lp=2600-(Math.abs(rel)-1.57)*900;
  if(d>2&&typeof los==='function'&&!los(P.x,P.y,x,y)){o.lp=Math.min(o.lp||9999,650);o.vol*=.5}
  return o;
}
const SFX={
  stepSand(v,o){v=v||1;noise(.11,480+Math.random()*260,.17*v,'lowpass',o);tone(64,.09,'sine',.1*v,null,o)},
  stepIndoor(v,o){v=v||1;noise(.06,1400+Math.random()*500,.12*v,'bandpass',o,0,2);tone(95,.1,'sine',.12*v,70,o);if(Math.random()<.16*v)tone(150+Math.random()*60,.5,'sawtooth',.03*v,210,o,.04)},
  heart(v){tone(56,.16,'sine',v,40);tone(50,.2,'sine',v*.8,38,null,.2)},
  growl(o,v){tone(72,1.2,'sawtooth',v*.34,40,o);noise(1.2,300,v*.5,'lowpass',o);tone(190,.9,'sawtooth',v*.08,120,o,.1)},
  rasp(o,v){noise(.9,1800,v*.14,'bandpass',o,0,1.4);noise(.7,900,v*.1,'bandpass',o,.9,1.2)},
  screech(){tone(950,.9,'sawtooth',.34,180);noise(.9,2200,.5,'highpass');tone(60,1,'sine',.5,30)},
  chime(){tone(880,.5,'sine',.18);tone(1320,.7,'sine',.12,null,null,.1)},
  pick(){noise(.08,2500,.12,'highpass');tone(520,.12,'triangle',.1,780)},
  click(){noise(.04,3000,.2,'highpass');tone(300,.05,'square',.05)},
  bark(o){tone(420,.16,'square',.05,250,o);tone(400,.16,'square',.04,240,o,.3);tone(430,.2,'square',.04,230,o,.7)},
  owl(o){tone(420,.35,'sine',.1,380,o);tone(380,.55,'sine',.09,330,o,.45)},
  creak(o){tone(180,1.4,'sawtooth',.06,270,o);noise(1.4,900,.06,'bandpass',o,0,4)},
  door(o){noise(.5,500,.25,'lowpass',o);tone(110,.5,'sawtooth',.1,70,o);tone(190,1.1,'sawtooth',.05,260,o,.05)},
  locked(o){noise(.07,3000,.2,'highpass',o);noise(.06,2400,.18,'highpass',o,.12);tone(140,.12,'square',.06,null,o)},
  whisper(o){noise(1.9,2600,.1,'bandpass',o,0,3);noise(1.2,3300,.07,'bandpass',o,.5,5)},
  thud(o){tone(58,.38,'sine',.34,36,o);noise(.3,200,.22,'lowpass',o)},
  knock(o){[0,.22,.44].forEach(d=>{tone(150,.1,'sine',.32,90,o,d);noise(.06,500,.2,'lowpass',o,d)})},
  steps(o,n){for(let i=0;i<(n||5);i++){const d=i*.5+Math.random()*.05;noise(.09,700,.16,'lowpass',o,d);tone(80,.1,'sine',.12,null,o,d)}},
  glass(o){for(let i=0;i<6;i++)tone(2600+Math.random()*2000,.12,'triangle',.05,null,o,i*.03+Math.random()*.04);noise(.3,5000,.12,'highpass',o)},
  scream(o){tone(620,1.6,'sawtooth',.07,980,o);tone(640,1.5,'sawtooth',.05,420,o,.2);noise(1.6,2600,.05,'bandpass',o,0,2)},
  radio(o){noise(1.2,1800,.08,'bandpass',o,0,.7);for(let i=0;i<6;i++)tone(400+Math.random()*900,.08,'square',.025,null,o,i*.14)},
  shot(o){noise(.16,5000,.7,'highpass',o);noise(.45,900,.6,'lowpass',o);tone(120,.3,'sine',.55,38,o);noise(1.4,500,.18,'lowpass',Object.assign({},o,{rev:.7}),.05)},
  dry(){noise(.04,3500,.22,'highpass');tone(240,.05,'square',.06)},
  reloadOut(){noise(.1,1800,.15,'bandpass',null,0,2);tone(180,.1,'square',.05)},
  reloadIn(){noise(.07,2200,.2,'highpass');tone(140,.08,'square',.08,100)},
  slide(){noise(.12,2800,.2,'highpass');tone(210,.06,'square',.06,null,null,.1)},
  hit(o){noise(.1,600,.3,'lowpass',o);tone(90,.18,'sawtooth',.12,45,o)},
  hurt(){noise(.25,400,.4,'lowpass');tone(80,.4,'sawtooth',.25,40)},
  breath(v){noise(.7,1500,.09*v,'bandpass',null,0,1.2);noise(.9,1000,.07*v,'bandpass',null,.8,1.2)},
  win(){[523,659,784,1047].forEach((f,i)=>tone(f,.8,'sine',.14,null,null,i*.18))},
  drip(o){tone(1800,.04,'sine',.1,1200,o);tone(900,.2,'sine',.05,700,o,.06)},
  scratch(o){for(let i=0;i<6;i++)noise(.05,4200,.09,'highpass',o,i*.08+Math.random()*.03)},
  clock(o){for(let i=0;i<4;i++){tone(2400,.015,'square',.045,null,o,i*1);tone(1900,.015,'square',.035,null,o,i*1+.5)}},
  moan(o){tone(92,2.6,'sawtooth',.06,70,o);noise(2.6,380,.05,'lowpass',o);tone(184,2.2,'sine',.03,140,o,.2)},
  cloth(o){noise(.25,2200,.06,'bandpass',o,0,1)},
  gust(o){noise(1.6,700,.12,'bandpass',o,0,.8)},
  menu(){tone(520,.08,'sine',.08)},
  start(){tone(55,2.5,'sawtooth',.2,38);noise(2,200,.2,'lowpass')},
  engineDie(){tone(95,1.8,'sawtooth',.25,22);noise(1.5,300,.2,'lowpass')},
  pluck(f,o){tone(f,1.6,'triangle',.07,f*.995,Object.assign({rev:.8,bus:musBus},o||{}));tone(f*2.003,.9,'sine',.025,null,Object.assign({rev:.8,bus:musBus},o||{}))}
};
// موسيقى: نغمات عود على سلّم حجاز مع صدى + توتر يتبع الخطر
const HIJAZ=[146.8,155.6,184.99,196,220,233.1,261.6,293.7];
let musT=6;
function musicTick(dt,threat,mode){
  if(!AC)return;
  const t=AC.currentTime;
  padG.gain.setTargetAtTime(.012+threat*.1,t,1.2);
  droneG.gain.setTargetAtTime(Math.max(0,threat-.55)*.03,t,.4);
  padOscs[1].frequency.setTargetAtTime(51.9-threat*1.2,t,2);
  musT-=dt;
  if(musT<=0){musT=(mode==='calm'?7:12)+Math.random()*(mode==='calm'?10:14);
    const f=HIJAZ[(Math.random()*HIJAZ.length)|0];SFX.pluck(f,{pan:Math.random()*1.2-.6});
    if(Math.random()<.5)setTimeout(()=>SFX.pluck(HIJAZ[(Math.random()*HIJAZ.length)|0]),600+Math.random()*900)}
}

/* ---------- الإدخال: Android الأصلي + Gamepad API + لوحة مفاتيح + ريموت ---------- */
const keys={};const NB={};const NA={x:0,y:0,z:0,rz:0,rx:0,ry:0,lt:0,rt:0,hx:0,hy:0};
let lastIn='',hasNative=false;
addEventListener('keydown',e=>{keys[e.code]=1;keys['k'+e.keyCode]=1;if(e.key)keys[e.key]=1;lastIn='لوحة/ريموت: '+(e.key||e.code);
  if(/^(Arrow|Space|Enter|Backspace)/.test(e.code)||/^(Arrow|Enter)/.test(e.key||''))e.preventDefault();ensureAudio()});
addEventListener('keyup',e=>{keys[e.code]=0;keys['k'+e.keyCode]=0;if(e.key)keys[e.key]=0});
window.__nk=(c,d)=>{hasNative=true;NB[c]=d?1:0;if(d)lastIn='زر رقم '+c;ensureAudio()};
window.__na=(x,y,z,rz,rx,ry,lt,rt,hx,hy)=>{hasNative=true;NA.x=x;NA.y=y;NA.z=z;NA.rz=rz;NA.rx=rx;NA.ry=ry;NA.lt=lt;NA.rt=rt;NA.hx=hx;NA.hy=hy};
addEventListener('pointerdown',ensureAudio);
addEventListener('gamepadconnected',ensureAudio);
const held={},hold={};
function edge(n,on,dt,rep){
  if(on){if(!held[n]){held[n]=1;hold[n]=-.35;return true}
    if(rep){hold[n]+=dt;if(hold[n]>=.12){hold[n]=0;return true}}}
  else held[n]=0;
  return false;
}
let gpad=null;
const I={mx:0,my:0,lx:0,ly:0,sprint:0,up:0,down:0,left:0,right:0,ok:0,back:0,backKey:0,b:0,start:0,flash:0,anyBtn:0,
  fire:0,fireHeld:0,aim:0,reload:0,view:0};
function getPad(){
  const pads=navigator.getGamepads?navigator.getGamepads():[];
  for(let i=0;i<pads.length;i++){const p=pads[i];if(p&&p.connected)return p}
  return null;
}
function stick(x,y,dz){const m=Math.hypot(x,y);if(m<=dz)return[0,0];const s=Math.min(1,(m-dz)/(1-dz))/m;return[x*s,y*s]}
function poll(dt){
  const gp=gpad=getPad();const dz=S.dz/100;
  const k=c=>B(keys[c]),n=c=>B(NB[c]);
  const gb=i=>B(gp&&gp.buttons[i]&&gp.buttons[i].pressed);
  const gv=i=>gp&&gp.buttons[i]?gp.buttons[i].value:0;
  const ga=i=>gp&&gp.axes[i]||0;
  const rawLX=NA.x||ga(0),rawLY=NA.y||ga(1);
  let rawRX=NA.z||ga(2),rawRY=NA.rz||ga(3);
  if(Math.abs(NA.rx)+Math.abs(NA.ry)>Math.abs(NA.z)+Math.abs(NA.rz)){rawRX=NA.rx;rawRY=NA.ry}
  const Ls=stick(rawLX,rawLY,dz),Rs=stick(rawRX,rawRY,dz);
  const dpU=B(n(19)||gb(12)||NA.hy<-.5),dpD=B(n(20)||gb(13)||NA.hy>.5),dpL=B(n(21)||gb(14)||NA.hx<-.5),dpR=B(n(22)||gb(15)||NA.hx>.5);
  I.mx=clamp(Ls[0]+k('KeyD')-k('KeyA'),-1,1);
  I.my=clamp(Ls[1]+k('KeyS')-k('KeyW')+dpD-dpU+k('ArrowDown')-k('ArrowUp'),-1,1);
  I.lx=clamp(Rs[0]+(dpR-dpL)*.8+(k('ArrowRight')-k('ArrowLeft'))*.8+(k('KeyE')-k('KeyQ'))*.8,-1,1);
  I.ly=clamp(Rs[1],-1,1);
  I.sprint=B(n(106)||n(102)||gb(10)||gb(4)||k('ShiftLeft'));
  const fireOn=B(n(105)||gb(7)||NA.rt>.5||gv(7)>.5||k('KeyX'));
  I.fireHeld=fireOn;I.fire=edge('fire',fireOn,dt,0);
  I.aim=B(n(104)||gb(6)||NA.lt>.5||gv(6)>.5||k('KeyZ'));
  I.reload=edge('rl',n(99)||gb(2)||k('KeyR'),dt,0);
  I.flash=edge('fl',n(100)||gb(3)||k('KeyF'),dt,0);
  I.view=edge('vw',n(103)||gb(5)||k('KeyV'),dt,0);
  const mup=rawLY<-.6||dpU||k('ArrowUp')||k('KeyW');
  const mdn=rawLY>.6||dpD||k('ArrowDown')||k('KeyS');
  const mlf=rawLX<-.6||dpL||k('ArrowLeft')||k('KeyA');
  const mrt=rawLX>.6||dpR||k('ArrowRight')||k('KeyD');
  I.up=edge('u',mup,dt,1);I.down=edge('d',mdn,dt,1);I.left=edge('l',mlf,dt,1);I.right=edge('r',mrt,dt,1);
  I.ok=edge('ok',n(96)||n(23)||n(66)||n(160)||gb(0)||k('Enter')||k('Space'),dt,0);
  I.b=edge('b',n(97)||gb(1),dt,0);
  I.backKey=edge('bkk',n(4)||k('Escape')||k('Backspace'),dt,0);
  I.back=edge('bk',n(97)||n(4)||gb(1)||k('Escape')||k('Backspace'),dt,0);
  I.start=edge('st',n(108)||n(109)||n(82)||gb(9)||gb(8)||k('Escape')||k('KeyP'),dt,0);
  I.anyBtn=0;if(gp)for(let i=0;i<gp.buttons.length;i++)if(gp.buttons[i].pressed)I.anyBtn=1;
  if(I.anyBtn)ensureAudio();
}
let lastRumble=0;
function rumble(strong,weak,ms){
  if(!S.rumble||!gpad)return;const now=performance.now();if(now-lastRumble<ms)return;lastRumble=now;
  try{const a=gpad.vibrationActuator;if(a&&a.playEffect)a.playEffect('dual-rumble',{duration:ms,strongMagnitude:strong,weakMagnitude:weak})}catch(e){}
}
