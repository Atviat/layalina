'use strict';
/* ====== أيهم — الواجهة: قوائم، إعدادات، HUD، الحلقة الرئيسية ====== */
const hudCache={};
function setT(id,v,h){if(hudCache[id]!==v){hudCache[id]=v;if(h)$(id).innerHTML=v;else $(id).textContent=v}}
let mode='menu',scr='main',sel=0,prevScr='main',curMenu=null,inGame=false;
const PNAMES=['Low — منخفض','Medium — متوسط','High — عالٍ','Ultra — فائق','مخصّص'];
const RESN=['320×180','480×270','640×360','960×540'];
const onoff=v=>v?'تشغيل':'إيقاف';
function R(t,k,min,max,step,fmt,on){return{type:'range',t,k,min,max,step,fmt,on}}
const cust=()=>{S.preset=4};
const gfxApply=()=>{setRes(S.res);bakeLights()};
const subBack=()=>setScreen('settings');
const BACK=()=>({t:'رجوع',f:subBack});
const SCREENS={
  main:()=>({title:'أيهم',sub:'رعب وبقاء في صحراء الأنبار — الفصل الأول',items:[
    {t:'ابدأ اللعب',f:()=>setScreen('intro')},
    {t:'طريقة اللعب',f:()=>setScreen('help')},
    {t:'الإعدادات',f:()=>{prevScr='main';setScreen('settings')}},
    ...(window.NativeBridge?[{t:'خروج',f:()=>NativeBridge.exit()}]:[])]}),
  settings:()=>({title:'الإعدادات',items:[
    {t:'الرسومات والأداء',f:()=>setScreen('sGfx')},
    {t:'الصوت',f:()=>setScreen('sAud')},
    {t:'التحكم',f:()=>setScreen('sCtl')},
    {t:'الكاميرا والمنظور',f:()=>setScreen('sCam')},
    {t:'رجوع',f:()=>setScreen(prevScr)}],back:()=>setScreen(prevScr)}),
  sGfx:()=>({title:'الرسومات والأداء',items:[
    R('حزمة الجودة','preset',0,3,1,v=>PNAMES[v],v=>{applyPreset(v);gfxApply()}),
    R('دقة العرض الداخلية','res',0,3,1,v=>RESN[v],()=>{cust();setRes(S.res)}),
    R('معدل الإطارات الأقصى','fps',0,1,1,v=>v?'30':'60',cust),
    R('جودة الظلال','shadow',0,2,1,v=>['إيقاف','متوسطة','عالية'][v],()=>{cust();bakeLights()}),
    R('المؤثرات (غبار/حبيبات)','fx',0,2,1,v=>['أساسية','متوسطة','عالية'][v],cust),
    R('تكيّف الدقة تلقائياً','auto',0,1,1,onoff,cust),
    R('السطوع','bright',5,20,1,v=>v*10+'%',buildTone),
    BACK()],back:subBack}),
  sAud:()=>({title:'الصوت',items:[
    R('المؤثرات والأصوات','vol',0,10,1,v=>v*10+'%',()=>{if(sfxBus)sfxBus.gain.value=S.vol/10}),
    R('الموسيقى','music',0,10,1,v=>v*10+'%',()=>{if(musBus)musBus.gain.value=S.music/10}),
    BACK()],back:subBack}),
  sCtl:()=>({title:'التحكم',items:[
    R('حساسية النظر أفقياً','sens',2,30,1,v=>(v/10).toFixed(1)+'×'),
    R('حساسية النظر عمودياً','sensY',2,30,1,v=>(v/10).toFixed(1)+'×'),
    R('عكس المحور العمودي','inv',0,1,1,onoff),
    R('المنطقة الميتة للعصا','dz',0,40,2,v=>v+'%'),
    R('اهتزاز يد التحكم','rumble',0,1,1,onoff),
    R('ركض غير محدود','infStam',0,1,1,onoff),
    BACK()],back:subBack}),
  sCam:()=>({title:'الكاميرا والمنظور',items:[
    R('المنظور','view',0,1,1,v=>v?'الشخص الثالث':'الشخص الأول'),
    R('مجال الرؤية FOV','fov',50,110,5,v=>v+'°'),
    R('اهتزاز الكاميرا أثناء المشي','bob',0,1,1,onoff),
    BACK()],back:subBack}),
  help:()=>({title:'طريقة اللعب',body:
"العصا اليسرى: حركة     العصا اليمنى: نظر     RT: إطلاق النار     LT: تصويب\nX: إعادة التعبئة     Y: الكشاف     A: تفاعل / قفز     B: انحناء / إغلاق الورقة\nLB أو L3: ركض     RB: تبديل المنظور (أول/ثالث)     Start: إيقاف مؤقت\n\nالسعلوة تسمع الركض والطلقات أكثر مما ترى. الانحناء يخفيك، والخزانة تخفيك\nلكنها قد تفتّش عنك. الكشاف المسلّط عليها لثانية ونصف يجعلها تفرّ.\nاجمع الأوراق لتفهم القصة، وابحث عن المفتاح والفيوز والوقود.",
    items:[{t:'رجوع',f:()=>setScreen('main')}],back:()=>setScreen('main')}),
  intro:()=>({title:'الفصل الأول',sub:'أيهم — الطريق الأخير',body:
"أنتَ أيهم، سائق أجرة من الرمادي. مات أبوك ناجي وترك وصية غريبة:\n«اذهب إلى قرية الغوير وخذ السجلّ، ولا تتأخر».\nتقود بنفسك في ليلة عاصفة ترابية، والراديو يحذّر من القرى المهجورة...\n\nلديك مسدس بثماني طلقات وكشاف، وشيء ما يتجوّل بين البيوت.",
    items:[{t:'انطلق (قيادة السيارة)',f:()=>startGame(false)},{t:'ابدأ من القرية مباشرة',f:()=>startGame(true)},{t:'رجوع',f:()=>setScreen('main')}],back:()=>setScreen('main')}),
  pause:()=>({title:'إيقاف مؤقت',items:[
    {t:'متابعة',f:()=>resumeGame()},
    {t:'الإعدادات',f:()=>{prevScr='pause';setScreen('settings')}},
    {t:'القائمة الرئيسية',f:()=>{inGame=false;$('hud').style.display='none';setScreen('main')}}],back:()=>resumeGame()}),
  over:()=>({title:'انتهت الليلة',sub:'السعلوة وجدتك...',items:[
    {t:'حاول مجدداً',f:()=>startGame(true)},
    {t:'القائمة الرئيسية',f:()=>setScreen('main')}]}),
  chapterEnd:()=>({title:'نهاية الفصل الأول',sub:'الفصل الثاني: قريباً',body:'أنجزتَ الهروب... لكن السجلّ يهمس باسمك: أيهم. وهي ما زالت تنتظر.',items:[
    {t:'العب مجدداً',f:()=>setScreen('intro')},
    {t:'القائمة الرئيسية',f:()=>setScreen('main')}]})
};
function setScreen(n){scr=n;sel=0;mode='menu';$('menu').style.display='flex';renderMenu()}
function renderMenu(){
  const d=SCREENS[scr]();curMenu=d;
  $('mT').textContent=d.title;$('mT').style.fontSize=scr==='main'?'16vh':(d.items.length>6?'6vh':'8vh');
  $('mS').textContent=d.sub||'';$('mS').style.display=d.sub?'block':'none';
  $('mB').textContent=d.body||'';$('mB').style.display=d.body?'block':'none';
  const ul=$('mL');ul.innerHTML='';ul.className=d.items.length>6?'dense':'';
  d.items.forEach((it,i)=>{
    const li=document.createElement('li');if(i===sel)li.className='sel';
    const a=document.createElement('span');a.textContent=it.t;li.appendChild(a);
    if(it.type==='range'){const b=document.createElement('b');b.textContent='◀  '+it.fmt(S[it.k])+'  ▶';li.appendChild(b)}
    ul.appendChild(li);
  });
}
function updateMenu(){
  if(!curMenu)return;const items=curMenu.items;let ch=false;
  if(I.up){sel=(sel+items.length-1)%items.length;ch=true;SFX.menu()}
  if(I.down){sel=(sel+1)%items.length;ch=true;SFX.menu()}
  const it=items[sel];
  if(it.type==='range'){
    let dlt=0;if(I.left)dlt=-it.step;if(I.right)dlt=it.step;
    if(I.ok){dlt=it.step;if(S[it.k]+dlt>it.max)dlt=it.min-S[it.k]}
    if(dlt){S[it.k]=clamp(S[it.k]+dlt,it.min,it.max);saveS();SFX.menu();ch=true;if(it.on)it.on(S[it.k]);saveS()}
  }else if(I.ok&&it.f){SFX.menu();it.f();return}
  if(I.back&&curMenu.back){SFX.menu();curMenu.back();return}
  if(ch)renderMenu();
}

/* ---------- بدء/إيقاف/نهاية ---------- */
function startGame(skip){
  ensureAudio();newGame();inGame=true;$('menu').style.display='none';$('note').style.display='none';$('hud').style.display='none';
  try{if(navigator.wakeLock)navigator.wakeLock.request('screen').catch(()=>{})}catch(e){}
  if(skip)beginPlay();else driveStart();
}
function beginPlay(){
  mode='play';G.fade=0;G.bars=0;P.flash=true;$('menu').style.display='none';$('hud').style.display='block';
  say('الهدف: ابحث عن مساعدة في القرية... بحذر',6);updateCamera(1);
}
function pauseGame(){if(mode!=='play')return;$('hud').style.display='none';setScreen('pause')}
function resumeGame(){mode='play';$('menu').style.display='none';$('hud').style.display='block'}
function endingStart(){$('hud').style.display='none';$('note').style.display='none';cineStart('end')}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame()});

/* ---------- HUD ---------- */
function updateHud(){
  $('bBat').style.width=P.bat+'%';$('bSta').style.width=P.stam+'%';$('bHp').style.width=P.hp+'%';
  setT('ammo',G.gun.reload>0?'<small>إعادة التعبئة…</small>':G.gun.mag+' <small>/ '+G.gun.res+'</small>',1);
  setT('prompt',G.prompt||'');
  setT('msg',G.msgT>0?G.msg:'');$('msg').style.opacity=G.msgT>0?1:0;
}

/* ---------- تكيّف الأداء ---------- */
let fAcc=0,fN=0,adaptCD=2;
function adapt(dt){
  if(!S.auto)return;fAcc+=dt;fN++;if(fN<45)return;
  const avg=fAcc/fN,budget=1/(S.fps?30:60);fAcc=0;fN=0;adaptCD-=1;
  if(avg>budget*1.35&&effRes>0&&adaptCD<=0){setRes(effRes-1);adaptCD=3}
  else if(avg<budget*.5&&effRes<S.res&&adaptCD<=0){setRes(effRes+1);adaptCD=8}
}

/* ---------- الحلقة الرئيسية ---------- */
let last=performance.now(),menuAng=0,fpsAcc=0,fpsN=0;
function frame(now){
  requestAnimationFrame(frame);
  const raw=(now-last)/1000;if(S.fps===1&&raw<.0295)return;
  last=now;const dt=Math.min(.05,raw);
  window.__fps=raw>0?1/raw:0;
  poll(dt);G.mode=mode;
  if(I.view&&mode==='play'){S.view=S.view?0:1;saveS();say('المنظور: '+(S.view?'الشخص الثالث':'الشخص الأول'),2)}
  if(mode==='play'){
    if(I.start||I.backKey)pauseGame();
    else{updatePlay(dt);if(G.dead){mode='dead'}else updateHud()}
    adapt(dt);renderFrame(dt);
  }else if(mode==='dead'){
    G.deadT+=dt;G.t+=dt;G.hurt=Math.max(0,G.hurt-dt);updateCamera(dt);renderFrame(dt);
    const k=clamp(G.deadT/.25,0,1),a=ART.cr.atk,hh=H*(.9+k*.9+G.deadT*.1),ww=hh*.5,sx=(Math.random()-.5)*W*.03,sy=(Math.random()-.5)*H*.03;
    ctx.globalAlpha=k;ctx.drawImage(a.cv,W/2-ww/2+sx,H*1.05-hh+sy,ww,hh);ctx.drawImage(a.emCv,W/2-ww/2+sx,H*1.05-hh+sy,ww,hh);ctx.globalAlpha=1;
    ctx.fillStyle='rgba(120,0,0,'+(.2+Math.random()*.15)+')';ctx.fillRect(0,0,W,H);
    const f=clamp((G.deadT-1.6)/.6,0,1);if(f>0){ctx.fillStyle='rgba(0,0,0,'+f+')';ctx.fillRect(0,0,W,H)}
    if(G.deadT>2.3){inGame=false;setScreen('over')}
  }else if(mode==='drive'){
    driveUpdate(dt);if(D)driveDraw(dt);
  }else if(mode==='cine'||mode==='end'){
    cineUpdate(dt);if(C)cineDraw();
  }else{
    G.t+=dt;G.storm=.5;
    if(!inGame){menuAng+=dt*.05;P.a=START_POS.a+Math.sin(menuAng)*1.3;P.flash=false;P.pitch=-.02;updateCamera(dt)}
    compositeLM(.9+.08*Math.sin(G.t*13));
    updateMenu();menuAmb(dt);renderFrame(dt);
    const cs=(gpad||hasNative)?'🎮 يد التحكم متصلة':'اضغط أي زر في اليد أو الريموت';
    setT('foot',cs+(lastIn?' — آخر إدخال: '+lastIn:''));
  }
}

/* ---------- أجواء القائمة الرئيسية: رياح وهمسات وعود بعيد ---------- */
let menuAT=4;
function menuAmb(dt){
  if(!AC||inGame)return;
  windG.gain.setTargetAtTime(.2,AC.currentTime,.5);windBP.frequency.setTargetAtTime(380,AC.currentTime,.5);
  musicTick(dt,.32,'calm');
  menuAT-=dt;if(menuAT>0)return;menuAT=5+Math.random()*9;
  const a=Math.random()*TAU,o=sp(P.x+Math.cos(a)*9,P.y+Math.sin(a)*9),r=Math.random();
  if(r<.25)SFX.whisper(o);else if(r<.45)SFX.creak(o);else if(r<.6)SFX.growl(o,.5);else if(r<.75)SFX.owl(o);else if(r<.9)SFX.knock(o);else SFX.bark(o);
}

/* ---------- الإقلاع ---------- */
initRender();makeTextures();makeSprites();newGame();
mode='menu';P.flash=false;G.mode='menu';setScreen('main');
requestAnimationFrame(frame);
