'use strict';
/* ====== ليالينا — منطق اللعب: لاعب، كاميرا، مسدس، وحش، مهام، أحداث ====== */
let P=null,G=null;
const NOTES={
  note0:['من دفتر أبو علي','الليلة الخامسة. الكل هجر القرية إلا أنا وأم حمدان. تقول إن شيئاً يمشي حول البئر ليلاً ويعدّ البيوت. خبّأتُ مفتاح بيت المختار... إن عدتم فلا تخرجوا بعد المغرب.'],
  note1:['ورقة ممزّقة','لا تركضوا. إنها تسمع الخطى أكثر مما ترى، والضوء يؤلمها. إن ناداك أحد باسمك من العتمة فلا تلتفت.'],
  note2:['من المختار','الفيوز الأخير تركته في الدرج. مولّد الكوخ الشرقي يحتاج وقوداً وفيوزاً. بدون ضوء لن يُفتح بيت أم حمدان. لا تدخلوه في الظلام.'],
  note3:['ملصق على المولّد','الوقود في الحظيرة جنوب غرب القرية. شغّلوه فتضيء كل أعمدة الطريق... لكن صوته سيوقظ ما نام.'],
  note4:['سجلّ الديوانية','كُتبت أسماء اثنين وأربعين شخصاً. واحد وأربعون منها شُطبت بالفحم. بقي اسم واحد... لا يُقرأ.'],
  note5:['حظيرة الأغنام','عددتُ الأغنام فنقصت واحدة كل ليلة. الليلة عددتُ نفسي... فنقصتُ أنا.'],
  note6:['أم حمدان','دفنتُ السجلّ في بيتي كي لا تأخذه. من يملك السجلّ يملك أسماءهم، وهي ستطلبه. إن أخذته فاهرب إلى الطريق ولا تلتفت أبداً.'],
  note7:['الشيخ','هذه ليست جنّية. هذه ما تبقّى من وعدٍ قديم. لا تردّ عليها إن ناداك صوتٌ باسمك.'],
  note8:['على الجدار بالفحم','«ليالينا»... وتحتها: «هي تسمّيكم بأسمائكم قبل أن تصلوا».']
};
const STAGES=[
  'اترك السيارة المعطّلة وابحث عن بيت تطلب منه المساعدة (البيت المقابل على الطريق)',
  'ابحث داخل بيت أبو علي عن مفتاح بيت المختار',
  'افتح بيت المختار (الشمال الشرقي) وخذ الفيوز',
  'اعثر على وقود المولّد في الحظيرة (الجنوب الغربي)',
  'شغّل المولّد في الكوخ الشرقي (يحتاج وقوداً وفيوزاً)',
  'ادخل بيت أم حمدان (شرق القرية) واعثر على السجلّ',
  'اهرب إلى السيارة قبل أن تلحق بك السعلوة!'
];
function say(m,s){G.msg=m;G.msgT=s||4}
function sfxAt(x,y,fn,a,b){const o=sp(x,y);fn(o,a,b)}

/* ---------- لعبة جديدة ---------- */
function newGame(){
  buildWorld();
  P={x:START_POS.x,y:START_POS.y,a:START_POS.a,pitch:0,z:0,vz:0,air:false,crouch:false,hp:100,stam:100,stamDelay:0,bat:100,flash:false,bob:0,step:0,
     hidden:false,hideObj:null,moving:false,sprinting:false,art:ART.pl.idle,moveSp:0,fireAnim:0,lastX:0,lastY:0};
  G={mode:'play',t:0,storm:.45,stormT:0,fx:[],hurt:0,hitMark:0,close:0,fade:0,fadeCol:'0,0,0',bars:0,spread:0,aimK:0,swayX:0,swayY:0,bobAmt:0,recRot:0,
     gun:{mag:8,res:16,cd:0,reload:0,reloadMax:1.7,flash:0,kick:0,rstep:0},
     has:{},genOn:false,stage:0,notes:0,msg:'',msgT:0,prompt:'',noteT:0,flickT:0,evT:12,hbT:0,musThreat:0,deadT:0,dead:false,
     noiseT:0,noiseX:0,noiseY:0,blackout:0,ended:false,carMsgT:0,stageT:0,aggro:0,watchT:70+Math.random()*50,
     cr:null,watch:{on:false,x:0,y:0,alpha:0,t:0},kills:0,chase:false,lastNote:null};
  const rr=mkRng((Math.random()*1e9)|0);
  const sp0=openSpot(rr,[START_POS.x,START_POS.y],26);
  G.cr={x:sp0[0],y:sp0[1],state:'dormant',hp:10,hpMax:10,speed:1.4,art:ART.cr.idle,alpha:1,vis:false,anim:0,fieldP:null,fieldT:0,loseT:0,stun:0,fleeT:0,patField:null,patT:null,fieldDone:true,
    lx:0,ly:0,growlT:4,stepT:0,rT:3,atkCd:0,standT:0,downT:0,checkT:0,searchT:0,seen:false,rr};
  CAM.tp=S.view?1:0;CAM.tpA=0;updateCamera(1);
  G.bars=0;G.fade=0;
  updateStageHud();
}

/* ---------- كاميرا: أول/ثالث شخص بانتقال سلس ---------- */
function updateCamera(dt){
  const tgt=S.view?1:0;CAM.tp+=(tgt-CAM.tp)*Math.min(1,dt*5.5);if(Math.abs(CAM.tp-tgt)<.002)CAM.tp=tgt;
  const e=CAM.tp*CAM.tp*(3-2*CAM.tp);
  const sprintK=P.sprinting?.35:0,aimK=G.aimK||0;
  const dist=(1.85-aimK*.45+sprintK)*e,side=(.42+aimK*.12)*e;
  const dx=Math.cos(P.a),dy=Math.sin(P.a),rx=-dy,ry=dx;
  const tx=P.x-dx*dist+rx*side,ty=P.y-dy*dist+ry*side;
  let cx=P.x,cy=P.y;const len=Math.hypot(tx-P.x,ty-P.y),steps=Math.max(1,Math.ceil(len/.06));
  for(let i=1;i<=steps;i++){const t=i/steps,nx=P.x+(tx-P.x)*t,ny=P.y+(ty-P.y)*t;if(cellS(Math.floor(nx+(nx-P.x)*.15),Math.floor(ny+(ny-P.y)*.15)))break;cx=nx;cy=ny}
  CAM.x=cx;CAM.y=cy;CAM.a=P.a;
  CAM.pitch=P.pitch*(1-.3*e)+e*.035;CAM.z=P.z+e*.15-(P.crouch?0:0);
  const ad=Math.hypot(cx-P.x,cy-P.y);CAM.tpA=e*clamp((ad-.5)/.6,0,1);
  CAM.plane=Math.tan(S.fov*Math.PI/360)*lerp(1,.8,aimK);
  CAM.shake=Math.max(0,CAM.shake-dt*2.2);
}

/* ---------- المهام ---------- */
function updateStageHud(){setT('obj','<div class="tt">الفصل الأول — الطريق الأخير</div><div>'+(STAGES[G.stage]||'')+'</div>',1)}
function advance(n){if(G.stage>=n)return;G.stage=n;SFX.chime();say('هدف جديد',2.5);updateStageHud()}
function showNote(id){const n=NOTES[id];if(!n)return;G.noteT=14;G.notes++;$('note').innerHTML='<b>'+n[0]+'</b><br>'+n[1]+'<div class="hint">B: إغلاق</div>';$('note').style.display='block'}
function collect(o){
  o.gone=true;SFX.pick();rumble(.2,.3,90);const id=o.id;
  if(id==='ammo'){G.gun.res+=8;say('ذخيرة +8')}
  else if(id==='band'){P.hp=Math.min(100,P.hp+45);say('ضمادة: صحة +45')}
  else if(id==='cell'){P.bat=Math.min(100,P.bat+45);say('بطارية الكشاف +45')}
  else if(id&&id.startsWith('note'))showNote(id);
  else if(id==='key1'){G.has.key1=1;say('وجدتَ مفتاح بيت المختار',5);advance(2);sfxAt(HOUSES[0].dx+.5,HOUSES[0].y+1,SFX.steps,6);setTimeout(()=>{if(G&&G.mode==='play')SFX.whisper(sp(P.x-1,P.y-2))},2500)}
  else if(id==='fuse'){G.has.fuse=1;say('وجدتَ الفيوز... هناك شيء خلفك',5);advance(3);scare1()}
  else if(id==='jerry'){G.has.jerry=1;say('وجدتَ جالون الوقود',4);advance(4)}
  else if(id==='ledger'){G.has.ledger=1;say('السجلّ في يدك... الأنوار تنطفئ!',6);ledgerScare()}
}
function unlockHouse(h){
  if(!h.door)return;const y=h.y+h.h-1;[h.dx,h.dx+1].forEach(x=>{map[y*N+x]=0;ceilIn[y*N+x]=1;ftype[y*N+x]=2});h.door=0;
  sfxAt(h.dx+1,y,SFX.door);rumble(.2,.2,200);
}
function scare1(){
  const c=G.cr,h=HOUSES[1];G.flickT=3;LT.muz=0;CAM.shake=.6;SFX.thud(sp(h.dx,h.y+1));
  // يظهر الوحش عند الباب خلف اللاعب
  let bx=h.dx+.8,by=h.y+h.h-1.6;if(!free(bx,by,.3)){bx=h.dx+.5;by=h.y+h.h-2.5}
  c.x=bx;c.y=by;c.vis=true;c.state='stand';c.standT=2.6;c.hp=c.hpMax;c.alpha=1;c.growlT=3;
  setTimeout(()=>{if(G&&G.mode==='play')SFX.growl(sp(c.x,c.y),.8)},1400);
}
function ledgerScare(){
  G.blackout=1;lights.forEach(L=>{if(L.kind==='lantern'||L.kind==='lamp'){L._was=L.on;L.on=0}});bakeLights();
  const c=G.cr,h=HOUSES[5];let bx=h.dx+.5,by=h.y+h.h-2.2;if(!free(bx,by,.3)){bx=h.dx;by=h.y+3}
  c.x=bx;c.y=by;c.vis=true;c.state='stand';c.standT=1.8;c.hp=c.hpMax;c.alpha=1;CAM.shake=1;SFX.screech();G.aggro=999;G.chase=true;advance(6);
  setTimeout(()=>{lights.forEach(L=>{if(L.kind==='lamp'&&L._was)L.on=1});bakeLights();G.blackout=0},9000);
}
function startGenerator(gen){
  G.genOn=true;gen.on=1;lights.forEach(L=>{if(L.kind==='lamp'){L.on=1;L.obj.on=1}});bakeLights();unlockHouse(HOUSES[5]);
  SFX.thud(sp(gen.x,gen.y));SFX.door(sp(gen.x,gen.y));noise(1.4,200,.5,'lowpass',sp(gen.x,gen.y));
  say('عاد النور إلى الطريق... وانفتح بيت أم حمدان',6);advance(5);CAM.shake=.5;G.aggro=40;
  if(AC){genG=AC.createGain();genG.gain.value=0;const o=AC.createOscillator();o.type='sawtooth';o.frequency.value=47;const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=180;o.connect(lp);lp.connect(genG);o.start();
    const s=AC.createBufferSource();s.buffer=noiseBuf;s.loop=true;const lp2=AC.createBiquadFilter();lp2.type='lowpass';lp2.frequency.value=260;s.connect(lp2);const g2=AC.createGain();g2.gain.value=.5;lp2.connect(g2);g2.connect(genG);s.start();genG.connect(sfxBus)}
}

/* ---------- اللاعب ---------- */
function nearestInteract(){
  let best=null,bd=9;
  for(const h of HOUSES){if(h.door){const d=Math.hypot(P.x-(h.dx+1),P.y-(h.y+h.h-.5));if(d<1.7&&d<bd){bd=d;best={t:'door',h,txt:'A: فتح الباب'}}}}
  for(const o of objs){if(o.gone)continue;
    if(o.hide&&!P.hidden){const d=Math.hypot(P.x-o.x,P.y-o.y);if(d<1.3&&d<bd){bd=d;best={t:'hide',o,txt:'A: الاختباء في الخزانة'}}}
    if(o.generator&&!o.on){const d=Math.hypot(P.x-o.x,P.y-o.y);if(d<1.7&&d<bd){bd=d;best={t:'gen',o,txt:'A: تشغيل المولّد'}}}}
  return best;
}
function doInteract(it){
  if(it.t==='door'){const h=it.h;if(h.locked==='key1'&&G.has.key1){unlockHouse(h);say('فتحتَ بيت المختار',4)}else{SFX.locked(sp(h.dx+1,h.y+h.h));say(h.locked==='key1'?'الباب مقفل... ابحث عن المفتاح':'الباب مقفل من الداخل',3)}}
  else if(it.t==='hide'){P.hidden=true;P.hideObj=it.o;P.hx=P.x;P.hy=P.y;P.x=it.o.x;P.y=it.o.y;P.flash=false;SFX.door(sp(P.x,P.y));say('احبس أنفاسك... B: خروج',4)}
  else if(it.t==='gen'){if(G.has.fuse&&G.has.jerry)startGenerator(it.o);else{SFX.locked(sp(it.o.x,it.o.y));const n=[];if(!G.has.fuse)n.push('الفيوز');if(!G.has.jerry)n.push('الوقود');say('المولّد يحتاج: '+n.join(' + '),4)}}
}
function exitHide(){
  const o=P.hideObj;P.hidden=false;P.hideObj=null;
  const tries=[[0,.8],[0,-.8],[.8,0],[-.8,0]];for(const t of tries){if(free(o.x+t[0],o.y+t[1],.2)){P.x=o.x+t[0];P.y=o.y+t[1];return}}P.x=P.hx;P.y=P.hy;
}
function updatePlayer(dt){
  const G_=G;
  // نظر
  const cvv=v=>v*(.35+.65*Math.abs(v)),ls=S.sens/10*(I.aim?.55:1),lsy=S.sensY/10*(I.aim?.55:1);
  if(!P.hidden){P.a+=cvv(I.lx)*dt*3.4*ls;P.pitch=clamp(P.pitch-cvv(I.ly)*dt*1.9*lsy*(S.inv?-1:1),-.45,.45)}
  G.aimK+=((I.aim&&!P.hidden?1:0)-G.aimK)*Math.min(1,dt*9);
  // قفز/انحناء/تفاعل
  G.prompt='';
  const it=P.hidden?null:nearestInteract();if(it)G.prompt=it.txt;
  if(P.hidden){if(I.b||I.ok)exitHide();P.moving=false;P.sprinting=false;return}
  if(I.ok){if(it)doInteract(it);else if(!P.air&&!P.crouch){P.air=true;P.vz=2.4;SFX.stepSand(.6)}}
  if(I.b){if(G.noteT>0){G.noteT=0;$('note').style.display='none'}else P.crouch=!P.crouch}
  // حركة
  const dX=Math.cos(P.a),dY=Math.sin(P.a),rX=-dY,rY=dX;
  let fw=-I.my,st=I.mx;const raw=Math.hypot(fw,st),ml=Math.min(1,raw),moving=ml>.04;
  const sprint=!!(I.sprint&&moving&&!I.aim&&(S.infStam||P.stam>1));
  const cm=(P.crouch?.5:1)*(I.aim?.6:1);
  const sp0=(sprint?4.8:(.9+1.9*ml))*cm;const nrm=raw||1;
  const vx=moving?(dX*fw+rX*st)/nrm*sp0:0,vy=moving?(dY*fw+rY*st)/nrm*sp0:0;
  const nx=P.x+vx*dt,ny=P.y+vy*dt;if(free(nx,P.y))P.x=nx;if(free(P.x,ny))P.y=ny;
  P.moving=moving;P.sprinting=sprint;P.moveSp=moving?sp0:0;
  if(sprint&&!S.infStam){P.stam-=18*dt;P.stamDelay=1.2}else{P.stamDelay-=dt;if(P.stamDelay<=0)P.stam=Math.min(100,P.stam+20*dt)}
  P.stam=clamp(P.stam,0,100);
  const ground=P.crouch?-.22:0;
  if(P.air){P.vz-=9*dt;P.z+=P.vz*dt;if(P.z<=ground){P.z=ground;P.vz=0;P.air=false;(ftype[(P.y|0)*N+(P.x|0)]===2?SFX.stepIndoor:SFX.stepSand)(.8)}}
  else P.z+=(ground-P.z)*Math.min(1,dt*10);
  if(moving){P.bob+=dt*sp0*1.7;P.step+=dt*sp0*.6;if(P.step>=1&&!P.air){P.step=0;const v=clamp(sp0/4.8,.2,1);(ftype[(P.y|0)*N+(P.x|0)]===2?SFX.stepIndoor:SFX.stepSand)(v)}}
  G.bobAmt=(moving&&S.bob&&CAM.tp<.5)?Math.sin(P.bob)*H*(sprint?.016:.011):Math.sin(G.t*1.3)*H*.0025;
  G.swayX=lerp(G.swayX,-I.lx*.02+(moving?Math.sin(P.bob*.5)*.004:0),Math.min(1,dt*8));G.swayY=lerp(G.swayY,I.ly*.02,Math.min(1,dt*8));
  // كشاف
  if(I.flash){P.flash=!P.flash;SFX.click()}
  if(P.flash){P.bat-=dt*.9;if(P.bat<=0){P.bat=0;P.flash=false;say('انتهت بطارية الكشاف... العتمة تقترب',4)}}
  // تنفّس بعد الركض
  if(P.wasSprint&&!sprint&&P.stamUsed>1.2)SFX.breath(.8);P.wasSprint=sprint;P.stamUsed=sprint?(P.stamUsed||0)+dt:0;
  // التقاط
  for(const o of objs){if(o.gone||!o.pick)continue;if(Math.abs(o.x-P.x)<.9&&Math.abs(o.y-P.y)<.9&&Math.hypot(o.x-P.x,o.y-P.y)<.85)collect(o)}
  // رسم الشخصية (منظور ثالث)
  const aimPose=I.aim||G.gun.flash>0||P.fireAnim>0;
  P.art=P.moving?(aimPose?(Math.floor(P.bob/1.6)&1?ART.pl.aw0:ART.pl.aw1):(Math.floor(P.bob/1.6)&1?ART.pl.w0:ART.pl.w1)):(aimPose?ART.pl.aim:ART.pl.idle);
  P.fireAnim=Math.max(0,P.fireAnim-dt);
}

/* ---------- المسدس ---------- */
function updateGun(dt){
  const g=G.gun;g.cd=Math.max(0,g.cd-dt);g.flash=Math.max(0,g.flash-dt*14);g.kick=Math.max(0,g.kick-dt*7);LT.muz=Math.max(0,LT.muz-dt*16);G.recRot=lerp(G.recRot,0,Math.min(1,dt*10));
  G.spread=lerp(G.spread,(P.moving?(P.sprinting?.09:.035):.008)*(I.aim?.45:1)*(P.crouch?.6:1)+g.kick*.05,Math.min(1,dt*10));
  G.hitMark=Math.max(0,G.hitMark-dt);
  if(g.reload>0){const before=g.reload;g.reload-=dt;const m=g.reloadMax;
    if(before>m-.1&&g.reload<=m-.1)SFX.reloadOut();if(before>m*.55&&g.reload<=m*.55)SFX.reloadIn();if(before>.2&&g.reload<=.2)SFX.slide();
    if(g.reload<=0){const need=8-g.mag,take=Math.min(need,g.res);g.mag+=take;g.res-=take;g.reload=0}}
  if(P.hidden)return;
  if(I.reload&&g.reload<=0&&g.mag<8&&g.res>0){g.reload=g.reloadMax}
  if(I.fire&&g.reload<=0&&g.cd<=0){
    if(g.mag>0){shoot()}else{SFX.dry();g.cd=.3;if(g.res>0)g.reload=g.reloadMax}
  }
}
function shoot(){
  const g=G.gun;g.mag--;g.cd=.2;g.flash=1;g.kick=1;LT.muz=1;P.fireAnim=.35;
  P.pitch=clamp(P.pitch+.016,-.45,.45);G.recRot=-.05;CAM.shake=Math.max(CAM.shake,.18);rumble(.7,.5,120);
  SFX.shot(sp(P.x,P.y));
  G.noiseT=6;G.noiseX=P.x;G.noiseY=P.y;
  const sprd=G.spread*(Math.random()*2-1),sprdV=G.spread*(Math.random()*2-1)*.6;
  const a=P.a+sprd,ca=Math.cos(a),sa=Math.sin(a);
  // مسافة الجدار
  let wd=40,hx=0,hy=0;for(let t=.1;t<40;t+=.07){const x=P.x+ca*t,y=P.y+sa*t;if(cellS(Math.floor(x),Math.floor(y))){wd=t;hx=x;hy=y;break}}
  // الوحش
  const c=G.cr;let hitC=false;
  if(c.vis&&c.state!=='down'&&c.state!=='dormant'){
    const rx=c.x-P.x,ry=c.y-P.y,tt=rx*ca+ry*sa,lat=Math.abs(-rx*sa+ry*ca);
    if(tt>.2&&tt<wd&&lat<.2){
      const h=.5+P.z+((P.pitch+sprdV)*.9-(I.aim?0:.03))*tt;
      if(h>0&&h<1.05){hitC=true;const head=h>.76;
        c.hp-=head?4:1.7;c.stun=0;G.hitMark=.25;SFX.hit(sp(c.x,c.y));
        if(c.state!=='stand'||true){c.state=c.hp<=0?'down':'stag';c.standT=0;c.stagT=head?1.4:.8;c.fieldT=0}
        const k=head?.5:.25;c.x+=ca*k*.5;c.y+=sa*k*.5;if(cellS(c.x|0,c.y|0)){c.x-=ca*k*.5;c.y-=sa*k*.5}
        if(c.hp<=0){c.downT=0;say('سقطت... لكنها ستعود',4);G.kills++}
        addFx(c.x,c.y,ART.puff,.35,.35,.5,.4,{grow:1});
      }
    }
  }
  if(!hitC&&wd<40){// ثقب رصاصة + غبار
    const px=hx-ca*.06,py=hy-sa*.06,hh=.5+P.z+(P.pitch*.9-(I.aim?0:.03))*wd;
    addFx(px,py,ART.hole,.07,.07,clamp(hh,.02,.95),90,{});
    addFx(px,py,ART.puff,.3,.3,clamp(hh,.02,.9)-.12,.55,{grow:1});
    sfxAt(px,py,SFX.hit);
  }
}
function addFx(x,y,art,sw,sh,lift,life,o){G.fx.push(Object.assign({x,y,art,sw,sh,lift,life,max:life},o||{}));if(G.fx.length>40){const i=G.fx.findIndex(f=>f.max<10);G.fx.splice(i<0?0:i,1)}}

/* ---------- الوحش ---------- */
function updateCreature(dt){
  const c=G.cr;
  if(c.state==='dormant'){ // يبقى هادئاً حتى يدخل اللاعب القرية
    if(G.stage>=1&&G.stageT>18){c.state='patrol';c.vis=true;c.alpha=1}return}
  c.atkCd=Math.max(0,c.atkCd-dt);
  const dx=P.x-c.x,dy=P.y-c.y,d=Math.hypot(dx,dy);
  const aggro=G.aggro>0;if(aggro)G.aggro-=dt;
  const base=1.25+G.stage*.13+(aggro?.5:0),hunt=2.35+G.stage*.2+(G.chase?1.5:0)+(aggro?.4:0);
  const seeR=P.hidden?(d<1.4?3:0):(P.crouch?7:(P.flash?16:12));
  const sees=!P.hidden&&d<seeR&&los(c.x,c.y,P.x,P.y);
  const heard=(P.sprinting&&d<9)||(G.noiseT>0&&Math.hypot(c.x-G.noiseX,c.y-G.noiseY)<28);
  if(sees){c.lx=P.x;c.ly=P.y}
  c.fieldT-=dt;
  // إضاءة الكشاف على الوحش تُخيفه
  let lit=false;
  if(P.flash&&P.bat>0&&d<9&&los(P.x,P.y,c.x,c.y)){let ang=Math.atan2(c.y-P.y,c.x-P.x)-P.a;ang=Math.atan2(Math.sin(ang),Math.cos(ang));if(Math.abs(ang)<.3)lit=true}
  if(lit&&c.state!=='flee'&&c.state!=='stand'&&c.state!=='down'){c.stun+=dt;if(c.stun>1.5){c.state='flee';c.fleeT=6;c.stun=0;c.patField=null;c.fieldDone=true;SFX.growl(sp(c.x,c.y),.9);say('الضوء يخيفها... ابتعدت',3)}}
  else c.stun=Math.max(0,c.stun-dt*.6);
  let moving=false,spd=0;
  if(c.state==='stand'){c.standT-=dt;if(c.standT<=0){c.state='hunt';c.loseT=0;c.fieldT=0;SFX.growl(sp(c.x,c.y),1)}}
  else if(c.state==='stag'){c.stagT-=dt;if(c.stagT<=0){c.state='hunt';c.loseT=0}}
  else if(c.state==='down'){c.downT+=dt;c.alpha=clamp(1-(c.downT-1.2)/2,0,1);if(c.downT>3.5)c.vis=false;
    if(c.downT>20){const sp1=openSpot(c.rr,[P.x,P.y],26);c.x=sp1[0];c.y=sp1[1];c.hp=c.hpMax;c.state='patrol';c.vis=true;c.alpha=1;c.patField=null;c.fieldDone=true}}
  else if(c.state==='patrol'){
    if(sees||heard||d<3){c.state='hunt';c.loseT=0;c.fieldT=0;SFX.growl(sp(c.x,c.y),.9)}
    else{if(!c.patField||c.fieldDone){const t=Math.random()<.5?nearPlayer(14):openSpot(c.rr,null,0);c.patField=bfs(t[0],t[1]);c.patT=t;c.fieldDone=false}
      moving=stepAlong(c,c.patField,base,dt);spd=base;if(!moving||Math.hypot(c.patT[0]-c.x,c.patT[1]-c.y)<.7)c.fieldDone=true}
  }else if(c.state==='hunt'){
    if(sees||heard)c.loseT=0;else c.loseT+=dt;
    if(c.fieldT<=0){const tx=sees?P.x:c.lx||P.x,ty=sees?P.y:c.ly||P.y;c.fieldP=bfs(tx,ty);c.fieldT=.3}
    if(c.fieldP){moving=stepAlong(c,c.fieldP,hunt,dt);spd=hunt}
    c.growlT-=dt;if(c.growlT<=0){c.growlT=3+Math.random()*3;SFX.growl(sp(c.x,c.y),clamp(1-d/18,.15,1))}
    // اختباء: تصل لآخر موضع وتفتّش
    if(P.hidden&&Math.hypot(c.x-c.lx,c.y-c.ly)<1.6){c.state='check';c.checkT=3.2}
    else if(c.loseT>5.5){c.state='search';c.searchT=6}
    if(d<.9&&c.atkCd<=0&&!P.hidden)attackPlayer(c,dx,dy,d);
  }else if(c.state==='check'){
    c.checkT-=dt;if(c.checkT<=0){const near=P.hidden&&Math.hypot(c.x-P.x,c.y-P.y)<2.2;
      if(near&&Math.random()<.45){P.hidden=false;exitHide();P.hp-=40;G.hurt=1;CAM.shake=1;SFX.hurt();SFX.screech();say('سحبتك من الخزانة!',3);c.state='flee';c.fleeT=3;c.patField=null;if(P.hp<=0)playerDie()}
      else{c.state='search';c.searchT=7;c.lx=c.x+(Math.random()*8-4);c.ly=c.y+(Math.random()*8-4)}}
  }else if(c.state==='search'){
    c.searchT-=dt;if(c.fieldT<=0){c.fieldP=bfs(c.lx,c.ly);c.fieldT=.5}
    if(c.fieldP&&Math.hypot(c.x-c.lx,c.y-c.ly)>.8){moving=stepAlong(c,c.fieldP,base+.3,dt);spd=base+.3}
    if(sees||heard){c.state='hunt';c.loseT=0}
    if(c.searchT<=0){c.state='patrol';c.patField=null;c.fieldDone=true}
  }else if(c.state==='flee'){
    c.fleeT-=dt;
    if(!c.patField||c.fieldDone){let t;for(let i=0;i<30;i++){t=openSpot(c.rr,null,0);if(Math.hypot(t[0]-P.x,t[1]-P.y)>18)break}c.patField=bfs(t[0],t[1]);c.patT=t;c.fieldDone=false}
    moving=stepAlong(c,c.patField,3.1,dt);spd=3.1;if(!moving||Math.hypot(c.patT[0]-c.x,c.patT[1]-c.y)<.7)c.fieldDone=true;
    if(c.fleeT<=0){c.state=(G.chase?'hunt':'patrol');c.patField=null;c.loseT=0}
  }
  // أنيميشن
  c.anim+=moving?dt*(spd*1.5+1.5):0;
  if(c.state==='stag')c.art=ART.cr.stg;
  else if(c.state==='stand')c.art=ART.cr.idle;
  else if(c.state==='hunt'&&d<1.6)c.art=ART.cr.atk;
  else if(moving)c.art=ART.cr['w'+(Math.floor(c.anim)&3)];
  else c.art=ART.cr.idle;
  // أصوات قريبة: خطوات حافية وتنفّس
  if(c.vis&&moving){c.stepT-=dt*(spd*.8);if(c.stepT<=0){c.stepT=1;const o=sp(c.x,c.y);noise(.1,420,.18,'lowpass',o);tone(58,.12,'sine',.2,null,o)}}
  c.rT-=dt;if(c.vis&&c.rT<=0&&d<10&&c.state!=='down'){c.rT=2.2+Math.random()*1.5;SFX.rasp(sp(c.x,c.y),clamp(1-d/10,.2,1))}
  if(c.state==='down')c.art=ART.cr.stg;
  G.close=c.vis&&c.state!=='down'?clamp(1-d/14,0,1):0;
  if(G.cr.state==='hunt')G.close=Math.max(G.close,.35);
}
function nearPlayer(r){for(let t=0;t<60;t++){const a=Math.random()*TAU,rd=Math.random()*r,x=P.x+Math.cos(a)*rd,y=P.y+Math.sin(a)*rd;if(x>1&&y>1&&x<N-1&&y<N-1&&map[(y|0)*N+(x|0)]===0&&!navB[(y|0)*N+(x|0)])return[x,y]}return[P.x,P.y]}
function stepAlong(c,field,speed,dt){
  const cx=c.x|0,cy=c.y|0;let best=field[cy*N+cx],bx=cx,by=cy;if(best<0)return false;
  for(let k=0;k<4;k++){const nx=cx+(k===0?1:k===1?-1:0),ny=cy+(k===2?1:k===3?-1:0);if(nx<0||ny<0||nx>=N||ny>=N)continue;const v=field[ny*N+nx];if(v>=0&&v<best){best=v;bx=nx;by=ny}}
  if(best===0&&bx===cx&&by===cy)return false;
  const tx=bx+.5,ty=by+.5;const dx=tx-c.x,dy=ty-c.y,l=Math.hypot(dx,dy)||1;c.x+=dx/l*speed*dt;c.y+=dy/l*speed*dt;return true;
}
function attackPlayer(c,dx,dy,d){
  c.atkCd=1.6;P.hp-=34;G.hurt=1;CAM.shake=1;SFX.hurt();SFX.growl(sp(c.x,c.y),1);rumble(1,1,350);
  const l=d||1;P.x+=dx/l*.7;P.y+=dy/l*.7;if(!free(P.x,P.y)){P.x-=dx/l*.7;P.y-=dy/l*.7}
  c.state='flee';c.fleeT=2.4;c.patField=null;c.fieldDone=true;
  if(P.hp<=0)playerDie();else say('أصابتك!',2);
}
function playerDie(){G.dead=true;G.deadT=0;G.mode='dead';$('hud').style.display='none';SFX.screech();CAM.shake=1.4;
  const c=G.cr;c.vis=true;c.art=ART.cr.atk}

/* ---------- ظاهرات وأحداث عشوائية ---------- */
function updateWatcher(dt){
  const w=G.watch;
  if(w.on){w.t+=dt;w.alpha=clamp(Math.min(w.t*1.6,(7-w.t)),0,.85);
    const d=Math.hypot(w.x-P.x,w.y-P.y);let rel=Math.atan2(w.y-P.y,w.x-P.x)-P.a;rel=Math.atan2(Math.sin(rel),Math.cos(rel));
    if(w.t>5.5||d<5.5||(w.t>1.8&&Math.abs(rel)>1.3)||(P.flash&&Math.abs(rel)<.3&&w.t>1.2)){w.on=false;SFX.whisper(sp(w.x,w.y));G.flickT=1}
    return}
  G.watchT-=dt;if(G.watchT<=0&&G.stage>=1&&!P.hidden&&G.mode==='play'&&G.cr.state!=='hunt'){G.watchT=75+Math.random()*60;
    for(let t=0;t<30;t++){const a=P.a+(Math.random()*1.1-.55),r=9+Math.random()*6,x=P.x+Math.cos(a)*r,y=P.y+Math.sin(a)*r;
      if(x>1&&y>1&&x<N-1&&y<N-1&&map[(y|0)*N+(x|0)]===0&&los(P.x,P.y,x,y)){w.on=true;w.x=x;w.y=y;w.t=0;w.alpha=0;SFX.heart(.35);break}}}
}
function randomEvent(){
  const r=Math.random(),near=HOUSES.filter(h=>Math.hypot(h.x+h.w/2-P.x,h.y+h.h/2-P.y)<22);
  const h=near.length?near[(Math.random()*near.length)|0]:HOUSES[(Math.random()*HOUSES.length)|0];
  const hx=h.x+h.w/2,hy=h.y+h.h/2,o=sp(hx,hy);
  if(r<.16)SFX.steps(o,4+(Math.random()*4|0));
  else if(r<.28)SFX.creak(o);
  else if(r<.38)SFX.knock(o);
  else if(r<.46)SFX.glass(o);
  else if(r<.54)SFX.scream(sp(P.x+(Math.random()*40-20),P.y+(Math.random()*40-20)));
  else if(r<.62)SFX.bark(sp(P.x+Math.random()*30-15,P.y+Math.random()*30-15));
  else if(r<.68)SFX.owl(sp(P.x+Math.random()*20-10,P.y+Math.random()*20-10));
  else if(r<.78)SFX.whisper(sp(P.x-Math.cos(P.a)*2,P.y-Math.sin(P.a)*2));
  else if(r<.85)SFX.radio(o);
  else if(r<.92){G.flickT=2.2;SFX.thud(o)}
  else{const L=lights.filter(l=>l.kind==='lantern'&&l.on&&Math.hypot(l.x-P.x,l.y-P.y)>6);if(L.length){const l=L[(Math.random()*L.length)|0];l.on=0;if(l.obj)l.obj.lit=0;bakeLights();SFX.creak(sp(l.x,l.y))}}
}

/* ---------- تحديث اللعب ---------- */
function updatePlay(dt){
  G.t+=dt;G.stageT+=dt;
  G.stormT+=dt;G.storm=clamp(.5+.28*Math.sin(G.stormT*.09)+.18*Math.sin(G.stormT*.37),.12,1);
  updatePlayer(dt);updateGun(dt);updateCreature(dt);updateWatcher(dt);
  G.noiseT=Math.max(0,G.noiseT-dt);G.hurt=Math.max(0,G.hurt-dt*1.6);
  // قفز إلى المراحل
  if(G.stage===0){const hi=houseAt(P.x,P.y);if(hi===0){advance(1);say('بيت قديم... لا أحد هنا؟ ابحث عن مفتاح',5)}}
  // السيارة (النهاية)
  const car=objs.find(o=>o.car);G.carMsgT-=dt;
  if(car&&Math.hypot(car.x-P.x,car.y-P.y)<2.6&&G.stage>=6&&G.has.ledger&&!G.ended){G.ended=true;endingStart();return}
  else if(car&&G.stage>=1&&Math.hypot(car.x-P.x,car.y-P.y)<2.2&&G.carMsgT<=0){G.carMsgT=6;say(G.has.ledger?'':'السيارة ميتة تماماً... لا فائدة الآن',3)}
  // فتات: عمر الأثر
  for(let i=G.fx.length-1;i>=0;i--){const f=G.fx[i];f.life-=dt;if(f.life<=0)G.fx.splice(i,1)}
  // إضاءة: وميض
  G.flickT=Math.max(0,G.flickT-dt);
  let f=.88+.1*Math.sin(G.t*13)+.06*Math.sin(G.t*31+1)+(Math.random()-.5)*.08;if(G.flickT>0)f*=Math.random()<.45?.15:1;
  compositeLM(f);
  // أحداث
  G.evT-=dt;if(G.evT<=0){G.evT=8+Math.random()*14;randomEvent()}
  // ملاحة تلقائية للصوت
  if(AC){
    const indoor=ceilIn[(P.y|0)*N+(P.x|0)];
    windG.gain.setTargetAtTime((.07+G.storm*.26)*(indoor?.3:1),AC.currentTime,.3);windBP.frequency.setTargetAtTime(indoor?250:420+G.storm*260,AC.currentTime,.4);
    if(genG){const gen=HOUSES[2].gen;genG.gain.setTargetAtTime(clamp(.9/(1+Math.hypot(gen.x-P.x,gen.y-P.y)*.45),0,.7)*.4,AC.currentTime,.2)}
    // نبض القلب
    G.hbT-=dt;const th=Math.max(G.close,P.hp<35?.7:0);if(th>.08&&G.hbT<=0){G.hbT=1.15-th*.7;SFX.heart(.1+th*.5);rumble(th*.5,th*.3,100)}
    G.musThreat=lerp(G.musThreat,Math.max(G.close,G.cr.state==='hunt'?.6:0,G.chase?.5:0),Math.min(1,dt));
    musicTick(dt,G.musThreat,G.cr.state==='hunt'?'tense':'calm');
  }
  // الإشعار والملاحظات
  if(G.msgT>0)G.msgT-=dt;
  if(G.noteT>0){G.noteT-=dt;if(G.noteT<=0)$('note').style.display='none'}
  updateCamera(dt);
}
