'use strict';
/* ====== ليالينا — المشاهد السينمائية: الافتتاح (القيادة والتعطّل) والنهاية ====== */
let C=null;
const CINE_OPEN=[
  [1.0,'المذيع (من الراديو): ...وتستمر العاصفة الترابية غرب الأنبار حتى الصباح، ويُنصح بعدم السفر ليلاً...'],
  [7.5,'(تشويش)... الطريق إلى الرطبة مقطوع... كرّروا: لا تتوقفوا عند القرى المهجورة...'],
  [12.8,'ما هذا؟! هناك شخص في منتصف الطريق!'],
  [17.0,'...لا أحد. كنتُ أتخيّل.'],
  [21.5,'لا... ليس الآن! أرجوك!'],
  [28.5,'المحرّك مات، ولا إشارة. سأبحث عن مساعدة في تلك القرية.']
];
const CINE_END=[
  [1.5,'المحرّك يدور من تلقاء نفسه... كأنها تركتني أرحل.'],
  [7.5,'(في المرآة) ...هناك من يقف على الطريق خلفي.'],
  [13.5,'(همس من الراديو) ...ليالينا...'],
  [18.5,'السجلّ في المقعد المجاور... وأنا أسمع اسمي فيه.']
];
let cineNodes=null;
function cineAudio(on){
  if(!AC)return;
  if(on&&!cineNodes){
    const o=AC.createOscillator();o.type='sawtooth';o.frequency.value=48;const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=260;
    const g=AC.createGain();g.gain.value=.0;o.connect(lp);lp.connect(g);g.connect(sfxBus);o.start();
    const o2=AC.createOscillator();o2.type='square';o2.frequency.value=24;const g2=AC.createGain();g2.gain.value=.0;const lp2=AC.createBiquadFilter();lp2.type='lowpass';lp2.frequency.value=90;o2.connect(lp2);lp2.connect(g2);g2.connect(sfxBus);o2.start();
    const rs=AC.createBufferSource();rs.buffer=noiseBuf;rs.loop=true;const bp=AC.createBiquadFilter();bp.type='bandpass';bp.frequency.value=1500;bp.Q.value=1.4;const rg=AC.createGain();rg.gain.value=0;rs.connect(bp);bp.connect(rg);rg.connect(sfxBus);rs.start();
    cineNodes={o,g,o2,g2,rg,bp};
  }else if(!on&&cineNodes){const t=AC.currentTime;cineNodes.g.gain.setTargetAtTime(0,t,.2);cineNodes.g2.gain.setTargetAtTime(0,t,.2);cineNodes.rg.gain.setTargetAtTime(0,t,.2);const n=cineNodes;setTimeout(()=>{try{n.o.stop();n.o2.stop()}catch(e){}},1500);cineNodes=null}
}
function cineStart(kind){
  ensureAudio();
  C={kind,t:0,subI:-1,speed:1,dist:0,sway:0,fig:0,fl:1,eng:1,skip:0,titleT:0,done:false,flash:0,seed:mkRng(31)};
  mode=kind==='open'?'cine':'end';$('hud').style.display='none';$('menu').style.display='none';
  cineAudio(true);if(kind==='open')SFX.start();
  G.fade=0;G.bars=1;
}
function cineEnd(){
  cineAudio(false);$('sub').textContent='';$('sub').style.opacity=0;
  if(C.kind==='open')beginPlay();else{mode='menu';G.bars=0;setScreen('chapterEnd')}
  C=null;
}
function cineUpdate(dt){
  const k=C.kind==='open';C.t+=dt;const t=C.t,subs=k?CINE_OPEN:CINE_END;
  if(I.start||I.backKey){C.skip+=1;cineEnd();return}
  // نصوص مترجمة
  let si=-1;for(let i=0;i<subs.length;i++)if(t>=subs[i][0])si=i;
  const show=si>=0&&t<subs[si][0]+(si+1<subs.length?Math.min(5,subs[si+1][0]-subs[si][0]-.4):5);
  if(si!==C.subI&&show){$('sub').textContent=subs[si][1];C.subI=si}
  $('sub').style.opacity=show?1:0;
  const wind=cineNodes;
  if(k){
    // سرعة السيارة
    if(t<19)C.speed=1;else if(t<27)C.speed=Math.max(.02,1-(t-19)/8*.98);else C.speed=0;
    C.eng=t<19?1:t<27?(Math.sin(t*22)*.35+.65)*(1-(t-19)/8):0;
    C.fl=t<19?1:t<27?(Math.random()<.35+(t-19)*.05?.1:1):0;
    if(t>19.2&&!C.sput){C.sput=1;SFX.engineDie()}
    if(t>12.3&&!C.figSnd){C.figSnd=1;SFX.heart(.5)}
    C.fig=t<11.5?0:t<16.5?clamp((t-11.5)/3.3,0,1):0;       // الشخص يظهر ويقترب ثم يختفي
    C.sway=(t>14.5&&t<16.5)?Math.sin((t-14.5)*3.5)*.55:Math.sin(t*.7)*.04;
    if(t>15.4&&!C.swerve){C.swerve=1;noise(.6,900,.3,'lowpass');rumble(.6,.4,300)}
    C.flash=(t>15.2&&t<15.5)?1:0;
    if(cineNodes){const tt=AC.currentTime;cineNodes.o.frequency.setTargetAtTime(48+C.speed*34+Math.sin(t*20)*C.eng*4,tt,.1);cineNodes.g.gain.setTargetAtTime(.16*C.eng,tt,.1);cineNodes.g2.gain.setTargetAtTime(.1*C.eng,tt,.1);
      cineNodes.rg.gain.setTargetAtTime(t<12?.05+(Math.sin(t*5)>.7?.04:0):0,tt,.15)}
    if(t>33&&!C.done){C.done=true;G.fadeCol='0,0,0'}
    G.fade=t>31?clamp((t-31)/1.5,0,1):t<1.2?1-t/1.2:0;
    if(t>34)C.titleT=t-34;
    if(t>39.5){cineEnd();return}
  }else{
    C.speed=t<19?1.25:0;C.eng=1;C.fl=t<16?1:(Math.random()<.5?1:.1);
    C.fig=t>7?clamp((t-7)/6,0,1)*(t<19?1:0):0;                // الشخص في المرآة
    C.fig2=t>16?clamp((t-16)/2.6,0,1):0;                       // الشخص أمام السيارة
    if(t>13.4&&!C.whisp){C.whisp=1;SFX.whisper();SFX.radio()}
    if(t>16.2&&!C.hb){C.hb=1;SFX.heart(.7)}
    if(cineNodes){const tt=AC.currentTime;cineNodes.o.frequency.setTargetAtTime(62,tt,.1);cineNodes.g.gain.setTargetAtTime(t<19?.16:0,tt,.15);cineNodes.g2.gain.setTargetAtTime(t<19?.1:0,tt,.15);cineNodes.rg.gain.setTargetAtTime(0,tt,.2)}
    G.fade=t>19?clamp((t-19)/1.2,0,1):t<1?1-t:0;
    if(t>19&&!C.scr){C.scr=1;SFX.screech()}
    if(t>25){cineEnd();return}
  }
  C.dist+=C.speed*dt*38;
  musicTick(dt,.3,'calm');
}
function drawDrive(t,k){
  const hy=H*.44,cx=W/2+C.sway*W*.35;
  // سماء
  const sg=ctx.createLinearGradient(0,0,0,hy);sg.addColorStop(0,'#04060d');sg.addColorStop(.7,'#171420');sg.addColorStop(1,'#4a3524');ctx.fillStyle=sg;ctx.fillRect(0,0,W,hy+1);
  ctx.fillStyle='rgba(250,235,200,.85)';ctx.beginPath();ctx.arc(W*.78,H*.13,H*.035,0,TAU);ctx.fill();
  const mg=ctx.createRadialGradient(W*.78,H*.13,0,W*.78,H*.13,H*.25);mg.addColorStop(0,'rgba(255,230,180,.22)');mg.addColorStop(1,'rgba(255,230,180,0)');ctx.fillStyle=mg;ctx.fillRect(0,0,W,H*.5);
  // صحراء
  ctx.fillStyle='#2a1f14';ctx.fillRect(0,hy,W,H-hy);
  // طريق: صفوف مع منظور
  for(let y=Math.ceil(hy)+1;y<H;y++){
    const p=(y-hy)/(H-hy),z=1/p,rw=W*1.05*p,curve=Math.sin(C.dist*.004+1)*(1-p)*(1-p)*W*.25;
    const x0=cx+curve-rw/2;const fog=clamp(1-z*.07,.12,1),l=(.26+.1*Math.sin(z*.5))*fog;
    ctx.fillStyle='rgb('+(40*l*3|0)+','+(36*l*3|0)+','+(33*l*3|0)+')';ctx.fillRect(x0,y,rw,1);
    ctx.fillStyle='rgb('+(95*fog|0)+','+(75*fog|0)+','+(52*fog|0)+')';ctx.fillRect(x0-rw*.06,y,rw*.06,1);ctx.fillRect(x0+rw,y,rw*.06,1);
    if((((z*.55-C.dist*.06)%2)+2)%2<1){ctx.fillStyle='rgba(225,215,170,'+fog*.9+')';ctx.fillRect(cx+curve-p*4,y,p*8,1)}
  }
  // أعمدة ونخيل على جانبي الطريق
  const objsDraw=[];for(let i=0;i<10;i++){const zz=((i*22-C.dist*.9)%220+220)%220+3;objsDraw.push({z:zz,side:i%2?1:-1,k:i%3})}
  objsDraw.sort((a,b)=>b.z-a.z);
  for(const o of objsDraw){const p=1/o.z*3.2,y=hy+(H-hy)*p,curve=Math.sin(C.dist*.004+1)*(1-p)*(1-p)*W*.25,x=cx+curve+o.side*W*1.05*p*.78;
    if(y>H*1.5)continue;const sc=p*H*.0095*3,fog=clamp(1-o.z*.012,.1,1);
    const s=ART.palm[o.k];ctx.globalAlpha=fog*.75;ctx.drawImage(s.cv,x-s.w*sc*.5,y-s.h*sc,s.w*sc,s.h*sc);ctx.globalAlpha=1}
  // الشخص على الطريق
  if(k&&C.fig>0){const fp=.02+C.fig*.1,y=hy+(H-hy)*fp*1.6,sc=fp*H*.012;const s=ART.watch;ctx.globalAlpha=clamp(1.2-C.fig*.3,0,1);ctx.drawImage(s.cv,cx-s.w*sc*.5+C.fig*W*.06,y-s.h*sc,s.w*sc,s.h*sc);ctx.drawImage(s.emCv,cx-s.w*sc*.5+C.fig*W*.06,y-s.h*sc,s.w*sc,s.h*sc);ctx.globalAlpha=1}
  if(!k&&C.fig2>0){const fp=.1+C.fig2*.5,y=hy+(H-hy)*fp*1.15,sc=fp*H*.012;const s=ART.watch;ctx.drawImage(s.cv,cx-s.w*sc*.5,y-s.h*sc,s.w*sc,s.h*sc);ctx.drawImage(s.emCv,cx-s.w*sc*.5,y-s.h*sc,s.w*sc,s.h*sc)}
  // ضوء المصابيح الأمامية
  if(C.fl>.2){ctx.globalCompositeOperation='lighter';[-1,1].forEach(sd=>{const g=ctx.createRadialGradient(cx+sd*W*.18,H*.7,0,cx+sd*W*.05,hy+H*.05,H*.7);g.addColorStop(0,'rgba(255,240,190,'+.55*C.fl+')');g.addColorStop(1,'rgba(255,230,160,0)');ctx.fillStyle=g;ctx.fillRect(0,hy-H*.1,W,H)});ctx.globalCompositeOperation='source-over'}
  // غبار كثيف
  ctx.strokeStyle='rgba(215,175,120,.2)';ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<120;i++){const x=Math.random()*W,y=Math.random()*H,l=10+Math.random()*W*.12;ctx.moveTo(x,y);ctx.lineTo(x-l,y+l*.1)}ctx.stroke();
  ctx.fillStyle='rgba(120,85,50,'+(.16+.08*Math.sin(t*.7))+')';ctx.fillRect(0,0,W,H);
  // لوحة القيادة
  drawDash(t,k);
  if(C.flash>0){ctx.fillStyle='rgba(255,255,255,'+C.flash*.8+')';ctx.fillRect(0,0,W,H)}
}
function drawDash(t,k){
  const sh=(Math.sin(t*37)*.6+Math.sin(t*11))*(C.speed>.2?H*.002:0);
  ctx.save();ctx.translate(0,sh);
  // أعمدة الزجاج
  ctx.fillStyle='#07060a';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(W*.07,0);ctx.lineTo(W*.02,H*.78);ctx.lineTo(0,H*.78);ctx.fill();ctx.beginPath();ctx.moveTo(W,0);ctx.lineTo(W*.93,0);ctx.lineTo(W*.98,H*.78);ctx.lineTo(W,H*.78);ctx.fill();
  ctx.fillStyle='#050408';ctx.fillRect(0,0,W,H*.035);
  // مرآة
  const mx=W*.5,my=H*.07,mw=W*.2,mh=H*.1;ctx.fillStyle='#0b0b0d';ctx.fillRect(mx-mw/2-3,my-3,mw+6,mh+6);ctx.fillStyle='#141b22';ctx.fillRect(mx-mw/2,my,mw,mh);
  if(!k&&C.fig>0){const s=ART.watch,sc=(.12+C.fig*.15)*mh/s.h*3;ctx.save();ctx.beginPath();ctx.rect(mx-mw/2,my,mw,mh);ctx.clip();ctx.globalAlpha=.8;ctx.drawImage(s.cv,mx-s.w*sc*.5,my+mh-s.h*sc*.6,s.w*sc,s.h*sc);ctx.drawImage(s.emCv,mx-s.w*sc*.5,my+mh-s.h*sc*.6,s.w*sc,s.h*sc);ctx.restore()}
  // خرزة معلّقة تتأرجح
  const sw=Math.sin(t*3)*3*(C.speed>.1?1:.3)+C.sway*20;ctx.strokeStyle='#3a2a1a';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(mx+mw*.35,my+mh);ctx.lineTo(mx+mw*.35+sw,my+mh+H*.07);ctx.stroke();
  ctx.fillStyle='#2a6a4a';for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(mx+mw*.35+sw*(i/5+.3),my+mh+H*.014*(i+1)+H*.01,H*.0075,0,TAU);ctx.fill()}
  // اللوحة
  ctx.fillStyle='#0b0a0c';ctx.beginPath();ctx.moveTo(0,H*.88);ctx.quadraticCurveTo(W*.5,H*.72,W,H*.88);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
  const dg=ctx.createLinearGradient(0,H*.8,0,H);dg.addColorStop(0,'#17130f');dg.addColorStop(1,'#050505');ctx.fillStyle=dg;ctx.beginPath();ctx.moveTo(0,H*.9);ctx.quadraticCurveTo(W*.5,H*.78,W,H*.9);ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
  // عدّادات
  const gl=C.eng>.1?clamp(C.fl,.3,1):0;
  [[W*.38,H*.9],[W*.62,H*.9]].forEach((p,i)=>{ctx.fillStyle='#050505';ctx.beginPath();ctx.arc(p[0],p[1],H*.065,0,TAU);ctx.fill();ctx.strokeStyle='rgba(255,170,60,'+(.35+.4*gl)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p[0],p[1],H*.056,0,TAU);ctx.stroke();
    const ang=(-2.4+(i?C.eng*C.speed*3.2:C.speed*3.6)+Math.sin(t*20)*C.eng*.08*(i?1:0));ctx.strokeStyle='rgba(255,120,40,'+(.3+.7*gl)+')';ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(p[0]+Math.cos(ang)*H*.05,p[1]+Math.sin(ang)*H*.05);ctx.stroke()});
  ctx.fillStyle='rgba(255,30,20,'+(C.eng<.8&&C.eng>0?(Math.sin(t*14)>0?.9:.2):(C.eng===0?.15:0))+')';ctx.fillRect(W*.47,H*.84,W*.03,H*.02);ctx.fillStyle='rgba(255,160,30,'+(C.eng<.8?.8:0)+')';ctx.fillRect(W*.51,H*.84,W*.03,H*.02);
  // المقود والأيدي
  const wx=W*.5,wy=H*1.0,wr=H*.3,rot=C.sway*.5+Math.sin(t*.9)*.03;
  ctx.save();ctx.translate(wx,wy);ctx.rotate(rot);ctx.strokeStyle='#0c0b0b';ctx.lineWidth=H*.03;ctx.beginPath();ctx.ellipse(0,0,wr*1.25,wr*.78,0,Math.PI,TAU);ctx.stroke();
  ctx.strokeStyle='#1d1a18';ctx.lineWidth=H*.012;ctx.beginPath();ctx.ellipse(0,-H*.004,wr*1.25,wr*.78,0,Math.PI*1.05,Math.PI*1.95);ctx.stroke();
  ctx.fillStyle='#0c0b0b';ctx.fillRect(-wr*.1,-wr*.74,wr*.2,wr*.34);
  [[-wr*.98,-wr*.5],[wr*.98,-wr*.5]].forEach(p=>{ctx.fillStyle='#b88a62';ctx.beginPath();ctx.ellipse(p[0],p[1],H*.035,H*.026,0,0,TAU);ctx.fill();ctx.fillStyle='#4d4d35';ctx.fillRect(p[0]-H*.025,p[1]+H*.01,H*.05,H*.08)});
  ctx.restore();ctx.restore();
}
function cineDraw(){
  const t=C.t;ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  drawDrive(t,C.kind==='open');
  // وميض المصابيح عند التعطّل + حبيبات
  const v=vigCv;ctx.drawImage(v,0,0);
  if(C.kind==='open'&&C.titleT>0){
    const a=clamp(C.titleT/1.2,0,1)*(C.titleT>4?clamp(1-(C.titleT-4)/1.3,0,1):1);ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);ctx.globalAlpha=a;
    ctx.fillStyle='#d8c08a';ctx.textAlign='center';ctx.font='bold '+(H*.2|0)+'px "Noto Naskh Arabic",Tahoma,sans-serif';ctx.fillText('ليالينا',W/2,H*.5);
    ctx.fillStyle='#a08a60';ctx.font=(H*.06|0)+'px "Noto Naskh Arabic",Tahoma,sans-serif';ctx.fillText('الفصل الأول — الطريق الأخير',W/2,H*.64);ctx.globalAlpha=1;ctx.textAlign='start'}
  if(C.kind==='end'&&C.t>19){ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);const a=clamp((C.t-20)/1.2,0,1);ctx.globalAlpha=a;ctx.fillStyle='#d8c08a';ctx.textAlign='center';ctx.font='bold '+(H*.1|0)+'px "Noto Naskh Arabic",Tahoma,sans-serif';ctx.fillText('نهاية الفصل الأول',W/2,H*.48);
    ctx.fillStyle='#a08a60';ctx.font=(H*.05|0)+'px "Noto Naskh Arabic",Tahoma,sans-serif';ctx.fillText('الفصل الثاني: قريباً',W/2,H*.6);ctx.globalAlpha=1;ctx.textAlign='start'}
  // شريطان سينمائيان وحبيبات
  const b=H*.11;ctx.fillStyle='#000';ctx.fillRect(0,0,W,b);ctx.fillRect(0,H-b,W,b);
  if(S.fx>1){ctx.globalCompositeOperation='overlay';ctx.drawImage(grainCv,((Math.random()*64)|0)-64,((Math.random()*64)|0)-64,W+128,H+128);ctx.globalCompositeOperation='source-over'}
  if(G.fade>0&&!(C.kind==='open'&&C.titleT>0)){ctx.fillStyle='rgba(0,0,0,'+clamp(G.fade,0,1)+')';ctx.fillRect(0,0,W,H)}
}
