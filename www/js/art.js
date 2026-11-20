'use strict';
/* ====== ليالينا — الفن: خامات وصور مولَّدة بالكود (مع نتوءات/ظلال مخبوزة) ====== */
const TS=128;                       // دقة الخامات
const px=(r,g,b)=>(0xFF000000|((b<0?0:b>255?255:b|0)<<16)|((g<0?0:g>255?255:g|0)<<8)|(r<0?0:r>255?255:r|0))>>>0;
const R_=c=>c&255,G_=c=>(c>>8)&255,B_=c=>(c>>16)&255;
function bump(h,sz,x,y,k){ // ظل نتوء مخبوز: إضاءة من أعلى اليسار
  const xm=(x-1+sz)%sz,xp=(x+1)%sz,ym=(y-1+sz)%sz,yp=(y+1)%sz;
  return 1+((h[y*sz+xm]-h[y*sz+xp])+(h[ym*sz+x]-h[yp*sz+x]))*k;
}
function genTex(seed,fn,k){
  const col=new Uint32Array(TS*TS),h=new Float32Array(TS*TS),cols=[];
  const out={set(x,y,r,g,b,hh){const i=y*TS+x;cols[i]=[r,g,b];h[i]=hh}};
  for(let y=0;y<TS;y++)for(let x=0;x<TS;x++){const r=fn(x/TS,y/TS,x,y);const i=y*TS+x;cols[i]=[r[0],r[1],r[2]];h[i]=r[3]}
  for(let y=0;y<TS;y++)for(let x=0;x<TS;x++){const i=y*TS+x,c=cols[i],s=bump(h,TS,x,y,k||1.6);col[i]=px(c[0]*s,c[1]*s,c[2]*s)}
  return col;
}
function mudWallFn(seed,withBricks){
  return(u,v,x,y)=>{
    const row=Math.floor(v*8),off=(row&1)*.5,bu=((u*3.2+off)%1+1)%1,bi=Math.floor(u*3.2+off),bv=(v*8)%1;
    const rnd=hash2(bi,row,seed),n=fbm(u*6,v*6,6,4,seed),n2=fbm(u*3,v*3,3,3,seed+9);
    let mort=(bu<.035||bu>.965||bv<.07||bv>.95)?1:0;
    let r=128*(.86+rnd*.28),g=92*(.86+rnd*.28),b=58*(.86+rnd*.28),h=.55+rnd*.2+n*.25;
    if(mort){r=96;g=72;b=48;h=.1}
    const pl=n2>.52?1:0;                      // بقع الجصّ الطيني
    if(pl){const t=Math.min(1,(n2-.52)*9);r=lerp(r,166,t);g=lerp(g,140,t);b=lerp(b,104,t);h=lerp(h,.7+n*.15,t)}
    if(n2>.505&&n2<.515){r*=.8;g*=.8;b*=.8;h=h*.6}   // حافة تشقّق خفيفة
    const st=Math.max(0,fbm(u*14,v*1.1,14,3,seed+4)-.45)*1.4;r*=1-st*.5;g*=1-st*.5;b*=1-st*.5; // خطوط تسرّب
    const dust=v>.84?(v-.84)*2.2:0;r=lerp(r,176,dust);g=lerp(g,146,dust);b=lerp(b,108,dust);
    if(v<.07){r*=.8;g*=.8;b*=.8}
    const gr=(hash2(x,y,seed+3)-.5)*18;return[r+gr,g+gr,b+gr,h];
  };
}
function woodDoorFn(kind){
  return(u,v,x,y)=>{
    const pi=Math.floor(u*8),pu=(u*8)%1,rnd=hash2(pi,3,kind);
    const grain=fbm(u*60,v*3,60,3,40+pi);let r=88*(.8+rnd*.4)*(.8+grain*.5),g=60*(.8+rnd*.4)*(.8+grain*.5),b=38*(.8+rnd*.4)*(.8+grain*.5),h=.6+grain*.2;
    if(pu<.05||pu>.95){r=18;g=12;b=8;h=0}
    const band=(Math.abs(v-.2)<.05||Math.abs(v-.78)<.05);
    if(band){r=44;g=42;b=46;h=.9;if((Math.floor(u*16)+.5)%1<.2&&Math.abs((v%.5)-.2)<.03){r=90;g=84;b=80}}
    const wear=fbm(u*5,v*5,5,3,kind+7);if(wear>.62){r*=1.35;g*=1.3;b*=1.25}
    if(kind===5){const dx=u-.7,dy=v-.5;                   // قفل نحاسي
      if(dx*dx+dy*dy<.011){r=190;g=146;b=60;h=1.2}else if(Math.abs(dx)<.05&&dy<-.02&&dy>-.13){r=120;g=100;b=50;h=1.1}
      if(Math.abs(u-.7)<.12&&Math.abs(v-.5)<.012){r=60;g=52;b=40;h=1}}
    if(kind===6){const d=Math.abs(((u+v)%.25)-.125);if(d<.02&&v>.3&&v<.7){r=96;g=70;b=56;h=1.3}  // سلسلة صدئة
      if(Math.abs(v-.5)<.03){r=104;g=66;b=40;h=1.2}}
    return[r,g,b,h];
  };
}
function windowWallFn(seed){
  const base=mudWallFn(seed,true);
  return(u,v,x,y)=>{
    const wu=u-.5,wv=v-.46;
    if(Math.abs(wu)<.2&&Math.abs(wv)<.22){
      const fr=Math.abs(wu)>.17||Math.abs(wv)>.19;
      if(fr)return[70,46,28,.9];
      const sl=Math.floor((v-.24)*30)&1,broken=(u<.5&&hash2(Math.floor(u*20),Math.floor(v*8),seed)>.55);
      if(broken)return[6,5,4,0];
      return sl?[34,24,16,.55]:[12,9,7,.2];
    }
    if(Math.abs(wu)<.235&&Math.abs(wv)<.255)return[210,190,150,1.1]; // إطار جصّي فاتح
    return base(u,v,x,y);
  };
}
const TEX=[null];
const FLOORT=[],CEILT=[];
function makeTextures(){
  TEX[1]=genTex(11,mudWallFn(11,true),1.9);
  TEX[2]=genTex(21,woodDoorFn(2),1.4);
  TEX[3]=TEX[1];
  TEX[4]=genTex(31,windowWallFn(11),1.7);
  TEX[5]=genTex(25,woodDoorFn(5),1.4);
  TEX[6]=genTex(26,woodDoorFn(6),1.4);
  // رمل مع تموّجات وحصى
  FLOORT[0]=genTex(51,(u,v,x,y)=>{
    const n=fbm(u*5,v*5,5,5,51),w=Math.sin((u*5+n*1.4)*TAU)*.5+.5,rip=w*w;
    let r=124+n*40+rip*22,g=96+n*32+rip*18,b=62+n*24+rip*12,h=rip*.6+n*.3;
    const pb=hash2(x,y,53);if(pb>.985){r*=.55;g*=.55;b*=.55;h+=.5}else if(pb<.008){r+=40;g+=34;b+=24}
    const gr=(hash2(x,y,57)-.5)*14;return[r+gr,g+gr,b+gr,h];
  },1.3);
  // طريق ترابي بآثار إطارات
  FLOORT[1]=genTex(61,(u,v,x,y)=>{
    const n=fbm(u*6,v*6,6,5,61);let r=150+n*36,g=122+n*30,b=88+n*22,h=n*.3;
    const tk=(Math.abs(u-.27)<.07||Math.abs(u-.73)<.07);
    if(tk){const d=.6+fbm(u*20,v*8,20,3,63)*.5;r*=d;g*=d;b*=d;h-=.35}
    if(Math.abs(u-.5)<.07&&hash2(x,Math.floor(y/3),65)>.55){r=110;g=104;b=52;h+=.6}   // عشب يابس وسط الطريق
    const pb=hash2(x,y,67);if(pb>.98){r*=.6;g*=.6;b*=.6;h+=.5}
    const gr=(hash2(x,y,69)-.5)*12;return[r+gr,g+gr,b+gr,h];
  },1.3);
  // بلاط طيني داخلي
  FLOORT[2]=genTex(71,(u,v,x,y)=>{
    const ti=Math.floor(u*4),tj=Math.floor(v*4),tu=(u*4)%1,tv=(v*4)%1,rnd=hash2(ti,tj,71);
    const n=fbm(u*8,v*8,8,4,73);let r=122*(.8+rnd*.35),g=84*(.8+rnd*.35),b=56*(.8+rnd*.35),h=.7+n*.2;
    if(tu<.04||tv<.04||tu>.97||tv>.97){r=40;g=28;b=20;h=0}
    const dust=Math.max(0,fbm(u*4,v*4,4,3,75)-.45)*2;r=lerp(r,170,dust);g=lerp(g,146,dust);b=lerp(b,112,dust);
    const cr=Math.abs(Math.sin((u*3+n*2)*TAU))<.025&&n>.5;if(cr){r*=.3;g*=.3;b*=.3;h=0}
    const gr=(hash2(x,y,77)-.5)*12;return[r+gr,g+gr,b+gr,h];
  },1.4);
  // سقف: عوارض خشبية وحصير من سعف النخيل
  CEILT[0]=genTex(81,(u,v,x,y)=>{
    const beam=(v<.14||(v>.5&&v<.64));
    if(beam){const gr=fbm(u*50,v*4,50,3,83);return[60*(.8+gr*.5),40*(.8+gr*.5),26*(.8+gr*.5),.9+gr*.2]}
    const wv=((Math.floor(u*32)+Math.floor(v*32))&1),n=fbm(u*30,v*30,30,3,85);
    const r=(wv?150:124)*(.75+n*.5),g=(wv?122:100)*(.75+n*.5),b=(wv?78:62)*(.75+n*.5);
    return[r*.7,g*.7,b*.7,wv?.5:.3+n*.2];
  },1.5);
}

/* ---------- صور (Sprites) ---------- */
function mkSpr(w,h,fn,emfn,grainAmt){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d',{willReadFrequently:true});fn(g,w,h);
  if(grainAmt){const id=g.getImageData(0,0,w,h),d=id.data;for(let i=0;i<d.length;i+=4){if(d[i+3]>20){const n=(hash2(i>>2,7,5)-.5)*grainAmt;d[i]=clamp(d[i]+n,0,255);d[i+1]=clamp(d[i+1]+n,0,255);d[i+2]=clamp(d[i+2]+n,0,255)}}g.putImageData(id,0,0)}
  const o={w,h,cv:c,d:new Uint32Array(g.getImageData(0,0,w,h).data.buffer.slice(0))};
  if(emfn){const c2=document.createElement('canvas');c2.width=w;c2.height=h;const g2=c2.getContext('2d',{willReadFrequently:true});emfn(g2,w,h);o.em=new Uint32Array(g2.getImageData(0,0,w,h).data.buffer.slice(0));o.emCv=c2}
  return o;
}
function lgr(g,x0,y0,x1,y1,stops){const l=g.createLinearGradient(x0,y0,x1,y1);stops.forEach(s=>l.addColorStop(s[0],s[1]));return l}
function rrect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function shadowOval(g,cx,cy,rx,ry){g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.ellipse(cx,cy,rx,ry,0,0,TAU);g.fill()}
const ART={};
function drawCreature(g,pose){
  const s=pose.swing||0,lean=pose.lean||0,W2=96,Hh=192,ar=pose.armRaise||0,sway=pose.sway||0;
  const hx=48+lean*9,hy=34+(pose.crouch||0);
  g.clearRect(0,0,W2,Hh);
  // ساقان حافيتان
  g.fillStyle='#6d665e';
  [[-1,0],[1,0]].forEach(a=>{const lift=a[0]*s>0?Math.abs(s)*6:0;g.fillRect(40+a[0]*9-2,176-lift,5,12);g.beginPath();g.moveTo(38+a[0]*9,187-lift);g.lineTo(34+a[0]*9,191-lift);g.lineTo(46+a[0]*9,191-lift);g.fill()});
  // العباءة الممزقة
  const hem=[];for(let i=0;i<=10;i++){hem.push([14+i*6.8,182+((i%2)?7:0)+Math.sin(i*1.7+sway)*3])}
  g.fillStyle=lgr(g,0,50,0,190,[[0,'#17151a'],[.6,'#0e0d10'],[1,'#070607']]);
  g.beginPath();g.moveTo(34,52);g.bezierCurveTo(24,62,16,120,14,182);hem.forEach(p=>g.lineTo(p[0],p[1]));g.bezierCurveTo(82,120,74,62,62,52);g.bezierCurveTo(56,46,40,46,34,52);g.fill();
  // طيّات
  for(let i=0;i<9;i++){const x=22+i*6,a=.05+(i%3)*.04;g.strokeStyle='rgba(60,58,66,'+a*4+')';g.lineWidth=1.3;g.beginPath();g.moveTo(40+i*2,58);g.quadraticCurveTo(x+Math.sin(sway+i)*3,120,x-2+((i%2)?3:-3),182);g.stroke()}
  g.fillStyle='rgba(0,0,0,.35)';for(let i=0;i<7;i++)g.fillRect(16+i*10,150+((i*7)%20),3+(i%3)*2,2);
  // الذراعان الطويلتان
  const hands=pose.hands||[[26+s*3,150+s*16],[70-s*3,150-s*16]];
  [[33,60,hands[0]],[63,60,hands[1]]].forEach(a=>{
    const[hxs,hys,h]=a;g.strokeStyle='#3b3633';g.lineWidth=4.5;g.lineCap='round';
    g.beginPath();g.moveTo(hxs,hys);g.quadraticCurveTo((hxs+h[0])/2+(hxs<48?-9:9),(hys+h[1])/2,h[0],h[1]);g.stroke();
    g.strokeStyle='#5a534c';g.lineWidth=1.4;
    for(let f=0;f<5;f++){const ang=(hxs<48?Math.PI*.55:Math.PI*.45)+(f-2)*.22+ar*(hxs<48?-.6:.6);g.beginPath();g.moveTo(h[0],h[1]);g.lineTo(h[0]+Math.cos(ang)*13,h[1]+Math.sin(ang)*(pose.armRaise?-13:13));g.stroke()}
  });
  // رأس شاحب
  g.fillStyle=lgr(g,hx-11,hy-14,hx+11,hy+14,[[0,'#8d8780'],[1,'#4d4943']]);
  g.beginPath();g.ellipse(hx,hy,10.5,14,0,0,TAU);g.fill();
  g.fillStyle='#0c0a0a';g.beginPath();g.ellipse(hx,hy+9,4,5.5,0,0,TAU);g.fill();           // فم مظلم
  // شعر طويل
  for(let i=0;i<46;i++){const a=(i/46)*2-1,bx=hx+a*12,ey=hx*0+90+Math.random()*70+(pose.hairLen||0);
    g.strokeStyle=(i%5===0)?'#2b2830':'#0a090b';g.lineWidth=1+Math.random()*1.4;
    g.beginPath();g.moveTo(hx+a*5,hy-12);g.bezierCurveTo(bx+a*7,hy+10,bx+a*14+Math.sin(sway+i)*5,ey-40,bx+a*10+Math.sin(sway*1.3+i)*7,ey);g.stroke()}
  g.fillStyle='rgba(8,7,9,.85)';g.beginPath();g.ellipse(hx,hy-8,12,8,0,Math.PI,TAU);g.fill();
}
function creatureEyes(g,pose){
  const hx=48+(pose.lean||0)*9,hy=34+(pose.crouch||0);g.clearRect(0,0,96,192);
  const gl=g.createRadialGradient(hx-4,hy-1,0,hx-4,hy-1,7);gl.addColorStop(0,'rgba(255,240,170,.9)');gl.addColorStop(1,'rgba(255,120,30,0)');
  g.fillStyle=gl;g.fillRect(hx-14,hy-9,12,16);
  const gr=g.createRadialGradient(hx+4,hy-1,0,hx+4,hy-1,7);gr.addColorStop(0,'rgba(255,240,170,.9)');gr.addColorStop(1,'rgba(255,120,30,0)');
  g.fillStyle=gr;g.fillRect(hx-2,hy-9,14,16);
  g.fillStyle='#fffbe0';g.beginPath();g.ellipse(hx-4,hy-1,2.6,1.3,.15,0,TAU);g.ellipse(hx+4,hy-1,2.6,1.3,-.15,0,TAU);g.fill();
}
function drawPlayer(g,pose){
  const s=pose.s||0,aim=pose.aim||0;g.clearRect(0,0,64,128);
  shadowOval(g,32,124,15,4);
  // الساقان
  g.fillStyle='#2f3138';[[-1],[1]].forEach(a=>{const o=a[0]*s*7;g.fillRect(32+a[0]*7-5,70,10,40-Math.abs(o)*.3);
    g.fillStyle='#4a3524';g.fillRect(32+a[0]*7-6,106+Math.min(0,o*.3),12,8);g.fillStyle='#2f3138'});
  // حقيبة ظهر
  g.fillStyle='#3b3a2c';rrect(g,19,38,26,34,5);g.fill();g.fillStyle='#2a291f';g.fillRect(21,48,22,3);
  // جاكيت
  g.fillStyle=lgr(g,0,36,0,76,[[0,'#59593e'],[1,'#3a3a29']]);rrect(g,15,32,34,42,8);g.fill();
  g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1;g.beginPath();g.moveTo(32,36);g.lineTo(32,74);g.stroke();
  // الذراعان
  g.strokeStyle='#4d4d35';g.lineWidth=7;g.lineCap='round';
  if(aim){g.beginPath();g.moveTo(18,42);g.quadraticCurveTo(14,32,28,22);g.stroke();g.beginPath();g.moveTo(46,42);g.quadraticCurveTo(50,32,36,22);g.stroke();
    g.fillStyle='#b78a63';g.beginPath();g.arc(32,20,4.5,0,TAU);g.fill();g.fillStyle='#17181b';g.fillRect(30,6,4,16)}
  else{g.beginPath();g.moveTo(17,40);g.lineTo(14+s*2,70);g.stroke();g.beginPath();g.moveTo(47,40);g.lineTo(50-s*2,70);g.stroke();
    g.fillStyle='#b78a63';g.beginPath();g.arc(14+s*2,72,4,0,TAU);g.arc(50-s*2,72,4,0,TAU);g.fill()}
  // رأس وشعر
  g.fillStyle='#b78a63';g.fillRect(28,26,8,8);
  g.fillStyle='#16110e';g.beginPath();g.ellipse(32,20,12,13,0,0,TAU);g.fill();
  g.fillStyle='#b78a63';g.fillRect(19,20,3,6);g.fillRect(42,20,3,6);
}
function makeSprites(){
  const A=ART;
  A.key=mkSpr(64,64,(g)=>{shadowOval(g,32,56,18,4);g.strokeStyle=lgr(g,10,20,30,44,[[0,'#f4d56a'],[1,'#8a6420']]);g.lineWidth=6;g.beginPath();g.arc(20,30,11,0,TAU);g.stroke();
    g.fillStyle=lgr(g,0,26,0,36,[[0,'#f0cf62'],[1,'#7e5a1c']]);g.fillRect(30,27,28,6);g.fillRect(46,33,5,10);g.fillRect(53,33,5,7);g.fillRect(38,33,4,7)},null,10);
  A.ammo=mkSpr(64,64,(g)=>{shadowOval(g,32,56,20,4);g.fillStyle=lgr(g,0,22,0,54,[[0,'#6a6d3f'],[1,'#41431f']]);rrect(g,10,24,44,30,3);g.fill();
    g.fillStyle='#d9d3b6';g.fillRect(16,32,32,14);g.fillStyle='#222';g.font='bold 11px sans-serif';g.fillText('9mm',20,43);
    g.fillStyle='#c8963c';for(let i=0;i<5;i++)g.fillRect(14+i*8,20,5,6)},null,14);
  A.band=mkSpr(64,64,(g)=>{shadowOval(g,32,56,16,4);g.fillStyle='#e8e2d2';g.beginPath();g.ellipse(32,38,17,15,0,0,TAU);g.fill();g.fillStyle='#bdb7a6';g.beginPath();g.ellipse(32,38,6,5,0,0,TAU);g.fill();
    g.strokeStyle='#c01f1f';g.lineWidth=3.2;g.beginPath();g.arc(32,36,8,.5,TAU-.8);g.stroke();g.fillStyle='#c01f1f';g.beginPath();g.arc(37,31,1.8,0,TAU);g.fill()},null,8);
  A.cell=mkSpr(64,64,(g)=>{shadowOval(g,32,56,12,4);g.fillStyle=lgr(g,22,0,42,0,[[0,'#6a6f6a'],[.5,'#2b302c'],[1,'#151816']]);rrect(g,22,16,20,38,3);g.fill();g.fillStyle='#d8b04a';g.fillRect(22,16,20,8);g.fillStyle='#bbb';g.fillRect(28,11,8,5)},null,10);
  A.note=mkSpr(64,64,(g)=>{shadowOval(g,32,56,18,4);g.save();g.translate(32,34);g.rotate(-.18);g.fillStyle='#d9c99c';g.fillRect(-18,-22,36,44);g.fillStyle='#bca877';g.beginPath();g.moveTo(18,22);g.lineTo(18,12);g.lineTo(8,22);g.fill();
    g.strokeStyle='#4a3a1c';g.lineWidth=1.2;for(let i=0;i<7;i++){g.beginPath();g.moveTo(-13,-15+i*6);g.lineTo(13-(i%3)*5,-15+i*6);g.stroke()}g.restore()},null,16);
  A.fuse=mkSpr(64,64,(g)=>{shadowOval(g,32,56,14,4);g.fillStyle=lgr(g,0,22,64,22,[[0,'#cfcab8'],[.5,'#f3efe0'],[1,'#a39d8a']]);rrect(g,22,20,20,34,5);g.fill();
    g.fillStyle='#c79a42';g.fillRect(21,16,22,7);g.fillRect(21,50,22,7);g.strokeStyle='#222';g.lineWidth=1;g.beginPath();g.moveTo(32,28);g.lineTo(32,46);g.stroke()},null,8);
  A.jerry=mkSpr(64,64,(g)=>{shadowOval(g,32,58,22,4);g.fillStyle=lgr(g,0,12,0,56,[[0,'#7c8553'],[1,'#454c2a']]);rrect(g,12,16,40,40,4);g.fill();g.fillStyle='#343a20';g.fillRect(14,26,36,3);g.fillRect(14,44,36,3);
    g.strokeStyle='#343a20';g.lineWidth=2;g.beginPath();g.moveTo(14,30);g.lineTo(50,44);g.moveTo(50,30);g.lineTo(14,44);g.stroke();
    g.fillStyle='#2a2e18';g.fillRect(36,6,12,12);g.fillStyle='#b83c24';g.fillRect(20,9,8,7)},null,16);
  A.ledger=mkSpr(64,64,(g)=>{shadowOval(g,32,57,20,4);g.fillStyle=lgr(g,0,16,0,54,[[0,'#6b4228'],[1,'#32190d']]);rrect(g,12,16,40,38,3);g.fill();
    g.strokeStyle='#c9a24a';g.lineWidth=1.6;g.strokeRect(17,21,30,28);g.beginPath();g.arc(32,35,7,0,TAU);g.stroke();g.fillStyle='#c9a24a';g.fillRect(44,16,4,38)},
    (g)=>{const r=g.createRadialGradient(32,35,2,32,35,22);r.addColorStop(0,'rgba(255,200,90,.55)');r.addColorStop(1,'rgba(255,160,40,0)');g.fillStyle=r;g.fillRect(0,0,64,64)},14);
  A.lantern=mkSpr(64,96,(g)=>{shadowOval(g,32,90,16,4);g.fillStyle=lgr(g,0,60,0,90,[[0,'#c19a42'],[1,'#6a4c18']]);rrect(g,18,66,28,22,5);g.fill();
    g.fillStyle='rgba(210,230,240,.35)';g.beginPath();g.moveTo(22,66);g.bezierCurveTo(14,50,20,30,26,24);g.lineTo(38,24);g.bezierCurveTo(44,30,50,50,42,66);g.fill();
    g.strokeStyle='rgba(255,255,255,.35)';g.lineWidth=1;g.beginPath();g.moveTo(25,60);g.bezierCurveTo(20,48,24,34,28,28);g.stroke();
    g.fillStyle='#8a6a28';g.fillRect(24,18,16,7);g.beginPath();g.arc(32,17,5,Math.PI,TAU);g.fill();g.fillStyle='#ffd27a';g.beginPath();g.ellipse(32,52,4,10,0,0,TAU);g.fill()},
    (g)=>{const r=g.createRadialGradient(32,50,0,32,50,28);r.addColorStop(0,'rgba(255,240,170,.95)');r.addColorStop(.35,'rgba(255,170,60,.45)');r.addColorStop(1,'rgba(255,120,20,0)');g.fillStyle=r;g.fillRect(0,0,64,96)});
  A.table=mkSpr(128,96,(g)=>{shadowOval(g,64,88,52,6);g.fillStyle=lgr(g,0,30,0,40,[[0,'#7a5434'],[1,'#563820']]);g.fillRect(8,30,112,12);
    g.fillStyle='#3d2714';g.fillRect(14,42,10,44);g.fillRect(104,42,10,44);g.fillRect(14,64,100,5);
    g.fillStyle='#cfc9ae';g.beginPath();g.ellipse(46,28,14,4,0,0,TAU);g.fill();g.fillStyle='#6b6a60';g.fillRect(84,18,9,12);g.fillStyle='#3a2b1b';g.fillRect(70,23,10,7)},null,16);
  A.chair=mkSpr(64,96,(g)=>{shadowOval(g,32,90,18,4);g.fillStyle='#4b3220';g.fillRect(14,8,5,80);g.fillRect(45,8,5,80);g.fillStyle='#5b3d27';g.fillRect(12,48,40,6);
    for(let i=0;i<4;i++)g.fillRect(19+i*7,12,3,34);g.fillStyle='#a28a54';g.fillRect(14,54,36,6);g.fillStyle='#3a2616';g.fillRect(14,58,5,30);g.fillRect(45,58,5,30)},null,16);
  A.bed=mkSpr(160,96,(g)=>{shadowOval(g,80,90,70,5);g.fillStyle='#262626';g.fillRect(6,40,6,50);g.fillRect(148,40,6,50);g.fillRect(6,38,148,5);
    g.fillStyle=lgr(g,0,44,0,66,[[0,'#8c8068'],[1,'#554a38']]);rrect(g,10,44,140,24,5);g.fill();g.fillStyle='#4b2b2b';g.beginPath();g.moveTo(40,48);g.lineTo(150,48);g.lineTo(150,70);g.lineTo(34,70);g.fill();
    g.fillStyle='#a79e84';rrect(g,14,40,28,12,5);g.fill();g.fillStyle='rgba(0,0,0,.25)';g.fillRect(60,52,30,10);g.fillRect(8,68,144,3)},null,16);
  A.wardrobe=mkSpr(96,192,(g)=>{shadowOval(g,48,186,40,5);g.fillStyle=lgr(g,0,0,96,0,[[0,'#3c2616'],[.5,'#5d3d24'],[1,'#3a2414']]);rrect(g,8,10,80,172,3);g.fill();
    g.strokeStyle='#241509';g.lineWidth=3;g.strokeRect(14,18,32,156);g.strokeRect(50,18,32,156);g.strokeStyle='#7d5835';g.lineWidth=1.4;g.strokeRect(19,26,22,60);g.strokeRect(19,96,22,70);g.strokeRect(55,26,22,60);g.strokeRect(55,96,22,70);
    g.fillStyle='#c6a04a';g.beginPath();g.arc(42,98,3.2,0,TAU);g.arc(54,98,3.2,0,TAU);g.fill();g.fillStyle='#1a0e07';g.fillRect(47,12,2,6);g.fillStyle='#4b2e19';g.fillRect(4,6,88,8)},null,20);
  A.barrel=mkSpr(64,80,(g)=>{shadowOval(g,32,76,22,4);g.fillStyle=lgr(g,10,0,54,0,[[0,'#40483b'],[.4,'#8a8d78'],[1,'#2d3228']]);rrect(g,10,8,44,64,5);g.fill();
    g.fillStyle='rgba(120,52,24,.5)';for(let i=0;i<10;i++)g.fillRect(12+Math.random()*36,10+Math.random()*58,6+Math.random()*8,3+Math.random()*7);
    g.strokeStyle='#22261f';g.lineWidth=2;[22,40,58].forEach(y=>{g.beginPath();g.moveTo(10,y);g.lineTo(54,y);g.stroke()})},null,18);
  A.crate=mkSpr(64,64,(g)=>{shadowOval(g,32,60,24,4);g.fillStyle=lgr(g,0,14,0,58,[[0,'#8a6a40'],[1,'#5a4226']]);g.fillRect(8,14,48,44);
    g.strokeStyle='#2f2113';g.lineWidth=2;g.strokeRect(8,14,48,44);for(let y=26;y<58;y+=12){g.beginPath();g.moveTo(8,y);g.lineTo(56,y);g.stroke()}g.beginPath();g.moveTo(8,14);g.lineTo(56,58);g.moveTo(56,14);g.lineTo(8,58);g.stroke()},null,18);
  A.jar=mkSpr(64,80,(g)=>{shadowOval(g,32,76,18,4);g.fillStyle=lgr(g,14,0,50,0,[[0,'#4f2d1b'],[.4,'#a96a42'],[1,'#432515']]);g.beginPath();g.moveTo(24,10);g.bezierCurveTo(8,24,6,56,22,72);g.lineTo(42,72);g.bezierCurveTo(58,56,56,24,40,10);g.closePath();g.fill();
    g.fillStyle='#3a2012';g.fillRect(22,6,20,7);g.strokeStyle='rgba(30,15,8,.7)';g.lineWidth=1.2;g.beginPath();g.moveTo(20,30);g.lineTo(26,44);g.lineTo(22,58);g.stroke();
    g.strokeStyle='#d9b77e';g.lineWidth=1.5;g.beginPath();g.moveTo(14,34);g.bezierCurveTo(24,40,40,40,50,34);g.stroke()},null,18);
  A.generator=mkSpr(128,96,(g)=>{shadowOval(g,64,90,56,5);g.fillStyle='#2a2b2a';g.fillRect(12,78,104,8);g.fillStyle=lgr(g,0,26,0,78,[[0,'#a62d22'],[1,'#5f160f']]);rrect(g,16,28,96,52,6);g.fill();
    g.fillStyle='#202220';g.fillRect(22,40,36,34);for(let i=0;i<5;i++){g.fillStyle='#363836';g.fillRect(24,44+i*6,32,3)}
    g.fillStyle='#3a3a3a';g.fillRect(70,16,28,14);g.fillStyle='#161616';g.fillRect(100,6,6,26);g.fillStyle='#dad4c2';g.beginPath();g.arc(82,56,10,0,TAU);g.fill();g.fillStyle='#222';g.beginPath();g.arc(82,56,8,0,TAU);g.fill();
    g.strokeStyle='#b8b3a2';g.lineWidth=1.4;g.beginPath();g.moveTo(82,56);g.lineTo(88,50);g.stroke();g.fillStyle='#222';g.fillRect(96,60,12,8)},
    (g)=>{g.fillStyle='#37ff6a';g.beginPath();g.arc(102,64,3,0,TAU);g.fill();const r=g.createRadialGradient(102,64,0,102,64,12);r.addColorStop(0,'rgba(80,255,120,.7)');r.addColorStop(1,'rgba(40,255,90,0)');g.fillStyle=r;g.fillRect(86,48,32,32)},18);
  A.lamppost=mkSpr(48,192,(g)=>{shadowOval(g,24,188,12,3);g.fillStyle=lgr(g,18,0,30,0,[[0,'#3a2a1c'],[.5,'#6b4e32'],[1,'#2b1e13']]);g.fillRect(20,36,8,150);
    g.fillStyle='#262626';g.beginPath();g.moveTo(8,36);g.lineTo(40,36);g.lineTo(32,18);g.lineTo(16,18);g.closePath();g.fill();g.fillStyle='#e8e1c8';g.beginPath();g.arc(24,40,6,0,TAU);g.fill()},
    (g)=>{const r=g.createRadialGradient(24,40,0,24,40,24);r.addColorStop(0,'rgba(255,250,210,1)');r.addColorStop(.3,'rgba(255,220,130,.5)');r.addColorStop(1,'rgba(255,200,90,0)');g.fillStyle=r;g.fillRect(0,10,48,60)},14);
  A.well=mkSpr(112,112,(g)=>{shadowOval(g,56,106,46,6);g.fillStyle=lgr(g,0,56,0,104,[[0,'#8a8270'],[1,'#4f4a3e']]);g.beginPath();g.ellipse(56,66,40,12,0,0,TAU);g.fill();g.fillRect(16,66,80,34);g.beginPath();g.ellipse(56,100,40,10,0,0,Math.PI);g.fill();
    g.fillStyle='#050403';g.beginPath();g.ellipse(56,66,30,8,0,0,TAU);g.fill();for(let i=0;i<22;i++){g.fillStyle='rgba(0,0,0,.22)';g.fillRect(16+((i*37)%72),70+((i*13)%26),9,3)}
    g.fillStyle='#4a3320';g.fillRect(14,8,7,66);g.fillRect(91,8,7,66);g.fillRect(8,6,96,8);g.strokeStyle='#cbb27a';g.lineWidth=1.5;g.beginPath();g.moveTo(56,14);g.lineTo(56,52);g.stroke();g.fillStyle='#3d3f40';g.fillRect(50,52,12,10)},null,22);
  A.bush=mkSpr(96,64,(g)=>{shadowOval(g,48,60,34,5);for(let i=0;i<70;i++){const a=Math.random()*3.1,l=14+Math.random()*28,x=48+(Math.random()-.5)*34,c=Math.random();
    g.strokeStyle=c<.5?'#6a5c2c':c<.8?'#8a7a3c':'#4a3f1e';g.lineWidth=1+Math.random();g.beginPath();g.moveTo(x,58);g.quadraticCurveTo(x+Math.cos(a)*10,58-l*.6,x+(Math.cos(a)*l*.9),58-Math.sin(a)*l);g.stroke();}
    g.fillStyle='#7a6a34';for(let i=0;i<10;i++){g.beginPath();g.arc(30+Math.random()*36,20+Math.random()*30,1.5,0,TAU);g.fill()}},null,0);
  A.deadtree=mkSpr(128,192,(g)=>{shadowOval(g,64,188,26,4);g.strokeStyle='#2c231a';g.lineCap='round';
    const br=(x,y,a,l,w,d)=>{if(d<0||l<6)return;const x2=x+Math.cos(a)*l,y2=y-Math.sin(a)*l;g.lineWidth=w;g.beginPath();g.moveTo(x,y);g.lineTo(x2,y2);g.stroke();br(x2,y2,a+.5+Math.random()*.3,l*.7,w*.7,d-1);br(x2,y2,a-.5-Math.random()*.3,l*.7,w*.7,d-1)};
    br(64,186,Math.PI/2,52,8,5)},null,26);
  A.wreck=mkSpr(256,128,(g,w,h)=>{shadowOval(g,128,120,108,7);
    g.fillStyle=lgr(g,0,56,0,112,[[0,'#d9d6c8'],[1,'#8f8c7e']]);rrect(g,10,58,236,50,12);g.fill();          // الهيكل الأبيض
    g.fillStyle=lgr(g,0,36,0,60,[[0,'#cfccbc'],[1,'#a29f90']]);g.beginPath();g.moveTo(62,60);g.lineTo(84,32);g.lineTo(170,32);g.lineTo(204,60);g.fill();
    g.fillStyle='#1b2227';g.beginPath();g.moveTo(72,58);g.lineTo(90,37);g.lineTo(126,37);g.lineTo(126,58);g.fill();g.beginPath();g.moveTo(132,58);g.lineTo(132,37);g.lineTo(166,37);g.lineTo(194,58);g.fill();
    g.fillStyle='#c46a1e';g.beginPath();g.moveTo(10,68);g.lineTo(62,60);g.lineTo(62,108);g.lineTo(16,108);g.fill();g.beginPath();g.moveTo(246,68);g.lineTo(204,60);g.lineTo(204,108);g.lineTo(240,108);g.fill(); // رفارف برتقالية (تكسي عراقي)
    g.fillStyle='#e8c34a';g.fillRect(104,24,40,10);g.fillStyle='#111';g.font='bold 8px sans-serif';g.fillText('TAXI',116,32);
    g.fillStyle='#111';g.beginPath();g.arc(62,108,19,0,TAU);g.arc(198,108,19,0,TAU);g.fill();g.fillStyle='#6e6a60';g.beginPath();g.arc(62,108,9,0,TAU);g.arc(198,108,9,0,TAU);g.fill();
    g.fillStyle='#f6edc6';g.fillRect(12,74,14,12);g.fillStyle='#8a1c18';g.fillRect(232,76,12,10);g.fillStyle='#333';g.fillRect(8,98,240,8);
    g.fillStyle='rgba(120,70,30,.5)';for(let i=0;i<60;i++)g.fillRect(14+Math.random()*226,62+Math.random()*44,4+Math.random()*10,2+Math.random()*5);
    g.fillStyle='rgba(190,160,110,.35)';g.fillRect(10,92,236,16)},
    (g)=>{[[19,80],[238,80]].forEach(p=>{const r=g.createRadialGradient(p[0],p[1],0,p[0],p[1],14);r.addColorStop(0,'rgba(255,240,180,.55)');r.addColorStop(1,'rgba(255,220,120,0)');g.fillStyle=r;g.fillRect(p[0]-14,p[1]-14,28,28)})},12);
  // نخيل (3 أشكال)
  A.palm=[];
  for(let v=0;v<3;v++)A.palm.push(mkSpr(128,256,(g)=>{
    shadowOval(g,64,250,22,4);const bend=(v-1)*14;
    g.strokeStyle=lgr(g,56,0,72,0,[[0,'#4b3822'],[.5,'#7a5e3a'],[1,'#3d2c1a']]);g.lineWidth=11;g.lineCap='round';g.beginPath();g.moveTo(64,252);g.quadraticCurveTo(64+bend*.4,170,64+bend,70);g.stroke();
    g.strokeStyle='rgba(30,20,10,.6)';g.lineWidth=1.4;for(let y=240;y>80;y-=9){const t=(252-y)/182,x=64+bend*t*t*1.2;g.beginPath();g.moveTo(x-6,y);g.lineTo(x+6,y+3);g.stroke()}
    const cx=64+bend,cy=68;for(let i=0;i<12;i++){const a=-Math.PI+(i/11)*Math.PI+(v-1)*.06,l=56+Math.random()*16,x2=cx+Math.cos(a)*l,y2=cy+Math.sin(a)*l*.55+(Math.abs(Math.cos(a))*34);
      g.strokeStyle=(i%2)?'#3f5a25':'#587436';g.lineWidth=2.4;g.beginPath();g.moveTo(cx,cy);g.quadraticCurveTo(cx+Math.cos(a)*l*.55,cy+Math.sin(a)*l*.55-12,x2,y2);g.stroke();
      for(let k=0;k<14;k++){const t=.2+k/14*.8,qx=cx+(x2-cx)*t,qy=cy+(y2-cy)*t-Math.sin(t*Math.PI)*12;g.lineWidth=1;g.beginPath();g.moveTo(qx,qy);g.lineTo(qx+(Math.cos(a)>0?-1:1)*5,qy+9);g.moveTo(qx,qy);g.lineTo(qx+(Math.cos(a)>0?4:-4),qy+8);g.stroke()}}
    g.fillStyle='#8a4a1c';for(let i=0;i<9;i++){g.beginPath();g.ellipse(cx-10+Math.random()*20,cy+8+Math.random()*10,2.4,3.6,0,0,TAU);g.fill()}
  },null,22));
  // الوحش: إطارات حركة
  A.cr={};const poses={
    idle:{hands:[[26,150],[70,150]],sway:0},
    w0:{swing:1,lean:.4,sway:.6,hands:[[24,142],[72,160]]},w1:{swing:.2,lean:.2,sway:1.4,hands:[[26,152],[70,152]]},
    w2:{swing:-1,lean:.4,sway:2.4,hands:[[24,160],[72,142]]},w3:{swing:-.2,lean:.2,sway:3.2,hands:[[26,152],[70,152]]},
    atk:{lean:-.2,armRaise:1,hands:[[12,66],[84,66]],sway:1,hairLen:20},
    stg:{lean:-1,swing:0,hands:[[38,40],[74,112]],sway:2,crouch:6}
  };
  for(const k in poses)A.cr[k]=mkSpr(96,192,g=>drawCreature(g,poses[k]),g=>creatureEyes(g,poses[k]),10);
  A.watch=mkSpr(96,192,g=>{drawCreature(g,{hands:[[40,150],[56,150]],sway:0,hairLen:40});},g=>creatureEyes(g,{}),10);
  A.pl={};[['idle',{s:0}],['w0',{s:1}],['w1',{s:-1}],['aim',{s:0,aim:1}],['aw0',{s:1,aim:1}],['aw1',{s:-1,aim:1}]].forEach(a=>{A.pl[a[0]]=mkSpr(64,128,g=>drawPlayer(g,a[1]),null,10)});
  // ثقب الرصاص وغبار
  A.hole=mkSpr(16,16,g=>{const r=g.createRadialGradient(8,8,0,8,8,7);r.addColorStop(0,'rgba(8,6,4,.95)');r.addColorStop(.5,'rgba(30,22,14,.8)');r.addColorStop(1,'rgba(30,22,14,0)');g.fillStyle=r;g.fillRect(0,0,16,16)});
  A.puff=mkSpr(32,32,g=>{const r=g.createRadialGradient(16,16,0,16,16,15);r.addColorStop(0,'rgba(200,170,120,.8)');r.addColorStop(1,'rgba(200,170,120,0)');g.fillStyle=r;g.fillRect(0,0,32,32)});
  // مسدس (منظور الشخص الأول)
  A.gun=document.createElement('canvas');A.gun.width=420;A.gun.height=300;drawGun(A.gun.getContext('2d'),420,300);
  A.flash=document.createElement('canvas');A.flash.width=160;A.flash.height=160;(function(g){
    const r=g.createRadialGradient(80,80,0,80,80,78);r.addColorStop(0,'rgba(255,255,230,1)');r.addColorStop(.18,'rgba(255,220,120,.95)');r.addColorStop(.5,'rgba(255,130,30,.5)');r.addColorStop(1,'rgba(255,90,10,0)');g.fillStyle=r;g.fillRect(0,0,160,160);
    g.fillStyle='rgba(255,240,170,.9)';for(let i=0;i<8;i++){g.save();g.translate(80,80);g.rotate(i*Math.PI/4+.2);g.beginPath();g.moveTo(0,-4);g.lineTo(76,0);g.lineTo(0,4);g.fill();g.restore()}})(A.flash.getContext('2d'));
}
function drawGun(g,w,h){
  g.clearRect(0,0,w,h);
  g.save();g.translate(w*.62,h*.5);g.rotate(-.1);
  // الساعد والكمّ
  g.fillStyle=lgr(g,0,60,0,130,[[0,'#59593e'],[1,'#2e2e20']]);g.beginPath();g.moveTo(40,100);g.lineTo(230,70);g.lineTo(250,170);g.lineTo(60,190);g.closePath();g.fill();
  g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=2;for(let i=0;i<5;i++){g.beginPath();g.moveTo(80+i*30,95-i*4);g.lineTo(96+i*30,180-i*2);g.stroke()}
  // قبضة (مقبض)
  g.fillStyle=lgr(g,0,40,0,150,[[0,'#2a2018'],[1,'#120c08']]);g.beginPath();g.moveTo(-20,28);g.lineTo(26,26);g.lineTo(44,118);g.lineTo(-4,126);g.closePath();g.fill();
  g.fillStyle='rgba(255,255,255,.05)';for(let i=0;i<9;i++)for(let j=0;j<5;j++)g.fillRect(-12+j*10+i*1.8,38+i*9,2,2);
  // اليد
  g.fillStyle=lgr(g,0,40,60,130,[[0,'#c99a72'],[1,'#8c6244']]);
  g.beginPath();g.moveTo(-26,34);g.bezierCurveTo(-34,70,-22,112,10,120);g.bezierCurveTo(44,128,62,100,58,62);g.bezierCurveTo(52,40,40,26,10,26);g.closePath();g.fill();
  g.strokeStyle='#6e4a34';g.lineWidth=2;for(let i=0;i<3;i++){g.beginPath();g.moveTo(-24,58+i*20);g.quadraticCurveTo(10,52+i*20,48,60+i*20);g.stroke()}
  g.fillStyle='#c99a72';g.beginPath();g.moveTo(8,30);g.bezierCurveTo(-30,0,-80,-8,-120,-4);g.lineTo(-118,14);g.bezierCurveTo(-70,20,-30,40,8,48);g.fill();   // الإبهام
  // الإطار + حارس الزناد
  g.fillStyle=lgr(g,0,-10,0,40,[[0,'#3b3f44'],[1,'#17191b']]);g.beginPath();g.moveTo(-170,14);g.lineTo(46,10);g.lineTo(40,36);g.lineTo(-30,40);g.lineTo(-170,32);g.closePath();g.fill();
  g.strokeStyle='#17191b';g.lineWidth=5;g.beginPath();g.moveTo(-60,36);g.quadraticCurveTo(-52,62,-24,58);g.lineTo(-18,34);g.stroke();
  g.fillStyle='#0e0f10';g.fillRect(-42,40,8,16);
  // الغطاء (السلايد)
  g.fillStyle=lgr(g,0,-40,0,16,[[0,'#6a7075'],[.2,'#2c3034'],[1,'#0f1112']]);g.beginPath();g.moveTo(-210,-22);g.lineTo(44,-26);g.lineTo(52,14);g.lineTo(-210,12);g.closePath();g.fill();
  g.fillStyle='rgba(255,255,255,.28)';g.fillRect(-206,-20,250,2.5);
  g.fillStyle='#050606';for(let i=0;i<9;i++)g.fillRect(2+i*5,-22,2.2,34);                 // شقوق القبضة
  g.fillStyle='#07090a';g.fillRect(-120,-14,60,12);                                       // نافذة الإخراج
  g.fillStyle='#b9893d';g.fillRect(-114,-10,24,3);                                        // رصاصة نحاسية
  // الماسورة والمشاهد
  g.fillStyle='#0b0c0d';g.fillRect(-232,-16,26,22);g.fillStyle='#222527';g.fillRect(-232,-14,26,3);
  g.fillStyle='#08090a';g.beginPath();g.arc(-232,-5,6,0,TAU);g.fill();
  g.fillStyle='#111';g.fillRect(-196,-32,7,10);g.fillStyle='#e8e8e8';g.fillRect(-194,-30,3,3);
  g.fillStyle='#111';g.fillRect(34,-34,13,10);g.fillStyle='#e8e8e8';g.fillRect(38,-31,2,3);g.fillRect(42,-31,2,3);
  g.fillStyle='#1a1b1c';g.beginPath();g.moveTo(40,-14);g.lineTo(60,-26);g.lineTo(56,-8);g.closePath();g.fill();   // الهامر
  g.restore();
}
