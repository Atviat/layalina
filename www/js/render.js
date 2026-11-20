'use strict';
/* ====== ليالينا — محرك العرض (Raycasting بكسل-بكسل) مع إضاءة وضباب وظلال مخبوزة ====== */
const GFXW=[320,480,640,960];
const FOV_BASE=0.66;
let W=480,H=270,cv,ctx,img,buf,zb,colT,colB,dx2,skyBuf,skyW,skyH,vigCv,grainCv,glowCv={},effRes=1;
const TONE=new Uint8Array(1536);
const aoLUT=new Float32Array(TS);
const CAM={x:3,y:3,a:0,pitch:0,z:0,dx:1,dy:0,px:0,py:.66,hz:0,plane:.66,shake:0};
let FOGR=44,FOGG=36,FOGB=30,rnd0=mkRng(5);
function buildTone(){const b=S.bright/10;for(let i=0;i<1536;i++)TONE[i]=Math.min(255,255*(1-Math.exp(-(i/255)*1.55*b)))|0}
for(let v=0;v<TS;v++){const t=v/TS;aoLUT[v]=(.62+.38*Math.min(1,t*7))*(.7+.3*Math.min(1,(1-t)*5))}
function initRender(){
  cv=$('c');ctx=cv.getContext('2d',{alpha:false});buildTone();
  ['255,190,110','255,255,230','120,255,150'].forEach((c,i)=>{const g=document.createElement('canvas');g.width=g.height=64;const x=g.getContext('2d');
    const r=x.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba('+c+',.9)');r.addColorStop(.25,'rgba('+c+',.35)');r.addColorStop(1,'rgba('+c+',0)');x.fillStyle=r;x.fillRect(0,0,64,64);glowCv[i]=g});
  setRes(S.res);
}
function setRes(idx){
  effRes=clamp(idx|0,0,3);W=GFXW[effRes];H=Math.round(W*9/16);cv.width=W;cv.height=H;
  img=ctx.createImageData(W,H);buf=new Uint32Array(img.data.buffer);
  zb=new Float32Array(W);colT=new Int16Array(W);colB=new Int16Array(W);dx2=new Float32Array(W);
  buildSky();
  vigCv=document.createElement('canvas');vigCv.width=W;vigCv.height=H;const g=vigCv.getContext('2d');
  const rg=g.createRadialGradient(W/2,H/2,H*.3,W/2,H/2,W*.66);rg.addColorStop(0,'rgba(0,0,0,0)');rg.addColorStop(1,'rgba(0,0,0,.82)');g.fillStyle=rg;g.fillRect(0,0,W,H);
  grainCv=document.createElement('canvas');grainCv.width=128;grainCv.height=128;const gg=grainCv.getContext('2d'),gd=gg.createImageData(128,128);
  for(let i=0;i<gd.data.length;i+=4){const v=Math.random()*255;gd.data[i]=gd.data[i+1]=gd.data[i+2]=v;gd.data[i+3]=26}gg.putImageData(gd,0,0);
}
function buildSky(){
  const fov=2*Math.atan(CAM.plane);skyW=Math.round(W*TAU/fov);skyH=Math.ceil(H*.62);
  const c=document.createElement('canvas');c.width=skyW;c.height=skyH;const g=c.getContext('2d',{willReadFrequently:true});
  const gr=g.createLinearGradient(0,0,0,skyH);gr.addColorStop(0,'#02030a');gr.addColorStop(.55,'#0b0f22');gr.addColorStop(.86,'#241a16');gr.addColorStop(1,'#34241a');g.fillStyle=gr;g.fillRect(0,0,skyW,skyH);
  const r=mkRng(99);
  for(let i=0;i<420;i++){g.fillStyle='rgba(255,250,230,'+(.15+r()*.7)+')';const s=r()<.08?2:1;g.fillRect(r()*skyW,r()*skyH*.78,s,s)}
  const mx=skyW*.16,my=skyH*.3,mr=skyH*.07;
  const mg=g.createRadialGradient(mx,my,mr*.4,mx,my,mr*7);mg.addColorStop(0,'rgba(255,238,200,.55)');mg.addColorStop(1,'rgba(255,238,200,0)');g.fillStyle=mg;g.fillRect(mx-mr*7,my-mr*7,mr*14,mr*14);
  g.fillStyle='#f6ead0';g.beginPath();g.arc(mx,my,mr,0,TAU);g.fill();g.fillStyle='rgba(180,160,130,.35)';g.beginPath();g.arc(mx-mr*.3,my-mr*.2,mr*.28,0,TAU);g.arc(mx+mr*.35,my+mr*.3,mr*.2,0,TAU);g.fill();
  // غيوم غبار
  for(let i=0;i<26;i++){const cx=r()*skyW,cy=skyH*(.35+r()*.4),rr=skyH*(.1+r()*.16);const cg=g.createRadialGradient(cx,cy,0,cx,cy,rr*2.2);cg.addColorStop(0,'rgba(90,64,42,.28)');cg.addColorStop(1,'rgba(90,64,42,0)');g.fillStyle=cg;g.fillRect(cx-rr*2.2,cy-rr*2.2,rr*4.4,rr*4.4)}
  // كثبان ونخيل بعيد
  g.fillStyle='#0b0805';g.beginPath();g.moveTo(0,skyH);
  for(let x=0;x<=skyW;x+=3){g.lineTo(x,skyH-skyH*.1-Math.sin(x/skyW*TAU*6)*skyH*.045-Math.sin(x/skyW*TAU*17+1)*skyH*.018)}g.lineTo(skyW,skyH);g.fill();
  for(let i=0;i<24;i++){const x=r()*skyW,h=skyH*(.1+r()*.07),y=skyH-skyH*.1;g.fillStyle='#090604';g.fillRect(x,y-h,1.6,h);
    for(let k=0;k<7;k++){g.beginPath();g.moveTo(x+.8,y-h);g.quadraticCurveTo(x+.8+(k-3)*5,y-h-5,x+.8+(k-3)*8,y-h+8);g.strokeStyle='#090604';g.lineWidth=1;g.stroke()}}
  skyBuf=new Uint32Array(g.getImageData(0,0,skyW,skyH).data.buffer.slice(0));
}

/* ---------- حالة الإضاءة الديناميكية لكل إطار ---------- */
const LT={on:0,rx:0,ry:0,cx:0,cy:0,fr:1,fg:.95,fb:.8,muz:0,amb:[.095,.11,.19],ambIn:[.022,.022,.03],dens:.03,sc:.3};
function smooth(t){return t*t*(3-2*t)}
function shade(c,lr,lg,lb,fa,fr,fg,fb){
  let r=(c&255)*lr,g=((c>>8)&255)*lg,b=((c>>16)&255)*lb;
  r+=(fr-r)*fa;g+=(fg-g)*fa;b+=(fb-b)*fa;
  r=TONE[r<0?0:r>1535?1535:r|0];g=TONE[g<0?0:g>1535?1535:g|0];b=TONE[b<0?0:b>1535?1535:b|0];
  return(0xFF000000|(b<<16)|(g<<8)|r)>>>0;
}

/* ---------- الإطار الكامل ---------- */
const SPR=[];
function renderFrame(dt){
  const cam=CAM,fov2=cam.plane;
  const bob=(G.bobAmt||0);
  const hz=H/2+bob+cam.pitch*H*.9+cam.shake*(Math.random()-.5)*H*.02,zo=cam.z;cam.hz=hz;
  const dX=Math.cos(cam.a),dY=Math.sin(cam.a),plX=-dY*fov2,plY=dX*fov2;cam.dx=dX;cam.dy=dY;cam.px=plX;cam.py=plY;
  const camCell=(cam.y|0)*N+(cam.x|0),indoorCam=ceilIn[camCell];
  const storm=G.storm,dens=indoorCam?.018:(LT.dens+storm*.04);
  // الكشاف
  const fOn=P.flash&&P.bat>0&&!P.hidden;const flick=P.bat<15?(Math.random()<.18?.25:1):1;
  const fI=fOn?1.55*flick:0;
  LT.cx=W/2;LT.cy=H*.5+(I.aim?0:H*.03);LT.rx=W*(I.aim?.24:.31);LT.ry=H*(I.aim?.28:.36);
  for(let x=0;x<W;x++){const t=(x-LT.cx)/LT.rx;dx2[x]=t*t}
  const muz=LT.muz;
  FOGR=34+storm*26;FOGG=27+storm*18;FOGB=24+storm*10;if(indoorCam){FOGR*=.45;FOGG*=.45;FOGB*=.5}
  const bright=1;
  // ---- جدران ----
  const rdMax=40;
  for(let x=0;x<W;x++){
    const cx=2*x/W-1,rdx=dX+plX*cx,rdy=dY+plY*cx;
    let mx=cam.x|0,my=cam.y|0;const ddx=Math.abs(1/(rdx||1e-9)),ddy=Math.abs(1/(rdy||1e-9));
    let stx,sty,sdx,sdy;
    if(rdx<0){stx=-1;sdx=(cam.x-mx)*ddx}else{stx=1;sdx=(mx+1-cam.x)*ddx}
    if(rdy<0){sty=-1;sdy=(cam.y-my)*ddy}else{sty=1;sdy=(my+1-cam.y)*ddy}
    let side=0,hit=0,n=0;
    while(n++<48){
      if(sdx<sdy){sdx+=ddx;mx+=stx;side=0}else{sdy+=ddy;my+=sty;side=1}
      if(mx<0||my<0||mx>=N||my>=N){hit=1;break}
      hit=map[my*N+mx];if(hit)break;
    }
    let pd=side===0?sdx-ddx:sdy-ddy;if(pd<.04)pd=.04;
    zb[x]=hit?pd:rdMax;
    if(!hit){colT[x]=H;colB[x]=-1;continue}
    const lh=H/pd,y0f=hz-lh/2+zo*lh,y0=Math.max(0,Math.floor(y0f)),y1=Math.min(H-1,Math.floor(y0f+lh));
    colT[x]=y0;colB[x]=y1;
    let wx=side===0?cam.y+pd*rdy:cam.x+pd*rdx;wx-=Math.floor(wx);
    let tx=(wx*TS)|0;if((side===0&&rdx>0)||(side===1&&rdy<0))tx=TS-1-tx;
    const tex=TEX[hit];
    // إضاءة مخبوزة عند نقطة الاصطدام (مسحوبة قليلاً نحو الكاميرا)
    const hxw=cam.x+(pd-.07)*rdx,hyw=cam.y+(pd-.07)*rdy;
    let li=((hyw*LR)|0)*LM+((hxw*LR)|0);if(li<0||li>=lmR.length)li=0;
    const inRoom=ceilIn[(hyw|0)*N+(hxw|0)];const amb=inRoom?LT.ambIn:LT.amb;
    let br=amb[0]+lmR[li],bg=amb[1]+lmG[li],bb=amb[2]+lmB[li];
    if(muz>0){const mf=muz*Math.max(0,1-pd/9);const m=mf*mf*1.6;br+=m;bg+=m*.7;bb+=m*.35}
    if(side===1){br*=.86;bg*=.86;bb*=.86}
    const fa=1-Math.exp(-pd*dens);
    const att=fI/(1+pd*pd*.05)*(1-smooth(clamp((pd-16)/8,0,1)));
    const dxx=dx2[x];
    const ifl=1/lh*TS;
    for(let y=y0;y<=y1;y++){
      let v=((y-y0f)*ifl)|0;v=v<0?0:v>TS-1?TS-1:v;
      const c=tex[(v<<7)+tx];
      let lr=br,lg=bg,lb=bb;
      if(fI>0){const ey=(y-LT.cy)/LT.ry,t=1-(dxx+ey*ey);if(t>0){const f=smooth(t)*att;lr+=f*LT.fr;lg+=f*LT.fg;lb+=f*LT.fb}}
      const ao=aoLUT[v];lr*=ao;lg*=ao;lb*=ao;
      buf[y*W+x]=shade(c,lr,lg,lb,fa,FOGR,FOGG,FOGB);
    }
  }
  // ---- أرض وسقف ----
  const sOff=(((cam.a-Math.atan(fov2))/TAU%1)+1)%1*skyW;
  const aOut=LT.amb,aIn=LT.ambIn;
  const yFloor0=Math.max(0,Math.floor(hz)+1);
  for(let y=yFloor0;y<H;y++){
    const p=y+.5-hz;let dist=(.5+zo)*H/p;if(dist>60)dist=60;
    const fa=1-Math.exp(-dist*dens);
    const att=fI/(1+dist*dist*.05)*(1-smooth(clamp((dist-16)/8,0,1)));
    const ey=(y-LT.cy)/LT.ry,ey2=ey*ey;
    let mz=0;if(muz>0){const mf=muz*Math.max(0,1-dist/9);mz=mf*mf*1.6}
    let fx=cam.x+dist*(dX-plX),fy=cam.y+dist*(dY-plY);const dfx=dist*2*plX/W,dfy=dist*2*plY/W;
    const row=y*W;
    for(let x=0;x<W;x++,fx+=dfx,fy+=dfy){
      if(y>=colT[x]&&y<=colB[x])continue;
      let ft=0,ci=0,inR=0,li=-1;
      if(fx>=0&&fy>=0&&fx<N&&fy<N){ci=(fy|0)*N+(fx|0);ft=ftype[ci];inR=ceilIn[ci];li=((fy*LR)|0)*LM+((fx*LR)|0)}
      const sc=ft===2?1:ft===1?.5:.36;
      const u=((((fx*sc)%1)*TS)|0),v=((((fy*sc)%1)*TS)|0);
      const c=FLOORT[ft][(v<<7)+u];
      const am=ft===2?aIn:aOut;
      let lr=am[0],lg=am[1],lb=am[2];
      if(li>=0){lr+=lmR[li];lg+=lmG[li];lb+=lmB[li]}
      if(mz>0){lr+=mz;lg+=mz*.7;lb+=mz*.35}
      if(fI>0){const t=1-(dx2[x]+ey2);if(t>0){const f=smooth(t)*att;lr+=f*LT.fr;lg+=f*LT.fg;lb+=f*LT.fb}}
      buf[row+x]=shade(c,lr,lg,lb,fa,FOGR,FOGG,FOGB);
    }
  }
  const yCeil1=Math.min(H-1,Math.ceil(hz)-1);
  for(let y=0;y<=yCeil1;y++){
    const p=hz-(y+.5);const dc=(.5-zo)*H/Math.max(p,.0001);
    const dist=dc>60?60:dc;
    const fa=1-Math.exp(-dist*dens);
    const att=fI/(1+dist*dist*.05)*(1-smooth(clamp((dist-16)/8,0,1)));
    const ey=(y-LT.cy)/LT.ry,ey2=ey*ey;
    let mz=0;if(muz>0){const mf=muz*Math.max(0,1-dist/9);mz=mf*mf*1.6}
    let fx=cam.x+dist*(dX-plX),fy=cam.y+dist*(dY-plY);const dfx=dist*2*plX/W,dfy=dist*2*plY/W;
    const row=y*W;const sy=clamp(y-Math.floor(hz-skyH),0,skyH-1);
    const haze=clamp(1-(hz-y)/(H*.3),0,1)*(.25+storm*.55);
    for(let x=0;x<W;x++,fx+=dfx,fy+=dfy){
      if(y>=colT[x]&&y<=colB[x])continue;
      let inR=0,ci=0,li=-1;
      if(fx>=0&&fy>=0&&fx<N&&fy<N){ci=(fy|0)*N+(fx|0);inR=ceilIn[ci];li=((fy*LR)|0)*LM+((fx*LR)|0)}
      if(inR){
        const u=((((fx*.5)%1)*TS)|0),v=((((fy*.5)%1)*TS)|0);const c=CEILT[0][(v<<7)+u];
        let lr=aIn[0]+(li>=0?lmR[li]:0),lg=aIn[1]+(li>=0?lmG[li]:0),lb=aIn[2]+(li>=0?lmB[li]:0);
        if(mz>0){lr+=mz;lg+=mz*.7;lb+=mz*.35}
        if(fI>0){const t=1-(dx2[x]+ey2);if(t>0){const f=smooth(t)*att;lr+=f*LT.fr;lg+=f*LT.fg;lb+=f*LT.fb}}
        buf[row+x]=shade(c,lr,lg,lb,fa,FOGR,FOGG,FOGB);
      }else{
        const c=skyBuf[sy*skyW+(((x+sOff)|0)%skyW)];
        let r=(c&255),g=(c>>8)&255,b=(c>>16)&255;
        r+=(FOGR*2.2-r)*haze;g+=(FOGG*2.2-g)*haze;b+=(FOGB*2.2-b)*haze;
        r*=1+bright*.5;g*=1+bright*.5;b*=1+bright*.5;
        buf[row+x]=(0xFF000000|((b>255?255:b)<<16)|((g>255?255:g)<<8)|(r>255?255:r))>>>0;
      }
    }
  }
  // ---- أجسام ----
  collectSprites();
  const inv=1/(plX*dY-dX*plY);
  for(let i=0;i<SPR.length;i++)SPR[i]._d=0;
  SPR.sort((a,b)=>b.ty-a.ty);
  for(let i=0;i<SPR.length;i++)drawSprite(SPR[i],hz,zo,fI,dens,muz);
  ctx.putImageData(img,0,0);
  // ---- هالات الإضاءة (تتألق فوق الصورة) ----
  ctx.globalCompositeOperation='lighter';
  for(let i=0;i<SPR.length;i++){const s=SPR[i];if(!s.glow||s.sx<0||s.sx>=W)continue;if(s.ty>=zb[s.sx|0])continue;
    const sz=(s.glow===2?H/s.ty*.8:H/s.ty*.55)*(1+.05*Math.sin(G.t*9+s.x));const gi=s.gk||0;
    ctx.globalAlpha=clamp(s.ga*(1/(1+s.ty*.12)),0,1);ctx.drawImage(glowCv[gi],s.sx-sz/2,s.sy-sz/2,sz,sz)}
  ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  postFX(dt);
}

/* ---------- جمع الأجسام المرئية ---------- */
function newSpr(o){return o}
function collectSprites(){
  SPR.length=0;
  const cam=CAM,dX=cam.dx,dY=cam.dy,plX=cam.px,plY=cam.py,inv=1/(plX*dY-dX*plY);
  const add=(x,y,art,sw,sh,lift,extra)=>{
    const rx=x-cam.x,ry=y-cam.y,tx=inv*(dY*rx-dX*ry),ty=inv*(-plY*rx+plX*ry);
    if(ty<.12||ty>30)return null;
    const scx=(W/2)*(1+tx/ty);if(scx<-H/ty*sw||scx>W+H/ty*sw)return null;
    const s={x,y,art,sw,sh,lift,tx,ty,sx:scx,sy:0,glow:0,ga:0,gk:0,selfL:0,alpha:1};
    if(extra)Object.assign(s,extra);SPR.push(s);return s};
  for(let i=0;i<objs.length;i++){const o=objs[i];if(o.gone)continue;
    if(Math.abs(o.x-cam.x)>30||Math.abs(o.y-cam.y)>30)continue;
    let ex=null;
    if(o.pick){ex={glow:1,ga:.55+.15*Math.sin(G.t*3+o.x),gk:o.id==='ledger'?0:o.id==='cell'?2:1,selfL:.55}}
    else if(o.lantern&&o.lit){ex={glow:1,ga:.9,gk:0,emOn:1}}
    else if(o.lamp&&o.on){ex={glow:2,ga:.9,gk:1,emOn:1}}
    else if(o.generator&&o.on){ex={glow:1,ga:.5,gk:2,emOn:1}}
    else if(o.car){ex={glow:0,emOn:1}}
    else if(o.lantern){ex={emOn:0}}
    else if(o.lamp||o.generator)ex={emOn:0};
    const s=add(o.x,o.y,o.art,o.sw,o.sh,o.lift,ex);
    if(s){s.sy=0;s.o=o}
  }
  for(const f of G.fx){add(f.x,f.y,f.art,f.sw*(f.grow?1+(1-f.life/f.max)*2:1),f.sh*(f.grow?1+(1-f.life/f.max)*2:1),f.lift,{alpha:clamp(f.life/f.max*1.5,0,1),selfL:f.selfL||0})}
  if(G.cr&&G.cr.vis){const c=G.cr;add(c.x,c.y,c.art,.52,1.02,0,{emOn:1,creature:1,fadeA:c.alpha})}
  if(G.watch&&G.watch.on){const w=G.watch;add(w.x,w.y,ART.watch,.5,1.0,0,{emOn:1,creature:1,fadeA:w.alpha})}
  if(CAM.tp>.04){const pl=P;add(pl.x,pl.y,pl.art,.33,.64,0,{alpha:clamp(CAM.tp*1.4,0,1),player:1})}
}
function drawSprite(s,hz,zo,fI,dens,muz){
  const art=s.art;if(!art)return;
  const ty=s.ty,hpx=H/ty,sh=hpx*s.sh,sw=hpx*s.sw;
  const bot=hz+hpx*(.5+zo)-s.lift*hpx,top=bot-sh;
  s.sy=bot-sh*.5;
  const left=s.sx-sw/2,x0=Math.max(0,Math.floor(left)),x1=Math.min(W-1,Math.ceil(left+sw));
  const y0=Math.max(0,Math.floor(top)),y1=Math.min(H-1,Math.ceil(bot));
  if(x1<x0||y1<y0)return;
  const iw=art.w,ih=art.h,du=iw/sw,dv=ih/sh,d=art.d,em=(s.emOn!==0)?art.em:null;
  // إضاءة الجسم
  let li=((s.y*LR)|0)*LM+((s.x*LR)|0);if(li<0||li>=lmR.length)li=0;
  const ci=(s.y|0)*N+(s.x|0),amb=ceilIn[ci]?LT.ambIn:LT.amb;
  let br=amb[0]+lmR[li]*.9,bg=amb[1]+lmG[li]*.9,bb=amb[2]+lmB[li]*.9;
  if(s.selfL){br=Math.max(br,s.selfL);bg=Math.max(bg,s.selfL*.9);bb=Math.max(bb,s.selfL*.7)}
  if(muz>0){const mf=muz*Math.max(0,1-ty/9);const m=mf*mf*1.6;br+=m;bg+=m*.7;bb+=m*.35}
  const fa=1-Math.exp(-ty*dens);
  const att=fI/(1+ty*ty*.05)*(1-smooth(clamp((ty-16)/8,0,1)));
  const ga=s.alpha*(s.fadeA==null?1:s.fadeA);
  for(let x=x0;x<=x1;x++){
    if(ty>=zb[x])continue;
    let u=((x+.5-left)*du)|0;u=u<0?0:u>=iw?iw-1:u;
    const dxx=dx2[x];
    for(let y=y0;y<=y1;y++){
      let v=((y+.5-top)*dv)|0;v=v<0?0:v>=ih?ih-1:v;
      const c=d[v*iw+u];let a=(c>>>24);
      let e=0;if(em){e=em[v*iw+u]>>>24}
      if(a<8&&e<8)continue;
      let lr=br,lg=bg,lb=bb;
      if(fI>0){const ey=(y-LT.cy)/LT.ry,t=1-(dxx+ey*ey);if(t>0){const f=smooth(t)*att;lr+=f*LT.fr;lg+=f*LT.fg;lb+=f*LT.fb}}
      const idx=y*W+x;let out;
      if(a>=8){
        out=shade(c,lr,lg,lb,fa,FOGR,FOGG,FOGB);
        const aa=a/255*ga;
        if(aa<.98){const bgc=buf[idx];const r=(bgc&255)+((out&255)-(bgc&255))*aa,g=((bgc>>8)&255)+(((out>>8)&255)-((bgc>>8)&255))*aa,b=((bgc>>16)&255)+(((out>>16)&255)-((bgc>>16)&255))*aa;out=(0xFF000000|(b<<16)|(g<<8)|r)>>>0}
      }else out=buf[idx];
      if(e>=8){const ec=em[v*iw+u],k=(e/255)*(1-fa*.6)*ga;let r=(out&255)+(ec&255)*k,g=((out>>8)&255)+((ec>>8)&255)*k,b=((out>>16)&255)+((ec>>16)&255)*k;
        out=(0xFF000000|((b>255?255:b)<<16)|((g>255?255:g)<<8)|(r>255?255:r))>>>0}
      buf[idx]=out;
    }
  }
}

/* ---------- ما بعد المعالجة والمسدس والتأثيرات السينمائية ---------- */
function postFX(dt){
  const fx=S.fx|0;
  // عاصفة رملية: خطوط غبار مدفوعة بالرياح
  if(fx>0){
    const cnt=(fx===1?30:70)+((G.storm*60)|0);ctx.strokeStyle='rgba(205,165,112,'+(.05+G.storm*.12)+')';ctx.lineWidth=1;ctx.beginPath();
    for(let i=0;i<cnt;i++){const x=Math.random()*W,y=Math.random()*H,l=6+Math.random()*(W*.05)*(.5+G.storm);ctx.moveTo(x,y);ctx.lineTo(x-l,y+l*.12)}ctx.stroke();
    if(fx>1){ctx.fillStyle='rgba(240,214,170,.05)';for(let i=0;i<28;i++){ctx.fillRect(Math.random()*W,Math.random()*H,1.5,1.5)}}
  }
  ctx.globalAlpha=clamp(G.storm*.2,0,.4);ctx.fillStyle='#6b4a28';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
  // مسدس الشخص الأول
  if(CAM.tp<.5&&!P.hidden&&G.mode==='play')drawGunVM(dt);
  // وميض المسدس على الشاشة
  if(LT.muz>.02&&CAM.tp<.5){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=clamp(LT.muz*.35,0,.4);ctx.fillStyle='#ffb04a';ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
  // تخفيف: دم عند الإصابة
  if(G.hurt>0){ctx.fillStyle='rgba(120,0,0,'+clamp(G.hurt*.5,0,.6)+')';ctx.fillRect(0,0,W,H);const rg=ctx.createRadialGradient(W/2,H/2,H*.2,W/2,H/2,W*.6);rg.addColorStop(0,'rgba(80,0,0,0)');rg.addColorStop(1,'rgba(140,0,0,'+clamp(G.hurt*.9,0,.9)+')');ctx.fillStyle=rg;ctx.fillRect(0,0,W,H)}
  if(P.hp<35&&G.mode==='play'){const k=(35-P.hp)/35*(.4+.2*Math.sin(G.t*6));const rg=ctx.createRadialGradient(W/2,H/2,H*.25,W/2,H/2,W*.62);rg.addColorStop(0,'rgba(0,0,0,0)');rg.addColorStop(1,'rgba(90,0,0,'+k+')');ctx.fillStyle=rg;ctx.fillRect(0,0,W,H)}
  // قرب الوحش: توتر لوني
  if(G.close>0&&G.mode==='play'){ctx.fillStyle='rgba(90,0,0,'+(G.close*.14)+')';ctx.fillRect(0,0,W,H)}
  ctx.drawImage(vigCv,0,0);
  if(fx>1){ctx.globalAlpha=1;ctx.globalCompositeOperation='overlay';ctx.drawImage(grainCv,((Math.random()*64)|0)-64,((Math.random()*64)|0)-64,W+128,H+128);ctx.globalCompositeOperation='source-over'}
  // الاختباء داخل الخزانة
  if(P.hidden){ctx.fillStyle='#0a0604';for(let i=0;i<14;i++){const x=i*W/14;ctx.fillRect(x,0,W/14*.62,H)}ctx.fillStyle='rgba(0,0,0,.4)';ctx.fillRect(0,0,W,H)}
  // علامة التصويب
  if(G.mode==='play'&&!P.hidden&&(CAM.tp>.3||I.aim)){const cx=W/2,cy=LT.cy-(H*.0),s=Math.max(2,H*.012),sp=s*(1.4+G.spread*10);ctx.strokeStyle='rgba(235,235,225,.8)';ctx.lineWidth=Math.max(1,H/270);
    ctx.beginPath();ctx.moveTo(cx-sp-s,cy);ctx.lineTo(cx-sp,cy);ctx.moveTo(cx+sp,cy);ctx.lineTo(cx+sp+s,cy);ctx.moveTo(cx,cy-sp-s);ctx.lineTo(cx,cy-sp);ctx.moveTo(cx,cy+sp);ctx.lineTo(cx,cy+sp+s);ctx.stroke()}
  if(G.hitMark>0){const cx=W/2,cy=H/2,s=H*.025;ctx.strokeStyle='rgba(255,70,50,'+clamp(G.hitMark*5,0,1)+')';ctx.lineWidth=Math.max(1.5,H/200);ctx.beginPath();[[-1,-1],[1,-1],[-1,1],[1,1]].forEach(a=>{ctx.moveTo(cx+a[0]*s*.5,cy+a[1]*s*.5);ctx.lineTo(cx+a[0]*s,cy+a[1]*s)});ctx.stroke()}
  if(G.fade>0){ctx.fillStyle='rgba('+(G.fadeCol||'0,0,0')+','+clamp(G.fade,0,1)+')';ctx.fillRect(0,0,W,H)}
  if(G.bars>0){const b=H*.11*G.bars;ctx.fillStyle='#000';ctx.fillRect(0,0,W,b);ctx.fillRect(0,H-b,W,b)}
}
const GUNM={x:0,y:0,rot:0,kick:0,reload:0,t:0,mx:0,my:0};
function drawGunVM(dt){
  const g=ART.gun,s=H/300*1.12*(I.aim?1.08:1);
  const aim=G.aimK||0,bobx=Math.sin(P.bob*.5)*(P.moving?W*.008:W*.002),boby=Math.abs(Math.sin(P.bob*.5))*(P.moving?H*.012:H*.003);
  const sw=G.swayX||0,sy=G.swayY||0;
  const rl=G.gun.reload>0?Math.sin(clamp(1-G.gun.reload/G.gun.reloadMax,0,1)*Math.PI):0;
  const px0=lerp(W*.70,W*.62,aim)+bobx*(1-aim)+sw*W*.25,py0=lerp(H*.86,H*.80,aim)+boby*(1-aim)+sy*H*.2+rl*H*.45+G.gun.kick*H*.06;
  ctx.save();ctx.translate(px0,py0);ctx.rotate(-.04*G.gun.kick+rl*.35+(G.recRot||0));ctx.scale(s,s);
  ctx.drawImage(g,-g.width*.62,-g.height*.5);
  if(G.gun.flash>0){const mx=-237.3,my=18.8,fl=ART.flash,fs=(95+Math.random()*50)*G.gun.flash;ctx.globalCompositeOperation='lighter';ctx.globalAlpha=clamp(G.gun.flash*1.2,0,1);
    ctx.drawImage(fl,mx-fs,my-fs,fs*2,fs*2);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1}
  ctx.restore();
}
