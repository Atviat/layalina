'use strict';
/* ====== أيهم — قيادة السيارة (مقطع قابل للّعب): طريق ليلي في عاصفة ترابية ======
   عرض شبه ثلاثي الأبعاد للطريق (منظور صفوف) — تقود أنت: عصا/اتجاهات للتوجيه، RT تسارع، LT فرامل، Y المصابيح. */
let D=null,skyCv=null;
const DC={speed:0,sway:0,eng:1,fl:1,fig:0,fig2:0};
const D_LEN=2600,DZ=3,D_MAX=30;
const DSUB=[
  [0,'أيهم: وصية أبي الأخيرة... «اذهب إلى الغوير وخذ السجلّ». لا أعرف لماذا.'],
  [330,'المذيع: ...عاصفة ترابية غرب الأنبار حتى الصباح. يُنصح بعدم السفر ليلاً...'],
  [800,'(تشويش)... لا تتوقفوا عند القرى المهجورة... ثم همس: «أيهم...»'],
  [1250,'أيهم: من نادى؟ ...الراديو فقط. أعصابي.'],
  [1700,'أيهم: ما هذا الواقف في منتصف الطريق؟!'],
  [2100,'أيهم: المصابيح تخفت... لا، ليس الآن!'],
  [2450,'أيهم: المحرّك مات، ولا إشارة. سأطلب المساعدة من تلك القرية.']
];
const OFFY=new Float32Array(2200),DEPY=new Float32Array(2200);
function curveAt(z){return(.0034*Math.sin(z*.0021)+.0026*Math.sin(z*.0057+1.3)+.0014*Math.sin(z*.013+.4))*Math.min(1,z/220)}
function darkOf(a){if(!a.dk){const c=document.createElement('canvas');c.width=a.cv.width;c.height=a.cv.height;const g=c.getContext('2d');g.drawImage(a.cv,0,0);g.globalCompositeOperation='source-atop';g.fillStyle='rgba(10,8,14,.74)';g.fillRect(0,0,c.width,c.height);a.dk=c}return a.dk}
function driveStart(){
  ensureAudio();const r=mkRng(77);
  D={z:0,x:0,speed:0,steer:0,t:0,eng:1,lights:true,fl2:1,phase:'drive',subI:-1,subT:0,skyX:0,shake:0,flash:0,figDone:0,mirT:0,titleT:0,fade:1,objs:[],hint:6,whisp:{}};
  for(let z=30;z<D_LEN+400;z+=12+r()*20){const side=r()<.5?-1:1,k=r();D.objs.push({z,L:side*(1.5+r()*3.2),art:k<.58?ART.palm[(r()*3)|0]:k<.8?ART.bush:ART.deadtree,size:k<.58?6.5:k<.8?.9:3.2})}
  for(let z=240;z<D_LEN-320;z+=100+r()*90){D.objs.push({z,L:(r()-.5)*1.4,art:r()<.65?ART.barrel:ART.crate,size:.8,w:.16,hz:1})}
  D.objs.push({z:1000,L:-.55,art:ART.wreck,size:1.5,w:.5,hz:1,wreck:1});
  D.objs.push({z:2050,L:1.45,sign:1,size:2.2});
  D.fig={z:1800,L:.05,art:ART.watch,size:1.9,fig:1};D.objs.push(D.fig);
  D.objs.sort((a,b)=>b.z-a.z);
  // سماء (من نفس نسيج السماء المستخدم في اللعب)
  if(!skyCv||skyCv.width!==skyW){skyCv=document.createElement('canvas');skyCv.width=skyW;skyCv.height=skyH;skyCv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(skyBuf.buffer.slice(0)),skyW,skyH),0,0)}
  mode='drive';$('hud').style.display='none';$('menu').style.display='none';$('note').style.display='none';
  cineAudio(true);G.bars=0;G.fade=0;G.storm=.7;
}
function driveEnd(){
  cineAudio(false);$('sub').style.opacity=0;$('hint').style.display='none';D=null;beginPlay();
}
function driveUpdate(dt){
  const d=D;d.t+=dt;G.t+=dt;
  if(I.start||I.backKey){driveEnd();return}
  if(I.flash){d.lights=!d.lights;SFX.click()}
  const dying=d.phase!=='drive';
  const gas=I.fireHeld||I.my<-.4,brake=I.aim||I.my>.4;
  let cap=1;
  if(d.z>D_LEN-320){cap=clamp((D_LEN-d.z)/320,0,1)*.8+.2;d.eng=Math.max(.15,cap)*(.7+.3*Math.sin(d.t*23))}
  else d.eng=1;
  const sp=d.speed;
  if(d.phase==='drive'){
    if(gas)d.speed+=(.4-.22*sp)*dt;else d.speed-=.07*dt;
    if(brake)d.speed-=.9*dt;
    if(Math.abs(d.x)>1.02)d.speed-=.5*dt*(.4+sp);
    d.speed=clamp(d.speed,0,cap);
    if(d.z>=D_LEN-110){d.phase='dying';SFX.engineDie();d.eng=0}
  }else if(d.phase==='dying'){
    d.eng=0;d.speed=Math.max(0,sp-.3*dt);if(d.speed<.02){d.speed=0;d.phase='title';d.titleT=0;$('sub').style.opacity=0;d.subT=0}
  }else{d.eng=0;d.speed=0;d.titleT+=dt;if(d.titleT>5.5){driveEnd();return}}
  const st=clamp(I.mx+I.lx*.7,-1,1);d.steer=lerp(d.steer,st,Math.min(1,dt*8));
  const v=d.speed;
  d.x+=d.steer*(.3+v)*dt*1.5-curveAt(d.z)*v*v*dt*230;
  d.x=clamp(d.x,-3,3);
  d.z+=v*D_MAX*dt;
  d.skyX+=curveAt(d.z)*v*dt*W*45;
  // حواف الطريق: اهتزاز
  const off=Math.abs(d.x)>1.02&&v>.1;
  if(off){d.shake=Math.max(d.shake,.25*v);rumble(.18*v,.3*v,60)}
  // الاصطدامات
  for(const o of d.objs){if(!o.hz||o.gone)continue;const dz=o.z-d.z;
    if(dz<4&&dz>-1&&Math.abs(o.L-d.x)<o.w+.2){o.gone=!o.wreck;d.speed*=o.wreck?.08:.3;d.shake=1;d.flash=.5;SFX.thud();SFX.glass();rumble(1,.8,300);G.hurt=.5}}
  // أحداث القصة
  for(let i=0;i<DSUB.length;i++)if(d.z>=DSUB[i][0]&&d.subI<i){d.subI=i;d.subT=7.5;$('sub').textContent=DSUB[i][1]}
  if(d.subT>0){d.subT-=dt;$('sub').style.opacity=d.subT>0?1:0}
  if(d.z>330&&!d.whisp.a){d.whisp.a=1;SFX.radio()}
  if(d.z>800&&!d.whisp.b){d.whisp.b=1;SFX.radio();setTimeout(()=>SFX.whisper(),900)}
  if(d.z>1250&&!d.whisp.c){d.whisp.c=1;SFX.whisper(sp2(-3,0));SFX.heart(.4)}
  if(!d.figDone&&d.fig.z-d.z<26){d.figDone=1;d.fig.hidden=1;d.flash=1;d.mirT=5;SFX.heart(.8);SFX.screech();rumble(.8,.6,400);d.shake=.8}
  if(d.mirT>0){d.mirT-=dt;DC.fig=clamp(d.mirT/2,0,1)*0+(d.mirT>0?1-(5-d.mirT)/5:0)}else DC.fig=0;
  // الأضواء: تخفت قبل التعطّل
  let fl=d.lights?1:0;if(d.z>2100&&d.phase==='drive')fl*=Math.random()<.2+(d.z-2100)/900*.6?.1:1;if(d.phase!=='drive')fl*=Math.random()<.3?1:.05*0+(d.phase==='title'?0:.1);
  d.fl2=lerp(d.fl2,fl,Math.min(1,dt*14));
  d.shake=Math.max(0,d.shake-dt*2);d.flash=Math.max(0,d.flash-dt*2.2);G.hurt=Math.max(0,G.hurt-dt*1.6);
  d.fade=Math.max(0,d.fade-dt*.9);if(d.hint>0)d.hint-=dt;
  // صوت المحرك والرياح
  if(cineNodes&&AC){const tt=AC.currentTime;cineNodes.o.frequency.setTargetAtTime(44+v*70+Math.sin(d.t*20)*d.eng*3,tt,.1);cineNodes.g.gain.setTargetAtTime(.1*d.eng+.06*v*d.eng,tt,.1);cineNodes.g2.gain.setTargetAtTime(.07*d.eng,tt,.1);cineNodes.rg.gain.setTargetAtTime(.04+.07*v+(off?.1:0),tt,.15);cineNodes.bp.frequency.setTargetAtTime(900+v*1400,tt,.2)}
  DC.speed=v;DC.sway=d.steer*.6;DC.eng=d.eng;DC.fl=clamp(d.fl2,.15,1);DC.fig2=0;
  // تلميحات
  const km=Math.max(0,Math.ceil((D_LEN-d.z)/260));
  const h=$('hint');if(h){h.style.display='block';h.innerHTML=(d.hint>0?'العصا: توجيه &nbsp; RT أو العصا للأمام: تسارع &nbsp; LT: فرامل &nbsp; Y: المصابيح &nbsp; Start: تخطّي<br>':'')+'الغوير: '+km+' كم'}
}
function sp2(x,y){return sp(P.x+x,P.y+y)}
function driveDraw(dt){
  const d=D,cw=W,ch=H,hy=(ch*.42)|0,pS=ch-hy,t=d.t;
  ctx.save();if(d.shake>0)ctx.translate((Math.random()-.5)*d.shake*ch*.03,(Math.random()-.5)*d.shake*ch*.03);
  ctx.fillStyle='#07060a';ctx.fillRect(0,0,cw,ch);
  // سماء
  const sx=-(((d.skyX%skyW)+skyW)%skyW),sy=hy-skyH+skyH*.07;
  for(let x=sx;x<cw;x+=skyW)ctx.drawImage(skyCv,x,sy);
  // أصفاف الطريق
  const yMin=hy+Math.ceil(pS/80);let dd=0,of=0,pd=1;
  for(let y=ch-1;y>=yMin;y--){const dep=pS/(y+.5-hy),step=dep-pd;pd=dep;dd+=curveAt(d.z+dep*DZ)*step;of+=dd*step;OFFY[y]=clamp(of*cw*.15,-cw*.45,cw*.45);DEPY[y]=dep}
  const lights=d.fl2;
  for(let y=ch-1;y>=yMin;y--){
    const dep=DEPY[y],p=1/dep,hw=p*cw*.46,cx=cw/2+OFFY[y]-d.x*hw,zw=d.z+dep*DZ;
    const fog=1-Math.exp(-dep*.05*(1+G.storm*.3)),lit=.16+lights*.95/(1+dep*.28);
    const band=((zw/8)|0)&1;
    const mix=(r,g,b)=>{r*=lit;g*=lit;b*=lit;r+=(34-r)*fog;g+=(25-g)*fog;b+=(19-b)*fog;return'rgb('+(r|0)+','+(g|0)+','+(b|0)+')'};
    ctx.fillStyle=mix(band?58:52,band?42:38,band?29:26);ctx.fillRect(0,y,cw,1);
    ctx.fillStyle=mix(46,44,47);ctx.fillRect(cx-hw,y,hw*2,1);
    ctx.fillStyle=mix(30,29,32);ctx.fillRect(cx-hw*.6,y,hw*.5,1);ctx.fillRect(cx+hw*.1,y,hw*.5,1); // آثار الإطارات
    ctx.fillStyle=mix(150,146,130);const lw=Math.max(1,hw*.035);ctx.fillRect(cx-hw*.97,y,lw,1);ctx.fillRect(cx+hw*.97-lw,y,lw,1);
    if((zw%16)<8){ctx.fillRect(cx-lw*.5,y,lw,1)}
  }
  // أجسام
  for(const o of d.objs){
    if(o.hidden)continue;const dep=(o.z-d.z)/DZ;if(dep<1.02||dep>75)continue;
    const p=1/dep,y=hy+pS*p,iy=clamp(y|0,yMin,ch-1),hwy=p*cw*.46,cxx=cw/2+OFFY[iy]-d.x*hwy+o.L*hwy;
    const hpx=ch*.5*p*o.size,a=clamp(1.15-dep*.013,.08,1);
    if(cxx<-hpx||cxx>cw+hpx)continue;
    const lit=d.fl2*clamp(1.9/(1+dep*.22),0,1)*(1-Math.min(.8,Math.abs(o.L-d.x)*.18));
    if(o.sign){
      const bw=hpx*.9,bh=hpx*.42;ctx.globalAlpha=a;ctx.fillStyle='#10100f';ctx.fillRect(cxx-hpx*.03,y-hpx,hpx*.06,hpx);
      ctx.fillStyle=lit>.3?'#1f4a38':'#0b1a14';ctx.fillRect(cxx-bw/2,y-hpx,bw,bh);ctx.fillStyle='#d8d4c0';ctx.textAlign='center';ctx.font='bold '+Math.max(6,hpx*.13|0)+'px "Noto Naskh Arabic",Tahoma,sans-serif';
      ctx.fillText('قرية الغوير',cxx,y-hpx+bh*.45);ctx.fillText('٣ كم',cxx,y-hpx+bh*.85);ctx.textAlign='start';ctx.globalAlpha=1;continue}
    const art=o.art;if(!art||!art.cv)continue;const wpx=hpx*art.w/art.h;
    ctx.globalAlpha=a;ctx.drawImage(darkOf(art),cxx-wpx/2,y-hpx,wpx,hpx);
    if(lit>.03){ctx.globalAlpha=a*clamp(lit,0,1);ctx.drawImage(art.cv,cxx-wpx/2,y-hpx,wpx,hpx)}
    if(art.emCv&&(o.fig||o.wreck)){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=a*.85;ctx.drawImage(art.emCv,cxx-wpx/2,y-hpx,wpx,hpx);ctx.globalCompositeOperation='source-over'}
    ctx.globalAlpha=1;
  }
  // ضوء المصابيح
  if(lights>.15){ctx.globalCompositeOperation='lighter';[-1,1].forEach(sd=>{const g=ctx.createRadialGradient(cw/2+sd*cw*.18,ch*.8,0,cw/2+sd*cw*.05,hy+ch*.05,ch*.75);g.addColorStop(0,'rgba(255,240,190,'+.3*lights+')');g.addColorStop(1,'rgba(255,230,160,0)');ctx.fillStyle=g;ctx.fillRect(0,hy-ch*.1,cw,ch)});ctx.globalCompositeOperation='source-over'}
  // غبار العاصفة
  ctx.strokeStyle='rgba(215,175,120,.22)';ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<130;i++){const x=Math.random()*cw,y=Math.random()*ch,l=8+Math.random()*cw*(.05+d.speed*.12);ctx.moveTo(x,y);ctx.lineTo(x-l,y+l*.1)}ctx.stroke();
  ctx.fillStyle='rgba(120,85,50,'+(.08+.04*Math.sin(t*.7))+')';ctx.fillRect(0,0,cw,ch);
  ctx.restore();
  // لوحة القيادة
  const sv=C;C=DC;drawDash(t,false);C=sv;
  ctx.drawImage(vigCv,0,0);
  if(S.fx>1){ctx.globalCompositeOperation='overlay';ctx.drawImage(grainCv,((Math.random()*64)|0)-64,((Math.random()*64)|0)-64,cw+128,ch+128);ctx.globalCompositeOperation='source-over'}
  if(d.flash>0){ctx.fillStyle='rgba(255,255,255,'+d.flash*.7+')';ctx.fillRect(0,0,cw,ch)}
  if(G.hurt>0){ctx.fillStyle='rgba(120,0,0,'+clamp(G.hurt*.5,0,.5)+')';ctx.fillRect(0,0,cw,ch)}
  if(d.phase==='title'){
    const a=clamp(d.titleT/1.2,0,1)*(d.titleT>4.3?clamp(1-(d.titleT-4.3)/1.2,0,1):1);ctx.fillStyle='#000';ctx.fillRect(0,0,cw,ch);ctx.globalAlpha=a;
    ctx.fillStyle='#d8c08a';ctx.textAlign='center';ctx.font='bold '+(ch*.22|0)+'px "Noto Naskh Arabic",Tahoma,sans-serif';ctx.fillText('أيهم',cw/2,ch*.5);
    ctx.fillStyle='#a08a60';ctx.font=(ch*.06|0)+'px "Noto Naskh Arabic",Tahoma,sans-serif';ctx.fillText('الفصل الأول — الطريق الأخير',cw/2,ch*.64);ctx.globalAlpha=1;ctx.textAlign='start'}
  const b=ch*.06;ctx.fillStyle='#000';ctx.fillRect(0,0,cw,b);ctx.fillRect(0,ch-b,cw,b);
  if(d.fade>0){ctx.fillStyle='rgba(0,0,0,'+clamp(d.fade,0,1)+')';ctx.fillRect(0,0,cw,ch)}
}
