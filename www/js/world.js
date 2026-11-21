'use strict';
/* ====== أيهم — العالم: خريطة، بيوت، أغراض، أضواء مخبوزة بظلال، ملاحة ====== */
const N=48;
let map,ftype,ceilIn,navB,objs,obstG,lights,lmS,lmF,LR=3,LM=0,lmR,lmG,lmB;
const HOUSES=[
  {x:8,y:6,w:8,h:7,name:'بيت أبو علي'},
  {x:22,y:4,w:9,h:8,name:'بيت المختار',locked:'key1'},
  {x:36,y:8,w:7,h:7,name:'كوخ المولّد'},
  {x:5,y:20,w:9,h:8,name:'البيت المهجور'},
  {x:18,y:18,w:10,h:9,name:'ديوانية القرية'},
  {x:33,y:22,w:8,h:9,name:'بيت أم حمدان',locked:'gen'},
  {x:10,y:34,w:8,h:8,name:'الحظيرة'},
  {x:24,y:35,w:9,h:7,name:'بيت الشيخ'},
  {x:38,y:36,w:7,h:8,name:'المضيف'}
];
const CAR_POS={x:3.4,y:4.3};
const START_POS={x:5.4,y:4.6,a:0};
const roadCell=(x,y)=>(y>=3&&y<=5&&x>=1&&x<=17)||(x>=16&&x<=17&&y>=3&&y<=33)||(y>=32&&y<=33&&x>=16&&x<=46);
const cellS=(x,y)=>x<0||y<0||x>=N||y>=N||map[y*N+x]>0;
const inRect=(h,x,y,m)=>x>=h.x-m&&x<h.x+h.w+m&&y>=h.y-m&&y<h.y+h.h+m;
function houseAt(x,y){for(let i=0;i<HOUSES.length;i++){const h=HOUSES[i];if(x>h.x&&x<h.x+h.w-1&&y>h.y&&y<h.y+h.h-1)return i}return -1}

function addObj(k,x,y,o){
  const a=ART[k]||o.art;const ob=Object.assign({k,x,y,art:a,sw:.3,sh:.3,lift:0,r:0},o||{});
  ob.art=o&&o.art||a;objs.push(ob);
  if(ob.r>0){const cx=x|0,cy=y|0;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const xx=cx+i,yy=cy+j;if(xx<0||yy<0||xx>=N||yy>=N)continue;(obstG[yy*N+xx]=obstG[yy*N+xx]||[]).push(ob)}
    if(ob.r>=.14)navB[cy*N+cx]=1}
  return ob;
}
function buildWorld(){
  const r=mkRng(777);
  map=new Uint8Array(N*N);ftype=new Uint8Array(N*N);ceilIn=new Uint8Array(N*N);navB=new Uint8Array(N*N);
  objs=[];obstG=new Array(N*N);lights=[];
  for(let i=0;i<N;i++){map[i]=1;map[(N-1)*N+i]=1;map[i*N]=1;map[i*N+N-1]=1}
  HOUSES.forEach((h,hi)=>{
    const{x,y,w}=h,hh=h.h;h.dx=x+(w>>1);h.items=[];
    for(let i=0;i<w;i++){map[y*N+x+i]=1;map[(y+hh-1)*N+x+i]=1}
    for(let j=0;j<hh;j++){map[(y+j)*N+x]=1;map[(y+j)*N+x+w-1]=1}
    for(let i=2;i<w-2;i+=3){map[y*N+x+i]=4}                                      // نوافذ شمالية
    for(let j=2;j<hh-2;j+=3){map[(y+j)*N+x]=4;map[(y+j)*N+x+w-1]=4}
    if(h.locked){const t=h.locked==='key1'?5:6;map[(y+hh-1)*N+h.dx]=t;map[(y+hh-1)*N+h.dx+1]=t;h.door=t}
    else{map[(y+hh-1)*N+h.dx]=0;map[(y+hh-1)*N+h.dx+1]=0;
      const sx=x<16?x+w-1:x,sy=y+(hh>>1);map[sy*N+sx]=0;                           // مدخل جانبي نحو الطريق
      for(let k=0;k<2;k++){const cx=x+1+((r()*(w-2))|0);if(map[y*N+cx]===1)map[y*N+cx]=0}}  // انهيار جدار شمالي
    if(w>=8)for(let j=1;j<hh-3;j++)map[(y+j)*N+x+(w>>1)-1]=1;                      // جدار داخلي
    for(let j=y;j<y+hh;j++)for(let i=x;i<x+w;i++){const c=j*N+i;if(map[c]===0){ftype[c]=2;ceilIn[c]=1}}
  });
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const c=y*N+x;if(map[c]===0&&!ceilIn[c]&&roadCell(x,y))ftype[c]=1}
  // فتحات في السقف تدخل منها أشعة القمر
  HOUSES.forEach((h,hi)=>{
    const n=h.locked?1:2;
    for(let k=0;k<n;k++){for(let t=0;t<30;t++){const cx=h.x+2+((r()*(h.w-4))|0),cy=h.y+1+((r()*(h.h-4))|0);
      if(map[cy*N+cx]===0&&ceilIn[cy*N+cx]){ceilIn[cy*N+cx]=0;lights.push({x:cx+.5,y:cy+.5,col:[.36,.5,.95],rad:3.3,int:.95,fl:0,on:1,kind:'moon'});break}}}
  });
  const spots=[];
  const interior=(h)=>{for(let t=0;t<60;t++){const cx=h.x+1+((r()*(h.w-2))|0),cy=h.y+1+((r()*(h.h-3))|0);
    if(map[cy*N+cx]!==0)continue;if(cx>=h.dx-1&&cx<=h.dx+2&&cy>=h.y+h.h-3)continue;
    const px=cx+.5+(r()-.5)*.3,py=cy+.5+(r()-.5)*.3;
    if(objs.some(o=>o.house===h&&Math.hypot(o.x-px,o.y-py)<.85))continue;return[px,py]}return null};
  const put=(hi,k,o)=>{const h=HOUSES[hi],p=interior(h);if(!p)return null;return addObj(k,p[0],p[1],Object.assign({house:h},o))};
  // أثاث وأغراض لكل بيت
  const F={table:{sw:.5,sh:.37,r:.3},chair:{sw:.22,sh:.34,r:.1},bed:{sw:.85,sh:.52,r:.36},wardrobe:{sw:.36,sh:.74,r:.26,hide:1},barrel:{sw:.24,sh:.3,r:.15},crate:{sw:.25,sh:.25,r:.15},jar:{sw:.21,sh:.27,r:.1}};
  const furn=(hi,list)=>list.forEach(k=>put(hi,k,F[k]));
  furn(0,['table','chair','bed','wardrobe','jar','crate']);
  furn(1,['table','chair','chair','bed','wardrobe','barrel','jar']);
  furn(2,['barrel','crate','crate','barrel']);
  furn(3,['bed','wardrobe','table','jar','crate','barrel']);
  furn(4,['table','table','chair','chair','chair','wardrobe','wardrobe','jar','jar']);
  furn(5,['bed','wardrobe','table','chair','jar','jar']);
  furn(6,['barrel','barrel','crate','crate','crate','jar']);
  furn(7,['table','chair','bed','wardrobe','jar','crate']);
  furn(8,['table','chair','crate','barrel','jar']);
  // فوانيس: على الطاولات أو على الأرض
  const lantern=(hi,lit)=>{const h=HOUSES[hi];const tb=objs.filter(o=>o.house===h&&o.k==='table');
    let x,y,lift=0;if(tb.length){const t=tb[(r()*tb.length)|0];x=t.x;y=t.y;lift=.3}else{const p=interior(h);if(!p)return;x=p[0];y=p[1]}
    const ob=addObj('lantern',x,y,{house:h,sw:.2,sh:.3,lift,r:0,lantern:1,lit:lit?1:0,glow:1});
    if(lit)lights.push({x,y,col:[1,.6,.28],rad:5.8,int:.95,fl:1,on:1,kind:'lantern',obj:ob});return ob};
  lantern(0,1);lantern(0,0);lantern(1,1);lantern(2,1);lantern(3,0);lantern(4,1);lantern(4,1);lantern(5,0);lantern(6,0);lantern(7,1);lantern(8,0);
  // أغراض المهمة والتموين
  const item=(hi,id,art,o)=>{const ob=put(hi,'item',Object.assign({art:ART[art],id,sw:.2,sh:.2,lift:.01,r:0,pick:1,glow:1},o||{}));if(ob)ob.k=id;return ob};
  item(0,'key1','key',{sw:.17,sh:.17});item(0,'ammo','ammo');item(0,'note0','note');item(0,'band','band');
  item(1,'fuse','fuse',{sw:.16,sh:.22});item(1,'ammo','ammo');item(1,'ammo','ammo');item(1,'note2','note');item(1,'band','band');
  item(2,'note3','note');item(2,'cell','cell',{sw:.17,sh:.22});
  item(3,'note1','note');item(3,'ammo','ammo');item(3,'cell','cell',{sw:.17,sh:.22});
  item(4,'note4','note');item(4,'ammo','ammo');item(4,'band','band');
  item(5,'ledger','ledger',{sw:.26,sh:.26});item(5,'note6','note');item(5,'ammo','ammo');
  item(6,'jerry','jerry',{sw:.3,sh:.3});item(6,'note5','note');item(6,'ammo','ammo');item(6,'cell','cell',{sw:.17,sh:.22});
  item(7,'note7','note');item(7,'ammo','ammo');item(7,'band','band');
  item(8,'note8','note');item(8,'ammo','ammo');item(8,'ammo','ammo');item(8,'cell','cell',{sw:.17,sh:.22});
  // مولّد
  const gen=put(2,'generator',{sw:.62,sh:.46,r:.32,generator:1});HOUSES[2].gen=gen;
  // نخيل وشجيرات وأشجار ميتة وآبار
  const free=(x,y)=>x>1&&y>1&&x<N-2&&y<N-2&&map[y*N+x]===0&&!HOUSES.some(h=>inRect(h,x,y,1))&&Math.hypot(x-CAR_POS.x,y-CAR_POS.y)>3.2&&Math.hypot(x-START_POS.x,y-START_POS.y)>2.2;
  const groves=[[13,16],[30,16],[5,40],[27,30],[43,27],[14,28],[44,5],[20,43],[40,18],[3,13],[34,41],[46,20]];
  let pc=0;groves.forEach(g=>{for(let i=0;i<7;i++){const x=Math.round(g[0]+(r()-.5)*8),y=Math.round(g[1]+(r()-.5)*8);
    if(free(x,y)&&!(roadCell(x,y)&&r()<.85)){addObj('palm',x+.5,y+.5,{art:ART.palm[(r()*3)|0],sw:1.1,sh:2.25,r:.18});pc++}}});
  for(let i=0;i<30;i++){const x=2+((r()*(N-4))|0),y=2+((r()*(N-4))|0);if(free(x,y)&&!roadCell(x,y))addObj('palm',x+.5,y+.5,{art:ART.palm[(r()*3)|0],sw:1.1,sh:2.25,r:.18})}
  for(let i=0;i<45;i++){const x=2+r()*(N-4),y=2+r()*(N-4);if(free(x|0,y|0)&&!HOUSES.some(h=>inRect(h,x|0,y|0,2)))addObj('bush',x,y,{sw:.55,sh:.34,r:0})}
  for(let i=0;i<10;i++){const x=2+((r()*(N-4))|0),y=2+((r()*(N-4))|0);if(free(x,y)&&!roadCell(x,y)&&!HOUSES.some(h=>inRect(h,x,y,2)))addObj('deadtree',x+.5,y+.5,{sw:.9,sh:1.35,r:.12})}
  [[20,14],[30,31],[12,30],[40,18]].forEach(w=>{if(!cellS(w[0],w[1])&&!HOUSES.some(h=>inRect(h,w[0],w[1],1))){addObj('well',w[0]+.5,w[1]+.5,{sw:.56,sh:.5,r:.5})}});
  // سيارة التكسي المعطّلة
  const wr=addObj('wreck',CAR_POS.x,CAR_POS.y,{sw:1.5,sh:.76,r:.5,car:1});obstG[(CAR_POS.y|0)*N+(CAR_POS.x|0)]=obstG[(CAR_POS.y|0)*N+(CAR_POS.x|0)]||[];
  addObj('barrel',CAR_POS.x+.8,CAR_POS.y+.35,{sw:.24,sh:.3,r:.15});
  lights.push({x:CAR_POS.x+.6,y:CAR_POS.y,col:[1,.9,.6],rad:5.5,int:.55,fl:1,on:1,kind:'car'});
  // أعمدة إنارة تعمل بعد تشغيل المولّد
  [[5,6],[12,2],[17.2,10],[17.2,20],[17.2,30],[24,31.8],[34,31.8],[44,31.8]].forEach(p=>{
    const lp=addObj('lamppost',p[0],p[1],{sw:.25,sh:1.0,r:.08,lamp:1,on:0,glow:1});lights.push({x:p[0],y:p[1],col:[1,.9,.62],rad:7.5,int:1.2,fl:0,on:0,kind:'lamp',obj:lp})});
  // مخزون إضافي في الخلاء
  [[22,14],[10,27],[30,30],[28,33],[44,14],[7,36]].forEach((p,i)=>{if(free(p[0],p[1])){addObj('item',p[0]+.5,p[1]+.5,{art:ART[i%3===0?'ammo':i%3===1?'cell':'band'],id:i%3===0?'ammo':i%3===1?'cell':'band',sw:.2,sh:.2,lift:.01,pick:1,glow:1})}});
  bakeLights();
}

/* ---------- خريطة الإضاءة المخبوزة (مع ظلال: الجدران تحجب الضوء) ---------- */
function bakeLights(){
  LR=[2,3,4][S.shadow|0];LM=N*LR;const sz=LM*LM;
  const mk=()=>[new Float32Array(sz),new Float32Array(sz),new Float32Array(sz)];
  lmS=mk();lmF=mk();lmR=new Float32Array(sz);lmG=new Float32Array(sz);lmB=new Float32Array(sz);
  const shadows=S.shadow>0;
  for(const L of lights){
    if(!L.on)continue;const tgt=L.fl?lmF:lmS;
    const x0=Math.max(0,Math.floor((L.x-L.rad)*LR)),x1=Math.min(LM-1,Math.ceil((L.x+L.rad)*LR));
    const y0=Math.max(0,Math.floor((L.y-L.rad)*LR)),y1=Math.min(LM-1,Math.ceil((L.y+L.rad)*LR));
    for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++){
      const wx=(tx+.5)/LR,wy=(ty+.5)/LR,d=Math.hypot(wx-L.x,wy-L.y);if(d>=L.rad)continue;
      if(map[(wy|0)*N+(wx|0)]>0)continue;
      if(shadows&&d>.6&&!los(L.x,L.y,wx,wy))continue;
      const f=1-d/L.rad,a=L.int*f*f*(1+.35*(1-d/L.rad)),i=ty*LM+tx;
      tgt[0][i]+=a*L.col[0];tgt[1][i]+=a*L.col[1];tgt[2][i]+=a*L.col[2];
    }
  }
  // انتشار بسيط ليقترب من الإضاءة غير المباشرة (يضيء الجدران بجوار الضوء)
  for(const tg of [lmS,lmF])for(let c=0;c<3;c++){const s=tg[c],o=new Float32Array(s);
    for(let y=1;y<LM-1;y++)for(let x=1;x<LM-1;x++){const i=y*LM+x;if(o[i]===0){const m=Math.max(o[i-1],o[i+1],o[i-LM],o[i+LM]);if(m>0)s[i]=m*.45}}}
  compositeLM(1);
}
function compositeLM(f){const n=lmR.length,s0=lmS[0],s1=lmS[1],s2=lmS[2],f0=lmF[0],f1=lmF[1],f2=lmF[2];
  for(let i=0;i<n;i++){lmR[i]=s0[i]+f0[i]*f;lmG[i]=s1[i]+f1[i]*f;lmB[i]=s2[i]+f2[i]*f}}

/* ---------- حركة وتصادم وخط رؤية وملاحة ---------- */
function free(x,y,rd){
  rd=rd||.22;
  if(cellS(Math.floor(x-rd),Math.floor(y-rd))||cellS(Math.floor(x+rd),Math.floor(y-rd))||cellS(Math.floor(x-rd),Math.floor(y+rd))||cellS(Math.floor(x+rd),Math.floor(y+rd)))return false;
  const cl=obstG[(y|0)*N+(x|0)];
  if(cl)for(let i=0;i<cl.length;i++){const o=cl[i];if(!o.gone&&Math.hypot(x-o.x,y-o.y)<o.r+rd*.6)return false}
  return true;
}
function los(x0,y0,x1,y1){
  const d=Math.hypot(x1-x0,y1-y0),n=Math.ceil(d/.2);
  for(let i=1;i<n;i++){const t=i/n;if(cellS(Math.floor(x0+(x1-x0)*t),Math.floor(y0+(y1-y0)*t)))return false}
  return true;
}
function bfs(tx,ty){
  const f=new Int16Array(N*N).fill(-1),q=new Int32Array(N*N);let h=0,t=0;tx|=0;ty|=0;
  if(cellS(tx,ty))return f;f[ty*N+tx]=0;q[t++]=ty*N+tx;
  while(h<t){const c=q[h++],cx=c%N,cy=(c/N)|0,d=f[c];
    for(let k=0;k<4;k++){const nx=cx+(k===0?1:k===1?-1:0),ny=cy+(k===2?1:k===3?-1:0);
      if(nx<0||ny<0||nx>=N||ny>=N)continue;const ni=ny*N+nx;if(f[ni]<0&&map[ni]===0&&!navB[ni]){f[ni]=d+1;q[t++]=ni}}}
  return f;
}
function openSpot(rr,minFrom,minD){
  for(let t=0;t<600;t++){const x=2+((rr()*(N-4))|0),y=2+((rr()*(N-4))|0);
    if(map[y*N+x]===0&&!navB[y*N+x]&&(!minFrom||Math.hypot(x-minFrom[0],y-minFrom[1])>minD))return[x+.5,y+.5]}
  return[6.5,6.5];
}
