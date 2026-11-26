// @ts-nocheck
// Codice dell'interfaccia portato dal mockup: da tipizzare man mano.
import { encodeDoc, decodeDoc, docToJson, parseDocJson } from './io/data';
// PDF e immagini si caricano solo quando servono (jsPDF e pdf-lib sono pesanti)
const exportPdf=async(...a)=>(await import('./io/export')).exportPdf(...a);
const svgToPngBlob=async(...a)=>(await import('./io/export')).svgToPngBlob(...a);
const readPdfData=async(...a)=>(await import('./io/pdfdata')).readPdfData(...a);
function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
const STORE_KEY='erstudio';
// L'app parte solo dal sito ufficiale: una copia salvata o pubblicata altrove si ferma qui.
// In sviluppo (npm run dev) e nella build per i test (npm run build:test) il controllo è spento.
const SITI=['lorenzodainelli.github.io'];
if(!import.meta.env.DEV&&!import.meta.env.VITE_ER_TEST&&!SITI.includes(location.hostname)){
  document.body.innerHTML='<p style="font:16px system-ui,sans-serif;padding:40px;max-width:560px;line-height:1.5">ER Studio si usa solo dal sito ufficiale:<br><a href="https://lorenzodainelli.github.io/Diagramma-ER/">lorenzodainelli.github.io/Diagramma-ER</a></p>';
  throw new Error('ER Studio: sito non autorizzato');
}
/* ================= costanti e stato ================= */
const $=s=>document.querySelector(s);
const PAGE={w:1123,h:794}, MM=PAGE.w/297, MARGIN=Math.round(10*MM), GRID=10;
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const cv=$('#cv'), stage=$('#stage');
const mctx=document.createElement('canvas').getContext('2d');
function tw(s,size,weight){mctx.font=`${weight||400} ${size}px Helvetica, Arial, sans-serif`;return mctx.measureText(String(s)).width;}
let seq=1; const uid=p=>p+'_'+(seq++).toString(36)+Math.random().toString(36).slice(2,6);

const DEF_SETTINGS={
  caseName:'upper', multPos:'entita', lineStyle:'dritte', colors:'bn', triangle:true, ternary:true,
  showPage:true, autoFit:true, header:false,
  headerFields:[{l:'Nome',v:''},{l:'Classe',v:''},{l:'Data',v:new Date().toLocaleDateString('it-IT')}],
  lang:'it', advanced:false, attrMode:'entrambi', assocMode:'trascina', camel:true,
  keys:{ent:'e',rel:'a',isa:'g',simple:'t',key:'k',comp:'c',multi:'m',note:'n'},
  combos:{undo:'Ctrl+Z',redo:'Ctrl+Y',cut:'Ctrl+X',copy:'Ctrl+C',paste:'Ctrl+V',dup:'Ctrl+D',del:'Canc',ren:'Invio',esc:'Esc'},
  warnOverlay:false
};
let S=JSON.parse(JSON.stringify(DEF_SETTINGS));
let doc=null;
const M=()=>doc.sheets[doc.cur].m;
const SH=()=>doc.sheets[doc.cur];
let V={x:0,y:0,k:1};
let sel=new Set();
let drag=null, guides=[], temp='', mode=null, linkQueue=[], lastTap={id:null,t:0};
const pointers=new Map();
let hist=[], fut=[];

function emptyModel(){return{ents:[],rels:[],links:[],attrs:[],isas:[],notes:[],k:1,tx:0,ty:0};}
function sampleModel(){
  const m=emptyModel();
  const E=(id,name,x,y)=>{m.ents.push({id,name,x,y});};
  const R=(id,name,x,y,dir='')=>{m.rels.push({id,name,x,y,dir});};
  const L=(ent,rel,card,part)=>m.links.push({id:uid('l'),ent,rel,card,part});
  const A=(owner,kind,name,dx,dy,subs)=>m.attrs.push({id:uid('a'),owner,kind,name,dx,dy,lx:null,ly:null,subs:subs||[]});
  E('e_ag','Agenzia',200,210); E('e_tr','Transazione',690,210); E('e_im','Immobile',690,520);
  E('e_ab','Abitazione',560,672); E('e_uf','Ufficio',830,672);
  R('r_ef','effettua',445,210,'r'); R('r_ri','riguarda',690,365,'d');
  L('e_ag','r_ef','1','fac'); L('e_tr','r_ef','N','obb');
  L('e_tr','r_ri','N','obb'); L('e_im','r_ri','1','fac');
  A('e_ag','key','CodAgenzia',0,-62); A('e_ag','simple','Nome',-112,-6);
  A('e_ag','comp','Indirizzo',-62,64,['Via','Città','CAP']); A('e_ag','multi','Telefoni',70,64);
  A('e_tr','key','CodTransazione',0,-62); A('e_tr','simple','Data',122,-14); A('e_tr','simple','Importo',122,22);
  A('e_im','key','CodImmobile',-125,0); A('e_im','simple','Superficie',125,0);
  A('e_ab','simple','NumVani',-112,0); A('e_uf','simple','NumPostazioni',112,0);
  m.isas.push({id:'i_im',parent:'e_im',children:['e_ab','e_uf'],cov:'p,e'});
  m.notes.push({id:'n_1',text:'Tratteggiata: un\'agenzia appena aperta\npuò non avere transazioni',x:445,y:300});
  return m;
}
function newDoc(sample){
  return{title:sample?'Agenzie immobiliari':'Nuovo diagramma',cur:0,
    sheets:[{id:uid('s'),name:sample?'Esempio':'Foglio 1',title:sample?'Schema ER – Agenzie immobiliari':'',m:sample?sampleModel():emptyModel()}]};
}

/* ================= salvataggio locale ================= */
let saveTimer=null;
function save(){
  const st=$('#status');st.classList.add('busy');$('#statusTxt').textContent='Salvataggio…';
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{
    try{localStorage.setItem(STORE_KEY,JSON.stringify({doc,S}));}catch(e){}
    st.classList.remove('busy');$('#statusTxt').textContent='Salvato sul dispositivo · Drive da collegare';
  },2000);
}
function load(){
  try{const d=JSON.parse(localStorage.getItem(STORE_KEY)||'null');
    if(d&&d.doc&&d.doc.sheets){doc=d.doc;S=Object.assign(JSON.parse(JSON.stringify(DEF_SETTINGS)),d.S||{});S.keys=Object.assign({},DEF_SETTINGS.keys,(d.S||{}).keys||{});S.combos=Object.assign({},DEF_SETTINGS.combos,(d.S||{}).combos||{});return;}}catch(e){}
  doc=newDoc(true);
}

/* ================= modello: accesso ================= */
const COLL={e:'ents',r:'rels',l:'links',a:'attrs',i:'isas',n:'notes'};
function get(id,m){m=m||M();if(!id)return null;const c=m[COLL[id[0]]];return c?c.find(o=>o.id===id)||null:null;}
const kind=id=>id?id[0]:'';
function dispEnt(n){n=String(n||'');if(S.caseName==='upper')return n.toLocaleUpperCase('it-IT');return n.charAt(0).toLocaleUpperCase('it-IT')+n.slice(1);}
const STOP=new Set(['di','del','della','dei','degli','delle','da','a','al','e','il','lo','la','i','gli','le','per','in','con','su','un','una']);
function camel(s){
  const plain=String(s).normalize('NFD').replace(/[̀-ͯ]/g,'');
  let w=plain.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if(w.length>1)w=w.filter((x,i)=>i===0||!STOP.has(x.toLowerCase()));
  const out=w.map(x=>x.charAt(0).toUpperCase()+x.slice(1)).join('');
  return out||String(s);
}

/* ================= geometria ================= */
function eSize(e){const nat=Math.max(96,tw(dispEnt(e.name),15,700)+30);return{w:e.w||nat,h:e.h||46};}
function eFont(e){const w=eSize(e).w,need=tw(dispEnt(e.name),15,700)+14;return need>w?Math.max(7,15*w/need):15;}
function rSize(r){const nat=Math.max(108,tw(r.name,13,600)+62+(S.triangle&&r.dir?18:0));return{w:r.w||nat,h:r.h||58};}
function rFont(r){const w=rSize(r).w,need=tw(r.name,13,600)+44+(S.triangle&&r.dir?18:0);return need>w?Math.max(7,13*w/need):13;}
const inRect=(x,y,o,s)=>Math.abs(x-o.x)<=s.w/2&&Math.abs(y-o.y)<=s.h/2;
const inRh=(x,y,o,s)=>Math.abs(x-o.x)/(s.w/2)+Math.abs(y-o.y)/(s.h/2)<=1;
function exitPt(ox,oy,ux,uy,inside){if(!inside(ox,oy))return[ox,oy];let lo=0,hi=3000;for(let i=0;i<32;i++){const t=(lo+hi)/2;inside(ox+ux*t,oy+uy*t)?lo=t:hi=t;}return[ox+ux*lo,oy+uy*lo];}
function bRect(o,s,tx,ty){const dx=tx-o.x,dy=ty-o.y;if(!dx&&!dy)return[o.x,o.y];const t=Math.min(dx?s.w/2/Math.abs(dx):1e9,dy?s.h/2/Math.abs(dy):1e9);return[o.x+dx*t,o.y+dy*t];}

function linkGeo(l,m){
  m=m||M();const e=get(l.ent,m),r=get(l.rel,m);if(!e||!r)return null;
  const es=eSize(e),rs=rSize(r);
  const same=m.links.filter(x=>x.ent===l.ent&&x.rel===l.rel);const i=same.indexOf(l),n=same.length;
  let dx=r.x-e.x,dy=r.y-e.y;const len=Math.hypot(dx,dy)||1;const ux=dx/len,uy=dy/len,px=-uy,py=ux;
  const off=n>1?(i-(n-1)/2)*24:0;
  let pts,d;
  if(S.lineStyle==='dritte'){
    const a=exitPt(e.x+px*off,e.y+py*off,ux,uy,(x,y)=>inRect(x,y,e,es));
    const b=exitPt(r.x+px*off,r.y+py*off,-ux,-uy,(x,y)=>inRh(x,y,r,rs));
    pts=[a,b];d=`M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  }else{
    let a,b;
    if(Math.abs(dx)>=Math.abs(dy)){
      const sx=Math.sign(dx)||1, k=Math.min(.8,Math.abs(off)/(rs.h/2));
      a=[e.x+sx*es.w/2,e.y+off]; b=[r.x-sx*(rs.w/2)*(1-k),r.y+off];
      const mx=(a[0]+b[0])/2; pts=[a,[mx,a[1]],[mx,b[1]],b];
      d=S.lineStyle==='rette'?`M${a}L${mx} ${a[1]}L${mx} ${b[1]}L${b}`:`M${a}C${mx} ${a[1]} ${mx} ${b[1]} ${b}`;
    }else{
      const sy=Math.sign(dy)||1, k=Math.min(.8,Math.abs(off)/(rs.w/2));
      a=[e.x+off,e.y+sy*es.h/2]; b=[r.x+off,r.y-sy*(rs.h/2)*(1-k)];
      const my=(a[1]+b[1])/2; pts=[a,[a[0],my],[b[0],my],b];
      d=S.lineStyle==='rette'?`M${a}L${a[0]} ${my}L${b[0]} ${my}L${b}`:`M${a}C${a[0]} ${my} ${b[0]} ${my} ${b}`;
    }
  }
  return{pts,d,e,r};
}
function perpUp(ux,uy){let px=-uy,py=ux;if(py>0.01||(Math.abs(py)<=0.01&&px>0)){px=-px;py=-py;}return[px,py];}
function multPos(g){
  const pts=g.pts;
  if(S.multPos==='entita'){
    const a=pts[0],b=pts[1];const L=Math.hypot(b[0]-a[0],b[1]-a[1])||1;const ux=(b[0]-a[0])/L,uy=(b[1]-a[1])/L;
    const t=Math.min(22,L*.45);const[px,py]=perpUp(ux,uy);return[a[0]+ux*t+px*11,a[1]+uy*t+py*11];
  }
  let tot=0;const seg=[];for(let i=0;i<pts.length-1;i++){const L=Math.hypot(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]);seg.push(L);tot+=L;}
  let h=tot/2;for(let i=0;i<seg.length;i++){if(h<=seg[i]||i===seg.length-1){const a=pts[i],b=pts[i+1],L=seg[i]||1;const ux=(b[0]-a[0])/L,uy=(b[1]-a[1])/L;const[px,py]=perpUp(ux,uy);return[a[0]+ux*h+px*11,a[1]+uy*h+py*11];}h-=seg[i];}
  return pts[0];
}
function attrGeo(a,m){
  const e=get(a.owner,m);if(!e)return null;const es=eSize(e);
  const P=[e.x+a.dx,e.y+a.dy];const s=bRect(e,es,P[0],P[1]);
  const L=Math.hypot(P[0]-s[0],P[1]-s[1])||1;const ux=(P[0]-s[0])/L,uy=(P[1]-s[1])/L;
  const end=[P[0]-ux*5.5,P[1]-uy*5.5];
  let lx,ly,anchor;
  if(a.lx!=null){lx=a.lx;ly=a.ly;anchor=lx>8?'start':lx<-8?'end':'middle';}
  else{const dx=a.dx,dy=a.dy;
    if(Math.abs(dx)/(es.w/2+20)>=Math.abs(dy)/(es.h/2+20)){lx=dx>=0?10:-10;ly=4;anchor=dx>=0?'start':'end';}
    else{lx=0;ly=dy<0?-11:19;anchor='middle';}}
  return{e,P,s,end,ux,uy,lx,ly,anchor};
}
function isaGeo(i,m){
  const p=get(i.parent,m);const cs=i.children.map(c=>get(c,m)).filter(Boolean);if(!p||!cs.length)return null;
  const ps=eSize(p);const avg=cs.reduce((s,c)=>s+c.y,0)/cs.length;const down=avg>=p.y;
  const pEdge=down?p.y+ps.h/2:p.y-ps.h/2;
  const cEdge=cs.map(c=>{const s=eSize(c);return down?c.y-s.h/2:c.y+s.h/2;});
  const near=down?Math.min(...cEdge):Math.max(...cEdge);const by=(pEdge+near)/2;
  const xs=cs.map(c=>c.x).concat([p.x]);
  return{p,cs,down,pEdge,cEdge,by,x1:Math.min(...xs),x2:Math.max(...xs)};
}
function noteGeo(n,m){
  if(!n.anchor)return{x:n.x,y:n.y,ax:null};
  const o=get(n.anchor,m);if(!o){return{x:n.x||0,y:n.y||0,ax:null};}
  let cx,cy;
  if(kind(o.id)==='a'){const g=attrGeo(o,m);if(!g)return{x:0,y:0,ax:null};cx=g.P[0];cy=g.P[1];}
  else if(kind(o.id)==='l'){const g=linkGeo(o,m);if(!g)return{x:0,y:0,ax:null};const mp=multPos(g);cx=mp[0];cy=mp[1];}
  else{cx=o.x;cy=o.y;}
  return{x:cx+n.dx,y:cy+n.dy,ax:cx,ay:cy};
}

/* ================= avvisi ================= */
function warnOverlaySvg(m){const by={};const placed=[];warnings(m).forEach(w=>(by[w.id]=by[w.id]||[]).push(w.t));let h='';
  Object.entries(by).forEach(([id,ts])=>{const o=get(id,m);if(!o)return;const k=kind(id);let x,y;
    if(k==='e'){const s=eSize(o);x=o.x;y=o.y-s.h/2;const top=m.attrs.filter(a=>a.owner===id&&a.dy<-s.h/2);if(top.length)y=Math.min(y,o.y+Math.min(...top.map(a=>a.dy))-16);}
    else if(k==='r'){const s=rSize(o);x=o.x;y=o.y-s.h/2;}
    else if(k==='l'){const g=linkGeo(o,m);if(!g)return;const mp=multPos(g);x=mp[0];y=mp[1]-10;}else return;
    y-=10;const W=Math.max(...ts.map(t=>tw(t,11,400)+16)),H=ts.length*22;let lift=0;
    const hit=l=>placed.some(b=>x-W/2<b.x2&&x+W/2>b.x1&&y-l-H<b.y2&&y-l>b.y1);while(hit(lift)&&lift<400)lift+=12;placed.push({x1:x-W/2-4,x2:x+W/2+4,y1:y-lift-H-2,y2:y-lift+2});
    if(lift)h+=`<path d="M${x} ${y} V${y-lift}" stroke="#c2410c" stroke-width="1" stroke-dasharray="2 2"/>`;
    ts.slice().reverse().forEach((t,i)=>{const w=tw(t,11,400)+16,yy=y-lift-i*22;
      h+=`<g><rect x="${(x-w/2).toFixed(1)}" y="${(yy-18).toFixed(1)}" width="${w.toFixed(1)}" height="18" rx="4" fill="#fff4ed" stroke="#c2410c" stroke-width="1"/>`+
        (i===0?`<path d="M${x-5} ${yy} L${x} ${yy+6} L${x+5} ${yy}" fill="#fff4ed" stroke="#c2410c" stroke-width="1"/><path d="M${x-4.5} ${yy-.6}h9" stroke="#fff4ed" stroke-width="1.6"/>`:'')+
        `<text x="${x.toFixed(1)}" y="${(yy-5).toFixed(1)}" text-anchor="middle" font-size="11" fill="#9a3412">${esc(t)}</text></g>`;});});
  return h;}
function warnings(m){
  m=m||M();const out=[];
  const children=new Set(m.isas.flatMap(i=>i.children));
  m.ents.forEach(e=>{if(!children.has(e.id)&&!m.attrs.some(a=>a.owner===e.id&&a.kind==='key'))out.push({id:e.id,t:`${dispEnt(e.name)} non ha una chiave (pallino pieno).`});});
  m.links.forEach(l=>{const e=get(l.ent,m),r=get(l.rel,m);if(e&&r&&!l.card)out.push({id:l.id,t:`Manca la molteplicità tra ${dispEnt(e.name)} e «${r.name}».`});});
  const dup=(arr,f,label)=>{const seen={};arr.forEach(o=>{const k=f(o).trim().toLowerCase();if(!k)return;(seen[k]=seen[k]||[]).push(o);});
    Object.values(seen).forEach(g=>{if(g.length>1)out.push({id:g[1].id,t:`${label} con lo stesso nome: «${f(g[0])}» (${g.length} volte).`});});};
  dup(m.ents,e=>dispEnt(e.name),'Due entità');dup(m.rels,r=>r.name,'Due associazioni');
  m.rels.forEach(r=>{const n=m.links.filter(l=>l.rel===r.id).length;
    if(n<2)out.push({id:r.id,t:`L'associazione «${r.name}» deve collegare due entità (ora ${n===0?'nessuna':'una sola'}).`});
    if(n>2&&!S.ternary)out.push({id:r.id,t:`«${r.name}» collega ${n} entità ma le ternarie sono spente nelle Impostazioni.`});});
  return out;
}

/* ================= disegno ================= */
function palette(){return S.colors==='soft'
  ?{st:'#24407a',ef:'#e9f0ff',rf:'#f1ecff',rs:'#4b3591',tx:'#14233f',at:'#24407a'}
  :{st:'#111111',ef:'#ffffff',rf:'#ffffff',rs:'#111111',tx:'#111111',at:'#111111'};}
function hopPath(a,b,cross){
  const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(!cross.length||L<20)return`M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  const ux=(b[0]-a[0])/L,uy=(b[1]-a[1])/L,r=5;let d=`M${a[0].toFixed(1)} ${a[1].toFixed(1)}`;
  cross.sort((x,y)=>x-y).forEach(t=>{const c=[a[0]+ux*t*L,a[1]+uy*t*L];
    d+=`L${(c[0]-ux*r).toFixed(1)} ${(c[1]-uy*r).toFixed(1)}A${r} ${r} 0 0 ${ux>=0?1:0} ${(c[0]+ux*r).toFixed(1)} ${(c[1]+uy*r).toFixed(1)}`;});
  return d+`L${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
}
function segX(a,b,c,d){const r=[b[0]-a[0],b[1]-a[1]],s=[d[0]-c[0],d[1]-c[1]];const den=r[0]*s[1]-r[1]*s[0];if(Math.abs(den)<1e-9)return null;
  const t=((c[0]-a[0])*s[1]-(c[1]-a[1])*s[0])/den,u=((c[0]-a[0])*r[1]-(c[1]-a[1])*r[0])/den;return(t>0.06&&t<0.94&&u>0.02&&u<0.98)?t:null;}

function contentSvg(m,exp){
  const C=palette();const warn=exp?[]:warnings(m);const wIds=new Set(warn.map(w=>w.id));
  let L='',I='',A='',E='',R='',N='',X='',W='';
  const segs=[];
  // collegamenti
  m.links.forEach(l=>{const g=linkGeo(l,m);if(!g)return;
    let d=g.d;
    if(S.lineStyle==='dritte'){const cr=[];segs.forEach(s=>{const t=segX(g.pts[0],g.pts[1],s[0],s[1]);if(t!=null)cr.push(t);});d=hopPath(g.pts[0],g.pts[1],cr);segs.push(g.pts);}
    const dash=l.part==='fac'?' stroke-dasharray="7 5"':'';
    const on=sel.has(l.id);
    L+=`<g data-id="${l.id}"><path d="${g.d}" fill="none" stroke="transparent" stroke-width="16"/>`+
      (on&&!exp?`<path d="${d}" fill="none" stroke="#2160e0" stroke-width="5" opacity=".25"/>`:'')+
      `<path d="${d}" fill="none" stroke="${C.st}" stroke-width="1.5"${dash}/>`;
    const mp=multPos(g);
    if(l.card)L+=`<text x="${mp[0].toFixed(1)}" y="${(mp[1]+5).toFixed(1)}" text-anchor="middle" font-size="14" font-weight="700" fill="${C.tx}">${l.card}</text>`;
    else if(!exp)L+=`<circle cx="${mp[0].toFixed(1)}" cy="${mp[1].toFixed(1)}" r="8" fill="#fde8de" stroke="#c2410c"/><text x="${mp[0].toFixed(1)}" y="${(mp[1]+4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#c2410c">?</text>`;
    L+='</g>';});
  // generalizzazioni
  m.isas.forEach(i=>{const g=isaGeo(i,m);if(!g)return;const s=g.down?1:-1;const on=sel.has(i.id);const st=on&&!exp?'#2160e0':C.st;
    let h=`<g data-id="${i.id}"><path d="M${g.p.x} ${g.by}V${g.pEdge}M${g.x1} ${g.by}H${g.x2}" fill="none" stroke="transparent" stroke-width="14"/>`;
    h+=`<path d="M${g.p.x} ${g.by}V${g.pEdge+s*12}M${g.x1} ${g.by}H${g.x2}" fill="none" stroke="${st}" stroke-width="1.5"/>`;
    g.cs.forEach((c,k)=>{h+=`<path d="M${c.x} ${g.by}V${g.cEdge[k]}" stroke="${st}" stroke-width="1.5"/>`;segs.push([[c.x,g.by],[c.x,g.cEdge[k]]]);});
    segs.push([[g.x1,g.by],[g.x2,g.by]]);segs.push([[g.p.x,g.by],[g.p.x,g.pEdge]]);
    h+=`<path d="M${g.p.x} ${g.pEdge}l-6.5 ${s*12}h13z" fill="${st}"/>`;
    h+=`<text x="${g.p.x+9}" y="${((g.pEdge+g.by)/2+5).toFixed(1)}" font-size="13" fill="${C.tx}">(${esc(i.cov)})</text></g>`;
    I+=h;});
  // attributi
  m.attrs.forEach(a=>{const g=attrGeo(a,m);if(!g)return;const on=sel.has(a.id)&&!exp;const col=on?'#2160e0':C.at;
    let h=`<g data-id="${a.id}"><line x1="${g.s[0].toFixed(1)}" y1="${g.s[1].toFixed(1)}" x2="${g.end[0].toFixed(1)}" y2="${g.end[1].toFixed(1)}" stroke="${col}" stroke-width="1.3"/>`;
    const[x,y]=g.P;
    if(a.kind==='comp')h+=`<rect x="${x-5}" y="${y-5}" width="10" height="10" fill="#fff" stroke="${col}" stroke-width="1.5"/>`;
    else h+=`<circle cx="${x}" cy="${y}" r="5" fill="${a.kind==='key'?col:'#fff'}" stroke="${col}" stroke-width="1.5"/>`;
    if(a.kind==='multi'){const[px,py]=[-g.uy,g.ux];[13,19].forEach(o=>{const c=[x-g.ux*o,y-g.uy*o];
      h+=`<polyline points="${(c[0]-g.ux*3+px*4).toFixed(1)},${(c[1]-g.uy*3+py*4).toFixed(1)} ${(c[0]+g.ux*3).toFixed(1)},${(c[1]+g.uy*3).toFixed(1)} ${(c[0]-g.ux*3-px*4).toFixed(1)},${(c[1]-g.uy*3-py*4).toFixed(1)}" fill="none" stroke="${col}" stroke-width="1.4"/>`;});}
    h+=`<circle cx="${x}" cy="${y}" r="11" fill="transparent"/>`;
    const tx=x+g.lx,ty=y+g.ly;
    h+=`<g data-part="label"><text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${g.anchor}" font-size="12.5" fill="${col}"${on?' font-weight="700"':''}>${esc(a.name)}</text>`;
    if(a.kind==='comp')(a.subs||[]).forEach((s,k)=>{h+=`<text x="${tx.toFixed(1)}" y="${(ty+15*(k+1)).toFixed(1)}" text-anchor="${g.anchor}" font-size="11.5" fill="${col}">• ${esc(s)}</text>`;});
    const tw0=tw(a.name,12.5)+6,bx=g.anchor==='start'?tx-3:g.anchor==='end'?tx-tw0+3:tx-tw0/2;
    h+=`<rect x="${bx.toFixed(1)}" y="${(ty-13).toFixed(1)}" width="${tw0.toFixed(1)}" height="${(17+(a.kind==='comp'?15*(a.subs||[]).length:0))}" fill="transparent"/></g></g>`;
    A+=h;});
  // entità
  const pick=mode&&mode.isa;
  m.ents.forEach(e=>{const s=eSize(e);const on=sel.has(e.id)&&!exp;
    let ring='';
    if(pick&&mode.isa.parent===e.id)ring='#17803d';else if(pick&&mode.isa.children.includes(e.id))ring='#2160e0';
    let h=`<g data-id="${e.id}">`;
    if(ring)h+=`<rect x="${e.x-s.w/2-6}" y="${e.y-s.h/2-6}" width="${s.w+12}" height="${s.h+12}" fill="none" stroke="${ring}" stroke-width="2.5" rx="4"/>`;
    h+=`<rect x="${e.x-s.w/2}" y="${e.y-s.h/2}" width="${s.w}" height="${s.h}" fill="${C.ef}" stroke="${on?'#2160e0':C.st}" stroke-width="${on?2.2:1.6}"/>`;
    h+=`<text x="${e.x}" y="${e.y+eFont(e)*0.35}" text-anchor="middle" font-size="${eFont(e).toFixed(1)}" font-weight="700" fill="${C.tx}">${esc(dispEnt(e.name))}</text>`;
    if(wIds.has(e.id))h+=`<g><circle cx="${e.x+s.w/2}" cy="${e.y-s.h/2}" r="8" fill="#c2410c"/><text x="${e.x+s.w/2}" y="${e.y-s.h/2+4}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">!</text></g>`;
    h+='</g>';E+=h;});
  // associazioni
  m.rels.forEach(r=>{const s=rSize(r);const on=sel.has(r.id)&&!exp;const w=s.w/2,hh=s.h/2;
    let h=`<g data-id="${r.id}"><path d="M${r.x-w} ${r.y}L${r.x} ${r.y-hh}L${r.x+w} ${r.y}L${r.x} ${r.y+hh}Z" fill="${C.rf}" stroke="${on?'#2160e0':C.rs}" stroke-width="${on?2.2:1.6}"/>`;
    let tx=r.x,ty=r.y+rFont(r)*0.35;
    if(S.triangle&&r.dir){const sz=5.5;let P;
      if(r.dir==='r'){const cx=r.x+w-24;P=[[cx+sz,r.y],[cx-sz*.8,r.y-sz],[cx-sz*.8,r.y+sz]];tx-=7;}
      if(r.dir==='l'){const cx=r.x-w+24;P=[[cx-sz,r.y],[cx+sz*.8,r.y-sz],[cx+sz*.8,r.y+sz]];tx+=7;}
      if(r.dir==='d'){const cy=r.y+hh-13;P=[[r.x,cy+sz],[r.x-sz,cy-sz*.8],[r.x+sz,cy-sz*.8]];ty-=4;}
      if(r.dir==='u'){const cy=r.y-hh+13;P=[[r.x,cy-sz],[r.x-sz,cy+sz*.8],[r.x+sz,cy+sz*.8]];ty+=5;}
      h+=`<path d="M${P.map(p=>p.map(v=>v.toFixed(1)).join(' ')).join('L')}Z" fill="${C.rs}"/>`;}
    h+=`<text x="${tx}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${rFont(r).toFixed(1)}" font-weight="600" fill="${C.tx}">${esc(r.name)}</text>`;
    if(wIds.has(r.id))h+=`<g><circle cx="${r.x+w*.55}" cy="${r.y-hh*.55}" r="8" fill="#c2410c"/><text x="${r.x+w*.55}" y="${r.y-hh*.55+4}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">!</text></g>`;
    h+='</g>';R+=h;});
  // commenti
  m.notes.forEach(n=>{const g=noteGeo(n,m);const on=sel.has(n.id)&&!exp;const lines=String(n.text||'').split('\n');
    let h=`<g data-id="${n.id}">`;
    if(g.ax!=null)h+=`<line x1="${g.ax}" y1="${g.ay}" x2="${g.x}" y2="${g.y-4}" stroke="#777" stroke-width="1" stroke-dasharray="2 3"/>`;
    const wmax=Math.max(...lines.map(t=>tw(t,12)),20);
    h+=`<rect x="${g.x-wmax/2-6}" y="${g.y-14}" width="${wmax+12}" height="${lines.length*15+8}" fill="${on?'#eef3ff':'transparent'}" stroke="${on?'#2160e0':'transparent'}" rx="4"/>`;
    lines.forEach((t,k)=>h+=`<text x="${g.x}" y="${g.y+k*15}" text-anchor="middle" font-size="12" font-style="italic" fill="#555">${esc(t)}</text>`);
    h+='</g>';N+=h;});
  // maniglie
  if(!exp&&sel.size===1){const id=[...sel][0];const o=get(id,m);
    if(o&&(kind(id)==='e'||kind(id)==='r')){const s=kind(id)==='e'?eSize(o):rSize(o);
      X+=`<rect x="${o.x-s.w/2-4}" y="${o.y-s.h/2-4}" width="${s.w+8}" height="${s.h+8}" fill="none" stroke="#2160e0" stroke-dasharray="4 3" stroke-width="1"/>`;
      X+=`<rect data-handle="resize" data-for="${id}" x="${o.x+s.w/2-1}" y="${o.y+s.h/2-1}" width="10" height="10" fill="#fff" stroke="#2160e0" stroke-width="1.5" style="cursor:nwse-resize"/>`;
      if(S.assocMode==='trascina'){const hx=o.x+s.w/2+20,hy=o.y;
        X+=`<g data-handle="link" data-for="${id}" style="cursor:crosshair"><circle cx="${hx}" cy="${hy}" r="13" fill="transparent"/><circle cx="${hx}" cy="${hy}" r="9" fill="#2160e0"/><path d="M${hx-4} ${hy}h8M${hx} ${hy-4}v8" stroke="#fff" stroke-width="1.8"/></g>`;}}}
  return L+I+A+E+R+N+X+W;
}
function paperBox(sh){const top=MARGIN+(sh.title?34:0)+(S.header&&!sh.title?22:0);return{x:MARGIN,y:top,w:PAGE.w-2*MARGIN,h:PAGE.h-MARGIN-top};}
function pageSvg(sh,exp){
  const m=sh.m;let s='';
  if(!exp){
    if(S.showPage){s+=`<rect x="4" y="6" width="${PAGE.w}" height="${PAGE.h}" fill="#000" opacity=".08" rx="2"/><rect x="0" y="0" width="${PAGE.w}" height="${PAGE.h}" fill="#fff"/>`;
      s+=`<rect x="0" y="0" width="${PAGE.w}" height="${PAGE.h}" fill="url(#grid)"/>`;
      s+=`<rect x="${MARGIN}" y="${MARGIN}" width="${PAGE.w-2*MARGIN}" height="${PAGE.h-2*MARGIN}" fill="none" stroke="#9db4e6" stroke-dasharray="3 4" stroke-width=".8"/>`;}
    else s+=`<rect x="-4000" y="-4000" width="9000" height="9000" fill="#fff"/><rect x="-4000" y="-4000" width="9000" height="9000" fill="url(#grid)"/>`;
  }else s+=`<rect x="0" y="0" width="${PAGE.w}" height="${PAGE.h}" fill="#fff"/>`;
  if(sh.title)s+=`<text x="${PAGE.w/2}" y="${MARGIN+18}" text-anchor="middle" font-size="19" font-weight="700" fill="#111">${esc(sh.title)}</text>`;
  if(S.header){const t=S.headerFields.filter(f=>f.l||f.v).map(f=>`${f.l}: ${f.v||'________'}`).join('     ');
    s+=`<text x="${PAGE.w-MARGIN}" y="${MARGIN+(sh.title?-4:10)+ (sh.title?0:0)}" text-anchor="end" font-size="11" fill="#333">${esc(t)}</text>`;}
  s+=`<g transform="translate(${m.tx.toFixed(2)} ${m.ty.toFixed(2)}) scale(${m.k.toFixed(4)})">${contentSvg(m,exp)}${exp?'':`<g pointer-events="none">${S.warnOverlay?warnOverlaySvg(m):''}${guidesSvg()+temp}</g>`}</g>`;
  return s;
}
function guidesSvg(){return guides.map(g=>g.v?`<line x1="${g.v}" y1="-3000" x2="${g.v}" y2="3000" stroke="#e11d48" stroke-width="1" stroke-dasharray="4 3"/>`:`<line x1="-3000" y1="${g.h}" x2="3000" y2="${g.h}" stroke="#e11d48" stroke-width="1" stroke-dasharray="4 3"/>`).join('');}
const DEFS=`<defs><pattern id="grid" width="${GRID}" height="${GRID}" patternUnits="userSpaceOnUse"><circle cx="0.5" cy="0.5" r="0.6" fill="#c9d2e3"/></pattern></defs>`;
function renderCanvas(){
  cv.innerHTML=DEFS+`<g transform="translate(${V.x.toFixed(1)} ${V.y.toFixed(1)}) scale(${V.k.toFixed(4)})">${pageSvg(SH(),false)}</g>`;
  $('#zv').textContent=Math.round(V.k*100)+'%';
}
function render(){renderCanvas();renderPanel();renderTabs();renderSide();renderStatus();renderCrumbs();}

/* ================= storia ================= */
const snap=()=>JSON.stringify(M());
function pushHist(s){hist.push({sh:doc.cur,s});if(hist.length>200)hist.shift();fut=[];}
function commit(){pushHist(snap());}
function changed(){fit();save();render();}
function undo(){const h=hist.pop();if(!h)return toast('Niente da annullare');fut.push({sh:h.sh,s:JSON.stringify(doc.sheets[h.sh].m)});doc.cur=h.sh;doc.sheets[h.sh].m=JSON.parse(h.s);sel.clear();closePop();save();render();checkOverflow();}
function redo(){const h=fut.pop();if(!h)return toast('Niente da ripetere');hist.push({sh:h.sh,s:JSON.stringify(doc.sheets[h.sh].m)});doc.cur=h.sh;doc.sheets[h.sh].m=JSON.parse(h.s);sel.clear();closePop();save();render();checkOverflow();}

/* ================= adatta al foglio A4 ================= */
function bbox(m){let x1=1e9,y1=1e9,x2=-1e9,y2=-1e9;const add=(x,y)=>{x1=Math.min(x1,x);y1=Math.min(y1,y);x2=Math.max(x2,x);y2=Math.max(y2,y);};
  m.ents.forEach(e=>{const s=eSize(e);add(e.x-s.w/2,e.y-s.h/2);add(e.x+s.w/2,e.y+s.h/2);});
  m.rels.forEach(r=>{const s=rSize(r);add(r.x-s.w/2,r.y-s.h/2);add(r.x+s.w/2,r.y+s.h/2);});
  m.attrs.forEach(a=>{const g=attrGeo(a,m);if(!g)return;add(g.P[0]-6,g.P[1]-6);add(g.P[0]+6,g.P[1]+6);const w=tw(a.name,12.5);const tx=g.P[0]+g.lx,ty=g.P[1]+g.ly;
    const x0=g.anchor==='start'?tx:g.anchor==='end'?tx-w:tx-w/2;add(x0,ty-12);add(x0+w,ty+4+(a.kind==='comp'?15*(a.subs||[]).length:0));});
  m.notes.forEach(n=>{const g=noteGeo(n,m);const ls=String(n.text||'').split('\n');const w=Math.max(...ls.map(t=>tw(t,12)));add(g.x-w/2,g.y-12);add(g.x+w/2,g.y+15*ls.length-10);});
  m.isas.forEach(i=>{const g=isaGeo(i,m);if(g)add(g.p.x+40,g.by);});
  return x1>x2?null:{x1,y1,x2,y2};}
let bannerDismissed=false;
function fit(force){
  const sh=SH(),m=sh.m;const b=bbox(m);const A=paperBox(sh);
  if(!b){m.k=1;m.tx=0;m.ty=0;checkOverflow();return;}
  if(!S.autoFit&&!force){checkOverflow();return;}
  const oldK=m.k;
  // sempre al centro del foglio, in orizzontale e in verticale; rimpicciolito solo se non ci sta
  {const bw=b.x2-b.x1,bh=b.y2-b.y1;const k=Math.min(1,A.w/bw,A.h/bh);
    m.k=k;m.tx=A.x+(A.w-bw*k)/2-b.x1*k;m.ty=A.y+(A.h-bh*k)/2-b.y1*k;}
  if(m.k<oldK-0.01&&!force)toast(`Ho rimpicciolito il diagramma al ${Math.round(m.k*100)}% per farlo stare nell'A4. Puoi spegnerlo nelle Impostazioni.`);
  checkOverflow();
}
function checkOverflow(){
  const sh=SH(),m=sh.m,b=bbox(m),A=paperBox(sh),bn=$('#banner');
  if(!b||S.autoFit){bn.hidden=true;return;}
  const X=x=>x*m.k+m.tx,Y=y=>y*m.k+m.ty;
  const fits=X(b.x1)>=A.x-1&&Y(b.y1)>=A.y-1&&X(b.x2)<=A.x+A.w+1&&Y(b.y2)<=A.y+A.h+1;
  if(fits){bannerDismissed=false;bn.hidden=true;return;}
  if(bannerDismissed){bn.hidden=true;return;}
  bn.innerHTML=`<span class="grow"><b>Il diagramma esce dal foglio A4.</b> Nel PDF la parte fuori verrebbe tagliata.</span><button class="btn primary sm" data-b="fit">Rimpicciolisci per farlo stare</button><button class="btn sm" data-b="keep">Lascia così</button>`;
  bn.hidden=false;
}
$('#banner').addEventListener('click',ev=>{const b=ev.target.closest('[data-b]');if(!b)return;
  if(b.dataset.b==='fit'){commit();fit(true);save();render();}else{bannerDismissed=true;$('#banner').hidden=true;}});

/* ================= creazione elementi ================= */
const snapv=v=>Math.round(v/GRID)*GRID;
function uniqueName(base,arr,f){let n=base,i=2;const has=x=>arr.some(o=>f(o).toLowerCase()===x.toLowerCase());while(has(n))n=base+i++;return n;}
function addEnt(x,y){const m=M();const e={id:uid('e'),name:uniqueName('Entità',m.ents,o=>o.name),x:snapv(x),y:snapv(y)};m.ents.push(e);return e;}
function addRel(x,y){const m=M();const r={id:uid('r'),name:uniqueName('associa',m.rels,o=>o.name),x:snapv(x),y:snapv(y),dir:S.triangle?'r':''};m.rels.push(r);return r;}
const ANAME={simple:'Attributo',key:'Codice',comp:'Indirizzo',multi:'Telefoni'};
function addAttr(e,k,at){const m=M();const a={id:uid('a'),owner:e.id,kind:k,name:uniqueName(ANAME[k],m.attrs.filter(x=>x.owner===e.id),o=>o.name),dx:0,dy:0,lx:null,ly:null,subs:k==='comp'?['Via','Città','CAP']:[]};
  m.attrs.push(a);if(at){a.dx=Math.round(at[0]-e.x);a.dy=Math.round(at[1]-e.y);}else autoPlace(e,a);return a;}
function addNote(x,y,anchor){const m=M();const n={id:uid('n'),text:'Commento',x:snapv(x),y:snapv(y)};
  if(anchor){const o=get(anchor);n.anchor=anchor;n.dx=0;n.dy=-40;if(o&&kind(anchor)!=='l'&&kind(anchor)!=='a'){n.dx=0;n.dy=-60;}}
  m.notes.push(n);return n;}
function createAssoc(aId,bId){
  const A=get(aId),B=get(bId);commit();
  let x,y;if(aId===bId){x=A.x+eSize(A).w/2+120;y=A.y;}else{x=(A.x+B.x)/2;y=(A.y+B.y)/2;}
  const dx=(B.x-A.x)||1,dy=B.y-A.y,L=Math.hypot(dx,dy)||1;let t=0;
  while(M().rels.some(r=>Math.hypot(r.x-x,r.y-y)<70)&&t<6){x+=-dy/L*80;y+=dx/L*80;t++;}
  const r=addRel(x,y);const l1={id:uid('l'),ent:aId,rel:r.id,card:null,part:null},l2={id:uid('l'),ent:bId,rel:r.id,card:null,part:null};
  M().links.push(l1,l2);fixAttrs([aId,bId]);sel=new Set([r.id]);changed();
  startRename(r.id,()=>queueLinks([l1.id,l2.id]));
}
function connectToRel(eId,rId){
  const n=M().links.filter(l=>l.rel===rId).length;const r=get(rId);
  if(n>=2&&!S.ternary)return toast('Le associazioni ternarie sono spente: attivale nelle Impostazioni.');
  if(n>=3)return toast('Questo programma supporta al massimo associazioni ternarie.');
  commit();const l={id:uid('l'),ent:eId,rel:rId,card:null,part:null};M().links.push(l);fixAttrs(neighbours([rId]));changed();queueLinks([l.id]);
}

/* ================= popup collegamento ================= */
const pop=$('#pop');
function queueLinks(ids){linkQueue=ids.slice();nextQueued();}
function nextQueued(){const id=linkQueue[0];if(!id){closePop();return;}const l=get(id);if(!l){linkQueue.shift();return nextQueued();}
  sel=new Set([id]);render();const g=linkGeo(l);const mp=multPos(g);const sp=toScreen(mp[0],mp[1]);openLinkPop(id,sp[0],sp[1]);}
function openLinkPop(id,sx,sy){
  const l=get(id);if(!l)return;const e=get(l.ent),r=get(l.rel);const q=linkQueue.length;
  pop.innerHTML=`<div class="pop-h">Lato <b>${esc(dispEnt(e.name))}</b> di «${esc(r.name)}»${q>1?` · 1 di ${q}`:''}</div>
   <div class="pop-row"><span>Molteplicità</span><div class="seg">${['1','N','M'].map(c=>`<button data-c="${c}" class="${l.card===c?'on':''}">${c}</button>`).join('')}</div></div>
   <div class="pop-row"><span>Partecipazione</span><div class="seg"><button data-p="obb" class="${l.part==='obb'?'on':''}">Continua</button><button data-p="fac" class="${l.part==='fac'?'on':''}">Tratteggiata</button></div></div>
   <p class="pop-hint">Il numero si legge vicino a ${esc(dispEnt(e.name))}: quante ${esc(dispEnt(e.name))} per ogni elemento dall'altra parte. Continua = deve partecipare, tratteggiata = può non partecipare.</p>
   <div class="pop-foot"><button class="btn sm" data-x="del">Elimina linea</button><button class="btn sm" data-x="close">${q>1?'Salta':'Chiudi'}</button></div>`;
  pop.dataset.id=id;pop.hidden=false;
  const R=stage.getBoundingClientRect();let x=sx-R.left+14,y=sy-R.top+14;
  x=Math.max(8,Math.min(x,R.width-pop.offsetWidth-8));y=Math.max(8,Math.min(y,R.height-pop.offsetHeight-8));
  pop.style.left=x+'px';pop.style.top=y+'px';
}
function closePop(){pop.hidden=true;linkQueue=[];}
pop.addEventListener('pointerdown',ev=>ev.stopPropagation());
pop.addEventListener('click',ev=>{
  const id=pop.dataset.id;const l=get(id);if(!l)return closePop();
  const c=ev.target.closest('[data-c]'),p=ev.target.closest('[data-p]'),x=ev.target.closest('[data-x]');
  if(c){commit();setCard(l,c.dataset.c);}
  if(p){commit();l.part=p.dataset.p;}
  if(x&&x.dataset.x==='del'){commit();removeIds([id]);linkQueue.shift();changed();if(linkQueue.length)nextQueued();else closePop();return;}
  if(x&&x.dataset.x==='close'){linkQueue.shift();if(linkQueue.length){nextQueued();}else{closePop();render();}return;}
  changed();
  if(linkQueue[0]===id&&l.card&&l.part){linkQueue.shift();if(linkQueue.length){nextQueued();return;}closePop();return;}
  const g=linkGeo(l);const mp=multPos(g);const sp=toScreen(mp[0],mp[1]);openLinkPop(id,sp[0],sp[1]);
});
function setCard(l,c){
  const others=M().links.filter(o=>o.rel===l.rel&&o.id!==l.id);
  if(c==='N'&&others.length===1&&others[0].card==='N'){c='M';toast('Molti da entrambi i lati: ho messo M da questa parte (N:M). Puoi cambiarla.');}
  l.card=c;
}

/* ================= rinomina sul foglio ================= */
const ed=$('#ed');let edState=null;
function startRename(id,after){
  const o=get(id);if(!o)return;const k=kind(id);if(k==='l'||k==='i'){if(after)after();return;}
  let x,y,w,fs,val;
  if(k==='e'){const s=eSize(o);x=o.x;y=o.y;w=s.w;fs=15;val=o.name;}
  else if(k==='r'){const s=rSize(o);x=o.x;y=o.y;w=s.w*.7;fs=13;val=o.name;}
  else if(k==='a'){const g=attrGeo(o);x=g.P[0]+g.lx+(g.anchor==='start'?50:g.anchor==='end'?-50:0);y=g.P[1]+g.ly-4;w=130;fs=12.5;val=o.name;}
  else{const g=noteGeo(o);x=g.x;y=g.y;w=220;fs=12;val=String(o.text).replace(/\n/g,' / ');}
  const sp=toScreen(x,y),R=stage.getBoundingClientRect();const sc=V.k*M().k;
  ed.hidden=false;ed.value=val;ed.style.fontSize=Math.max(12,fs*sc)+'px';ed.style.width=Math.max(120,w*sc)+'px';
  ed.style.left=(sp[0]-R.left-Math.max(120,w*sc)/2)+'px';ed.style.top=(sp[1]-R.top-Math.max(12,fs*sc)*0.9)+'px';
  edState={id,after};ed.focus();ed.select();
}
function endRename(ok){
  if(!edState)return;const{id,after}=edState;edState=null;ed.hidden=true;
  const o=get(id);if(ok&&o){let v=ed.value.trim();const k=kind(id);
    if(v){commit();
      if(k==='n')o.text=v.replace(/\s*\/\s*/g,'\n');
      else{if(S.camel&&(k==='e'||k==='a'))v=camel(v);o.name=v;}
      changed();}}
  if(after)after();
}
ed.addEventListener('keydown',ev=>{if(ev.key==='Enter'){ev.preventDefault();endRename(true);}else if(ev.key==='Escape'){endRename(false);}ev.stopPropagation();});
ed.addEventListener('blur',()=>endRename(true));

/* ================= coordinate ================= */
function toWorld(cx,cy){const r=cv.getBoundingClientRect();return[(cx-r.left-V.x)/V.k,(cy-r.top-V.y)/V.k];}
function toModel(cx,cy){const[wx,wy]=toWorld(cx,cy);const m=M();return[(wx-m.tx)/m.k,(wy-m.ty)/m.k];}
function toScreen(x,y){const m=M(),r=cv.getBoundingClientRect();return[(x*m.k+m.tx)*V.k+V.x+r.left,(y*m.k+m.ty)*V.k+V.y+r.top];}
function viewCenter(){const r=cv.getBoundingClientRect();return toModel(r.left+r.width/2,r.top+r.height/2);}
function fitView(){const r=stage.getBoundingClientRect();const pad=window.innerWidth<760?16:40;
  const k=Math.min((r.width-pad*2)/PAGE.w,(r.height-pad*2)/PAGE.h);V.k=Math.max(.15,k);V.x=(r.width-PAGE.w*V.k)/2;V.y=(r.height-PAGE.h*V.k)/2;renderCanvas();}
function zoomAt(f,cx,cy){const r=cv.getBoundingClientRect();const k=Math.max(.15,Math.min(4,V.k*f));const px=cx-r.left,py=cy-r.top;
  V.x=px-(px-V.x)*(k/V.k);V.y=py-(py-V.y)*(k/V.k);V.k=k;renderCanvas();if(!pop.hidden)closePop();}

/* ================= interazione sul foglio ================= */
function hitId(cx,cy){const el=document.elementFromPoint(cx,cy);const g=el&&el.closest&&el.closest('#cv [data-id]');return g?g.dataset.id:null;}
function startPositions(){const st={};sel.forEach(id=>{const o=get(id);if(!o)return;const k=kind(id);
  if(k==='e'||k==='r')st[id]={x:o.x,y:o.y};else if(k==='a')st[id]={x:o.dx,y:o.dy};else if(k==='n')st[id]=o.anchor?{x:o.dx,y:o.dy}:{x:o.x,y:o.y};});return st;}
cv.addEventListener('pointerdown',ev=>{
  if(ev.button===2)return;
  if(edState)endRename(true);
  if(!pop.hidden&&!linkQueue.length)closePop();
  pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
  try{cv.setPointerCapture(ev.pointerId);}catch(e){}
  if(ev.button===1){ev.preventDefault();drag={type:'pan',cx:ev.clientX,cy:ev.clientY,vx:V.x,vy:V.y,moved:true};return;}
  if(pointers.size===2){const p=[...pointers.values()];drag={type:'pinch',d0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),k0:V.k,mid:[(p[0].x+p[1].x)/2,(p[0].y+p[1].y)/2],v0:{...V}};guides=[];return;}
  const t=ev.target;const h=t.closest('[data-handle]');const g=t.closest('[data-id]');
  const[mx,my]=toModel(ev.clientX,ev.clientY);
  if(h&&!(mode&&mode.link)){const id=h.dataset.for;const o=get(id);
    if(h.dataset.handle==='link')drag={type:'link',from:id,mx,my,cx:ev.clientX,cy:ev.clientY};
    else{const s=kind(id)==='e'?eSize(o):rSize(o);drag={type:'resize',id,w0:s.w,h0:s.h,mx,my,s:snap()};}
    return;}
  if(mode&&mode.isa){if(g&&kind(g.dataset.id)==='e')isaPick(g.dataset.id);return;}
  if(mode&&mode.link){const from=mode.link.from;mode=null;temp='';showHint();if(g){drag={type:'link2',from,tid:g.dataset.id};renderCanvas();}else{renderCanvas();}return;}
  if(g){const id=g.dataset.id;const part=t.closest('[data-part]');
    const now=performance.now();
    if(lastTap.id===id&&now-lastTap.t<450&&Math.hypot(ev.clientX-lastTap.x,ev.clientY-lastTap.y)<10){ev.preventDefault();lastTap={id:null,t:0};sel=new Set([id]);drag={type:'rename',id};render();return;}
    lastTap={id,t:now,x:ev.clientX,y:ev.clientY};
    if(ev.shiftKey||ev.metaKey||ev.ctrlKey){sel.has(id)?sel.delete(id):sel.add(id);}
    else if(!sel.has(id))sel=new Set([id]);
    const o=get(id);
    drag={type:'move',id,label:!!(part&&kind(id)==='a'),mx,my,moved:false,s:snap(),st:startPositions(),lab:o&&kind(id)==='a'?(()=>{const gg=attrGeo(o);return{x:gg.lx,y:gg.ly};})():null,cx:ev.clientX,cy:ev.clientY};
    render();return;}
  if(ev.shiftKey){drag={type:'marquee',mx,my,x2:mx,y2:my};}
  else drag={type:'pan',cx:ev.clientX,cy:ev.clientY,vx:V.x,vy:V.y,moved:false};
});
cv.addEventListener('pointermove',ev=>{
  if(pointers.has(ev.pointerId))pointers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
  if(!drag&&mode&&mode.link){const o=get(mode.link.from);if(!o)return;const[mx,my]=toModel(ev.clientX,ev.clientY);
    temp=`<line x1="${o.x}" y1="${o.y}" x2="${mx}" y2="${my}" stroke="#2160e0" stroke-width="1.6" stroke-dasharray="6 4"/><circle cx="${mx}" cy="${my}" r="4" fill="#2160e0"/>`;renderCanvas();return;}
  if(!drag)return;
  if(drag.type==='pinch'){if(pointers.size<2)return;const p=[...pointers.values()];const d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
    const k=Math.max(.15,Math.min(4,drag.k0*d/drag.d0));const r=cv.getBoundingClientRect();const mid=[(p[0].x+p[1].x)/2-r.left,(p[0].y+p[1].y)/2-r.top];
    const m0=[drag.mid[0]-r.left,drag.mid[1]-r.top];const wx=(m0[0]-drag.v0.x)/drag.k0,wy=(m0[1]-drag.v0.y)/drag.k0;
    V.k=k;V.x=mid[0]-wx*k;V.y=mid[1]-wy*k;renderCanvas();return;}
  const[mx,my]=toModel(ev.clientX,ev.clientY);
  if(drag.type==='pan'){const dx=ev.clientX-drag.cx,dy=ev.clientY-drag.cy;if(Math.hypot(dx,dy)>3)drag.moved=true;V.x=drag.vx+dx;V.y=drag.vy+dy;renderCanvas();return;}
  if(drag.type==='marquee'){drag.x2=mx;drag.y2=my;const x=Math.min(drag.mx,mx),y=Math.min(drag.my,my);
    temp=`<rect x="${x}" y="${y}" width="${Math.abs(mx-drag.mx)}" height="${Math.abs(my-drag.my)}" fill="rgba(33,96,224,.08)" stroke="#2160e0" stroke-dasharray="4 3"/>`;renderCanvas();return;}
  if(drag.type==='link'){const o=get(drag.from);temp=`<line x1="${o.x}" y1="${o.y}" x2="${mx}" y2="${my}" stroke="#2160e0" stroke-width="1.6" stroke-dasharray="6 4"/><circle cx="${mx}" cy="${my}" r="4" fill="#2160e0"/>`;renderCanvas();return;}
  if(drag.type==='resize'){const o=get(drag.id);o.w=Math.max(40,snapv(drag.w0+(mx-drag.mx)*2));o.h=Math.max(26,snapv(drag.h0+(my-drag.my)*2));renderCanvas();return;}
  if(drag.type==='move'){
    if(!drag.moved&&Math.hypot(ev.clientX-drag.cx,ev.clientY-drag.cy)<4)return;
    drag.moved=true;lastTap={id:null,t:0};
    let dx=mx-drag.mx,dy=my-drag.my;
    if(drag.label){const a=get(drag.id);a.lx=Math.round(drag.lab.x+dx);a.ly=Math.round(drag.lab.y+dy);renderCanvas();return;}
    const prim=get(drag.id),pk=kind(drag.id);guides=[];
    if(pk==='e'||pk==='r'){const st=drag.st[drag.id];let nx=snapv(st.x+dx),ny=snapv(st.y+dy);
      const others=[...M().ents,...M().rels].filter(o=>!sel.has(o.id));let gx=null,gy=null;
      others.forEach(o=>{if(gx==null&&Math.abs(o.x-(st.x+dx))<7/V.k){gx=o.x;}if(gy==null&&Math.abs(o.y-(st.y+dy))<7/V.k){gy=o.y;}});
      if(gx!=null){nx=gx;guides.push({v:gx});}if(gy!=null){ny=gy;guides.push({h:gy});}
      dx=nx-st.x;dy=ny-st.y;}
    sel.forEach(id=>{const o=get(id),st=drag.st[id];if(!o||!st)return;const k=kind(id);
      if(k==='e'||k==='r'){o.x=st.x+dx;o.y=st.y+dy;}
      else if(k==='a'){if(!sel.has(o.owner)){const ow=get(o.owner);o.dx=ow?snapv(ow.x+st.x+dx)-ow.x:snapv(st.x+dx);o.dy=ow?snapv(ow.y+st.y+dy)-ow.y:snapv(st.y+dy);}}
      else if(k==='n'){if(o.anchor){if(!sel.has(o.anchor)){o.dx=st.x+dx;o.dy=st.y+dy;}}else{o.x=st.x+dx;o.y=st.y+dy;}}});
    renderCanvas();}
});
function endPointer(ev){
  pointers.delete(ev.pointerId);
  if(!drag)return;const d=drag;
  if(d.type==='pinch'){if(pointers.size<2)drag=null;return;}
  drag=null;guides=[];temp='';
  if(d.type==='pan'){if(!d.moved){sel.clear();render();}else renderCanvas();return;}
  if(d.type==='marquee'){const x1=Math.min(d.mx,d.x2),x2=Math.max(d.mx,d.x2),y1=Math.min(d.my,d.y2),y2=Math.max(d.my,d.y2);const m=M();
    const inb=(x,y)=>x>=x1&&x<=x2&&y>=y1&&y<=y2;sel=new Set();
    m.ents.forEach(o=>inb(o.x,o.y)&&sel.add(o.id));m.rels.forEach(o=>inb(o.x,o.y)&&sel.add(o.id));
    m.notes.forEach(o=>{const g=noteGeo(o);inb(g.x,g.y)&&sel.add(o.id);});render();return;}
  if(d.type==='link2')return linkTo(d.from,d.tid);
  if(d.type==='rename'){if(kind(d.id)==='l')openLinkPop(d.id,ev.clientX,ev.clientY);else startRename(d.id);return;}
  if(d.type==='link'){
    if(Math.hypot(ev.clientX-d.cx,ev.clientY-d.cy)<6){mode={link:{from:d.from}};showHint();renderCanvas();return;}
    renderCanvas();const tid=hitId(ev.clientX,ev.clientY);
    if(!tid)return toast('Lascia la linea sopra un\'entità o un\'associazione, oppure tocca il pallino e poi l\'elemento.');
    linkTo(d.from,tid);return;}
  if(d.type==='resize'){pushHist(d.s);changed();return;}
  if(d.type==='move'){
    if(d.moved){pushHist(d.s);const ids=[...sel];ids.forEach(id=>{const o=get(id);if(o&&kind(id)==='a'&&!sel.has(o.owner))o.man=true;});
      const mv=ids.filter(id=>kind(id)==='e'||kind(id)==='r');if(mv.length)fixAttrs(neighbours(mv));changed();}
    else if(kind(d.id)==='l'&&sel.size===1){openLinkPop(d.id,ev.clientX,ev.clientY);}
  }
}
function linkTo(from,tid){const d={from};
    const fk=kind(d.from),tk=kind(tid);
    if(fk==='e'&&tk==='e')return createAssoc(d.from,tid);
    if(fk==='e'&&tk==='r')return connectToRel(d.from,tid);
    if(fk==='r'&&tk==='e')return connectToRel(tid,d.from);
    if(fk==='r'&&tk==='r')return toast('Due associazioni non si collegano direttamente: in mezzo serve un\'entità.');
    return toast('Collega un\'entità a un\'altra entità o a un\'associazione.');}
cv.addEventListener('pointerup',endPointer);
cv.addEventListener('pointercancel',endPointer);
cv.addEventListener('wheel',ev=>{ev.preventDefault();zoomAt(Math.exp(-ev.deltaY*(ev.ctrlKey?0.01:0.0015)),ev.clientX,ev.clientY);},{passive:false});

/* ================= generalizzazione: scelta padre e figli ================= */
function startIsa(){mode={isa:{parent:null,children:[]}};sel.clear();showHint();render();}
function isaPick(id){const s=mode.isa;
  if(!s.parent){s.parent=id;}
  else if(id!==s.parent){const i=s.children.indexOf(id);i>=0?s.children.splice(i,1):s.children.push(id);}
  showHint();renderCanvas();}
function showHint(){const h=$('#hint');
  if(mode&&mode.link){const o=get(mode.link.from);h.innerHTML=`<span>Collega <b>${esc(o?(kind(o.id)==='e'?dispEnt(o.name):o.name):'')}</b>: tocca l'entità o l'associazione da collegare.</span><button class="ghost" data-h="cancel">Annulla</button>`;h.hidden=false;return;}
  if(!mode||!mode.isa){h.hidden=true;return;}const s=mode.isa;
  h.innerHTML=!s.parent?`<span>Generalizzazione: tocca l'entità <b>padre</b>.</span><button class="ghost" data-h="cancel">Annulla</button>`
    :`<span>Ora tocca le entità <b>figlie</b> (${s.children.length} scelte).</span><button data-h="ok"${s.children.length?'':' disabled'}>Fine</button><button class="ghost" data-h="cancel">Annulla</button>`;
  h.hidden=false;}
$('#hint').addEventListener('click',ev=>{const b=ev.target.closest('[data-h]');if(!b)return;
  if(b.dataset.h==='ok'){const s=mode.isa;commit();const i={id:uid('i'),parent:s.parent,children:s.children.slice(),cov:'t,e'};M().isas.push(i);mode=null;showHint();sel=new Set([i.id]);changed();}
  else{mode=null;temp='';showHint();render();}});

/* ================= barra strumenti: click e trascina ================= */
let pdrag=null;
$('#palette').addEventListener('pointerdown',ev=>{const b=ev.target.closest('[data-tool]');if(!b)return;ev.preventDefault();
  pdrag={tool:b.dataset.tool,x:ev.clientX,y:ev.clientY,moved:false,ghost:null,btn:b};try{b.setPointerCapture(ev.pointerId);}catch(e){}});
$('#palette').addEventListener('pointermove',ev=>{if(!pdrag)return;
  if(!pdrag.moved&&Math.hypot(ev.clientX-pdrag.x,ev.clientY-pdrag.y)>6){
    const attrTool=['simple','key','comp','multi'].includes(pdrag.tool);
    if(attrTool&&S.attrMode==='pulsante'){return;}
    pdrag.moved=true;const g=pdrag.btn.querySelector('svg').cloneNode(true);const w=document.createElement('div');w.className='ghost-tool';
    w.style.cssText='position:fixed;pointer-events:none;z-index:70;color:var(--accent);width:56px;opacity:.9';w.appendChild(g);g.style.width='56px';g.style.height='36px';document.body.appendChild(w);pdrag.ghost=w;}
  if(pdrag.ghost){pdrag.ghost.style.left=(ev.clientX-28)+'px';pdrag.ghost.style.top=(ev.clientY-18)+'px';}});
function endPal(ev){if(!pdrag)return;const p=pdrag;pdrag=null;if(p.ghost)p.ghost.remove();
  if(!p.moved)return toolClick(p.tool);
  const R=stage.getBoundingClientRect();if(ev.clientX<R.left||ev.clientX>R.right||ev.clientY<R.top||ev.clientY>R.bottom)return;
  toolDrop(p.tool,ev.clientX,ev.clientY);}
$('#palette').addEventListener('pointerup',endPal);
$('#palette').addEventListener('pointercancel',()=>{if(pdrag&&pdrag.ghost)pdrag.ghost.remove();pdrag=null;});
function toolClick(t){
  const[cx,cy]=viewCenter();const m=M();
  if(t==='ent'){commit();const e=addEnt(cx+(Math.random()*40-20),cy);sel=new Set([e.id]);changed();startRename(e.id);return;}
  if(t==='rel'){commit();const r=addRel(cx,cy);sel=new Set([r.id]);changed();startRename(r.id);return;}
  if(t==='isa')return startIsa();
  if(t==='note'){commit();const one=sel.size===1?[...sel][0]:null;const n=addNote(cx,cy,one&&kind(one)!=='n'&&kind(one)!=='i'?one:null);sel=new Set([n.id]);changed();startRename(n.id);return;}
  if(S.attrMode==='trascina')return toast('Trascina l\'attributo sopra un\'entità (puoi cambiare modo nelle Impostazioni).');
  const ids=[...sel].filter(id=>kind(id)==='e');
  if(!ids.length)return toast('Seleziona prima un\'entità, poi premi di nuovo.');
  commit();let last;ids.forEach(id=>{last=addAttr(get(id),t);});sel=new Set([last.id]);changed();if(ids.length===1)startRename(last.id);
}
function toolDrop(t,cx,cy){
  const[mx,my]=toModel(cx,cy);const tid=hitId(cx,cy);
  if(t==='ent'){commit();const e=addEnt(mx,my);sel=new Set([e.id]);changed();startRename(e.id);return;}
  if(t==='rel'){commit();const r=addRel(mx,my);sel=new Set([r.id]);changed();startRename(r.id);return;}
  if(t==='isa')return startIsa();
  if(t==='note'){commit();const n=tid&&kind(tid)!=='n'&&kind(tid)!=='i'?addNote(mx,my,tid):addNote(mx,my);
    if(n.anchor){const g=noteGeo(n);n.dx=mx-g.ax;n.dy=my-g.ay;}sel=new Set([n.id]);changed();startRename(n.id);return;}
  let ent=tid&&kind(tid)==='e'?get(tid):null;
  if(!ent){let best=null,bd=1e9;M().ents.forEach(e=>{const s=eSize(e);const d=Math.hypot(Math.max(0,Math.abs(mx-e.x)-s.w/2),Math.max(0,Math.abs(my-e.y)-s.h/2));if(d<bd){bd=d;best=e;}});
    if(best&&bd<90){commit();const a=addAttr(best,t,[mx,my]);sel=new Set([a.id]);changed();startRename(a.id);return;}
    return toast('Lascia l\'attributo sopra un\'entità o vicino.');}
  commit();const a=addAttr(ent,t);sel=new Set([a.id]);changed();startRename(a.id);
}

/* ================= elimina, copia, incolla ================= */
function removeIds(ids){const m=M();const del=new Set(ids);
  m.ents.forEach(e=>{if(del.has(e.id)){m.attrs.forEach(a=>a.owner===e.id&&del.add(a.id));m.links.forEach(l=>l.ent===e.id&&del.add(l.id));}});
  m.rels.forEach(r=>{if(del.has(r.id))m.links.forEach(l=>l.rel===r.id&&del.add(l.id));});
  m.isas.forEach(i=>{if(del.has(i.parent))del.add(i.id);i.children=i.children.filter(c=>!del.has(c));if(!i.children.length)del.add(i.id);});
  m.notes.forEach(n=>{if(n.anchor&&del.has(n.anchor)){const g=noteGeo(n);n.x=g.x;n.y=g.y;delete n.anchor;}});
  ['ents','rels','links','attrs','isas','notes'].forEach(k=>m[k]=m[k].filter(o=>!del.has(o.id)));
  sel.clear();}
function deleteSel(){if(!sel.size)return;commit();removeIds([...sel]);closePop();changed();}
let clip=null;
function copySel(){const m=M();const ids=new Set(sel);if(!ids.size)return false;
  const ents=m.ents.filter(e=>ids.has(e.id)),eids=new Set(ents.map(e=>e.id));
  const rels=m.rels.filter(r=>ids.has(r.id)),rids=new Set(rels.map(r=>r.id));
  clip=JSON.parse(JSON.stringify({ents,rels,attrs:m.attrs.filter(a=>eids.has(a.owner)),links:m.links.filter(l=>eids.has(l.ent)&&rids.has(l.rel)),
    notes:m.notes.filter(n=>ids.has(n.id)&&!n.anchor),isas:m.isas.filter(i=>eids.has(i.parent)&&i.children.every(c=>eids.has(c)))}));
  return true;}
function paste(){if(!clip)return toast('Niente da incollare');commit();const m=M();const map={};const nid=o=>(map[o.id]=uid(o.id[0]));const c=JSON.parse(JSON.stringify(clip));
  c.ents.forEach(e=>{nid(e);});c.rels.forEach(r=>nid(r));
  c.ents.forEach(e=>{e.id=map[e.id];e.x+=30;e.y+=30;m.ents.push(e);});c.rels.forEach(r=>{r.id=map[r.id];r.x+=30;r.y+=30;m.rels.push(r);});
  c.attrs.forEach(a=>{a.id=uid('a');a.owner=map[a.owner];m.attrs.push(a);});c.links.forEach(l=>{l.id=uid('l');l.ent=map[l.ent];l.rel=map[l.rel];m.links.push(l);});
  c.notes.forEach(n=>{n.id=uid('n');n.x+=30;n.y+=30;m.notes.push(n);});c.isas.forEach(i=>{i.id=uid('i');i.parent=map[i.parent];i.children=i.children.map(x=>map[x]);m.isas.push(i);});
  sel=new Set([...c.ents.map(e=>e.id),...c.rels.map(r=>r.id),...c.notes.map(n=>n.id)]);
  c.ents.forEach(e=>{const s=e.name;e.name=uniqueName(s,m.ents.filter(o=>o.id!==e.id),o=>o.name);});
  clip.ents.forEach(e=>{e.x+=30;e.y+=30;});clip.rels.forEach(r=>{r.x+=30;r.y+=30;});clip.notes.forEach(n=>{n.x+=30;n.y+=30;});
  changed();}

/* ================= allinea / distribuisci / sistema tutto ================= */
function align(how){const items=[...sel].map(get).filter(o=>o&&(kind(o.id)==='e'||kind(o.id)==='r'));if(items.length<2)return;commit();
  const sz=o=>kind(o.id)==='e'?eSize(o):rSize(o);
  if(how==='l'){const v=Math.min(...items.map(o=>o.x-sz(o).w/2));items.forEach(o=>o.x=v+sz(o).w/2);}
  if(how==='cx'){const v=items.reduce((s,o)=>s+o.x,0)/items.length;items.forEach(o=>o.x=snapv(v));}
  if(how==='r'){const v=Math.max(...items.map(o=>o.x+sz(o).w/2));items.forEach(o=>o.x=v-sz(o).w/2);}
  if(how==='t'){const v=Math.min(...items.map(o=>o.y-sz(o).h/2));items.forEach(o=>o.y=v+sz(o).h/2);}
  if(how==='cy'){const v=items.reduce((s,o)=>s+o.y,0)/items.length;items.forEach(o=>o.y=snapv(v));}
  if(how==='b'){const v=Math.max(...items.map(o=>o.y+sz(o).h/2));items.forEach(o=>o.y=v-sz(o).h/2);}
  if(how==='dh'||how==='dv'){const k=how==='dh'?'x':'y';items.sort((a,b)=>a[k]-b[k]);const a=items[0][k],b=items[items.length-1][k];items.forEach((o,i)=>o[k]=snapv(a+(b-a)*i/(items.length-1)));}
  changed();}
/* ---- disposizione automatica degli attributi ---- */
const ATTR_FS=12.5;
function attrLabelBox(a,P,ux,uy,es){ // rettangolo occupato da pallino + etichetta (+ sotto-attributi)
  let lx,ly,anchor;
  if(Math.abs(ux)/(es.w/2+20)>=Math.abs(uy)/(es.h/2+20)){lx=ux>=0?10:-10;ly=4;anchor=ux>=0?'start':'end';}else{lx=0;ly=uy<0?-11:19;anchor='middle';}
  const w=tw(a.name,ATTR_FS,400)+(a.kind==='comp'?0:0);const sw=a.kind==='comp'?Math.max(0,...(a.subs||[]).map(s=>tw('• '+s,11.5,400))):0;const W=Math.max(w,sw);
  const tx=P[0]+lx,ty=P[1]+ly;const x0=anchor==='start'?tx:anchor==='end'?tx-W:tx-W/2;
  const h=16+(a.kind==='comp'?15*(a.subs||[]).length:0);
  return{x1:Math.min(x0,P[0]-6),y1:Math.min(ty-12,P[1]-6),x2:Math.max(x0+W,P[0]+6),y2:Math.max(ty+h-12,P[1]+6)};
}
const boxHit=(a,b,p)=>Math.max(0,Math.min(a.x2,b.x2)-Math.max(a.x1,b.x1)+p)*Math.max(0,Math.min(a.y2,b.y2)-Math.max(a.y1,b.y1)+p);
function segBox(p,q,b){ // il segmento p-q attraversa il rettangolo b?
  for(let t=0;t<=1;t+=0.05){const x=p[0]+(q[0]-p[0])*t,y=p[1]+(q[1]-p[1])*t;if(x>b.x1-3&&x<b.x2+3&&y>b.y1-3&&y<b.y2+3)return true;}return false;}
function sceneObstacles(m,skipAttrs){ // scatole e linee già presenti sul foglio
  const boxes=[],segs=[];
  m.ents.forEach(e=>{const s=eSize(e);boxes.push({x1:e.x-s.w/2,y1:e.y-s.h/2,x2:e.x+s.w/2,y2:e.y+s.h/2,id:e.id});});
  m.rels.forEach(r=>{const s=rSize(r);boxes.push({x1:r.x-s.w/2,y1:r.y-s.h/2,x2:r.x+s.w/2,y2:r.y+s.h/2,id:r.id});});
  m.links.forEach(l=>{const e=get(l.ent,m),r=get(l.rel,m);if(e&&r)segs.push({p:[e.x,e.y],q:[r.x,r.y],ent:e.id});});
  m.isas.forEach(i=>{const g=isaGeo(i,m);if(!g)return;segs.push({p:[g.p.x,g.p.y],q:[g.p.x,g.by],ent:g.p.id});segs.push({p:[g.x1,g.by],q:[g.x2,g.by]});
    g.cs.forEach(c=>segs.push({p:[c.x,g.by],q:[c.x,c.y],ent:c.id}));});
  m.attrs.forEach(a=>{if(skipAttrs&&skipAttrs.has(a.id))return;const g=attrGeo(a,m);if(!g)return;const b=attrLabelBox(a,g.P,g.ux,g.uy,eSize(g.e));b.attr=a.id;boxes.push(b);segs.push({p:g.s,q:g.P,attr:a.id});});
  m.notes.forEach(n=>{if(skipAttrs&&skipAttrs.has(n.id))return;const g=noteGeo(n,m);if(g&&g.x!=null){const b=noteBox(n,g.x,g.y);b.note=n.id;boxes.push(b);}});
  return{boxes,segs};
}
function noteBox(n,x,y){const ls=String(n.text||'').split('\n');const w=Math.max(...ls.map(t=>tw(t,12)))+10;return{x1:x-w/2,y1:y-14,x2:x+w/2,y2:y+15*ls.length-6};}
function placeNotes(m,only){ // sposta i commenti che finiscono sopra qualcos'altro nel punto libero più vicino
  (only||m.notes).forEach(n=>{const g=noteGeo(n,m);if(!g||g.x==null)return;const ob=sceneObstacles(m,new Set([n.id]));
    const hits=(x,y)=>{const b=noteBox(n,x,y);let c=0;ob.boxes.forEach(o=>{if(boxHit(b,o,4)>0)c++;});ob.segs.forEach(sg=>{if(segBox(sg.p,sg.q,b))c++;});return c;};
    if(!hits(g.x,g.y))return;
    for(let r=20;r<500;r+=20){let best=null;for(let i=0;i<16;i++){const a=i*Math.PI/8;const x=g.x+Math.cos(a)*r*1.6,y=g.y+Math.sin(a)*r;if(!hits(x,y)){best=[x,y];break;}}
      if(best){if(n.anchor){n.dx+=best[0]-g.x;n.dy+=best[1]-g.y;}else{n.x=best[0];n.y=best[1];}return;}}});
}
function lineAngles(e,m){const A=[];
  m.links.filter(l=>l.ent===e.id).forEach(l=>{const r=get(l.rel,m);if(r)A.push(Math.atan2(r.y-e.y,r.x-e.x));});
  m.isas.forEach(i=>{const g=isaGeo(i,m);if(!g)return;if(i.parent===e.id)A.push(g.down?Math.PI/2:-Math.PI/2);if(i.children.includes(e.id))A.push(g.down?-Math.PI/2:Math.PI/2);});
  return A;}
const angDist=(a,b)=>{let d=Math.abs(a-b)%(2*Math.PI);return d>Math.PI?2*Math.PI-d:d;};
function entSides(e,m){ // lati dell'entità da cui escono linee
  const occ={top:0,right:0,bottom:0,left:0};const es=eSize(e);
  const mark=(x,y)=>{const dx=x-e.x,dy=y-e.y;if(Math.abs(dx)/(es.w/2+1)>=Math.abs(dy)/(es.h/2+1))occ[dx>=0?'right':'left']++;else occ[dy>=0?'bottom':'top']++;};
  m.links.filter(l=>l.ent===e.id).forEach(l=>{const r=get(l.rel,m);if(r)mark(r.x,r.y);});
  m.isas.forEach(i=>{const g=isaGeo(i,m);if(!g)return;if(i.parent===e.id)occ[g.down?'bottom':'top']++;if(i.children.includes(e.id))occ[g.down?'top':'bottom']++;});
  return occ;}
function attrSide(e,a){const es=eSize(e);return Math.abs(a.dx)/(es.w/2+1)>=Math.abs(a.dy)/(es.h/2+1)?(a.dx>=0?'right':'left'):(a.dy>=0?'bottom':'top');}
const SIDES=['top','right','bottom','left'];
function placeAttrs(e,list,m){ // attributi sui lati liberi, in ordine, agganciati alla griglia
  m=m||M();if(!list.length)return;const es=eSize(e);const skip=new Set(list.map(a=>a.id));
  const occ=entSides(e,m);let free=SIDES.filter(s=>!occ[s]);if(!free.length)free=SIDES.slice();
  const keep=m.attrs.filter(a=>a.owner===e.id&&!skip.has(a.id));
  const cnt={top:0,right:0,bottom:0,left:0};keep.forEach(a=>cnt[attrSide(e,a)]++);
  const grp={top:[],right:[],bottom:[],left:[]};keep.forEach(a=>grp[attrSide(e,a)].push(a));
  const rank={key:0,simple:1,multi:2,comp:3};
  list.slice().sort((a,b)=>rank[a.kind]-rank[b.kind]).forEach(a=>{
    let best=null,bs=Infinity;free.forEach((s,i)=>{const sc=cnt[s]+(a.kind==='comp'&&(a.subs||[]).length&&s==='top'?0.6:0)+i*0.01;if(sc<bs){bs=sc;best=s;}});
    cnt[best]++;grp[best].push(a);});
  const ob=sceneObstacles(m,new Set(m.attrs.filter(a=>a.owner===e.id).map(a=>a.id)));
  const lw=a=>Math.max(tw(a.name,ATTR_FS,400),...((a.kind==='comp'?a.subs:[])||[]).map(s=>tw('• '+s,11.5,400)));
  SIDES.forEach(s=>{const g=grp[s];if(!g.length)return;const n=g.length;
    // gli attributi già fissati restano, si ricalcolano solo quelli nuovi; se il lato è misto si ridispone tutto il lato
    const mine=g.filter(a=>skip.has(a.id)||!a.man);
    const vert=s==='top'||s==='bottom';
    const sp=vert?Math.max(60,...mine.map(a=>lw(a)+16)):Math.max(30,...mine.map(a=>a.kind==='comp'?16+15*(a.subs||[]).length:30));
    mine.forEach((a,i)=>{const t=occ[s]?(i%2?1:-1)*(Math.floor(i/2)+1)*Math.max(sp*0.7,vert?50:34):(i-(mine.length-1)/2)*sp;
      for(let out=0;out<5;out++){const d=40+out*20;
        let dx=vert?t:(s==='right'?es.w/2+d:-es.w/2-d),dy=vert?(s==='top'?-es.h/2-d:es.h/2+d):t;
        dx=snapv(e.x+dx)-e.x;dy=snapv(e.y+dy)-e.y;
        const P=[e.x+dx,e.y+dy];const L=Math.hypot(dx,dy)||1;const box=attrLabelBox(a,P,dx/L,dy/L,es);
        const hit=ob.boxes.some(b=>b.id!==e.id&&boxHit(box,b,4)>0)||ob.segs.some(sg=>sg.ent!==e.id&&segBox(sg.p,sg.q,box));
        a.dx=dx;a.dy=dy;a.lx=null;a.ly=null;if(skip.has(a.id))a.man=false;
        if(!hit){ob.boxes.push(box);break;}}});});
}
function autoPlace(e,a){placeAttrs(e,[a]);}
function relayoutAttrs(e,m){m=m||M();placeAttrs(e,m.attrs.filter(a=>a.owner===e.id),m);}
// dopo uno spostamento o un nuovo collegamento: ridispone solo gli attributi automatici che ora danno fastidio
function fixAttrs(entIds,m){m=m||M();
  entIds.forEach(id=>{const e=get(id,m);if(!e||kind(id)!=='e')return;const es=eSize(e);const occ=entSides(e,m);
    const mine=m.attrs.filter(a=>a.owner===e.id);if(!mine.length)return;
    const ob=sceneObstacles(m,new Set(mine.map(a=>a.id)));
    const bad=mine.filter(a=>{if(a.man)return false;if(occ[attrSide(e,a)])return true;const g=attrGeo(a,m);const box=attrLabelBox(a,g.P,g.ux,g.uy,es);
      return ob.boxes.some(b=>b.id!==e.id&&boxHit(box,b,2)>0)||ob.segs.some(s=>s.ent!==e.id&&segBox(s.p,s.q,box));});
    if(bad.length)placeAttrs(e,bad,m);});
}
function neighbours(ids,m){m=m||M();const out=new Set();ids.forEach(id=>{const k=kind(id);
  if(k==='e'){out.add(id);m.links.filter(l=>l.ent===id).forEach(l=>m.links.filter(x=>x.rel===l.rel).forEach(x=>out.add(x.ent)));
    m.isas.forEach(i=>{if(i.parent===id||i.children.includes(id)){out.add(i.parent);i.children.forEach(c=>out.add(c));}});}
  if(k==='r')m.links.filter(l=>l.rel===id).forEach(l=>out.add(l.ent));});
  // anche le entità vicine, i cui attributi possono finire addosso agli elementi spostati
  const moved=[...ids].map(id=>get(id,m)).filter(o=>o&&o.x!=null);
  m.ents.forEach(e=>{if(moved.some(o=>Math.hypot(o.x-e.x,o.y-e.y)<320))out.add(e.id);});
  return out;}

/* ---- "Sistema tutto": disposizione dell'intero foglio ---- */
function layoutCrossings(m){const S=[];
  m.links.forEach(l=>{const e=get(l.ent,m),r=get(l.rel,m);if(e&&r)S.push([[e.x,e.y],[r.x,r.y],l.ent,l.rel]);});
  m.isas.forEach(i=>{const p=get(i.parent,m);i.children.forEach(c=>{const o=get(c,m);if(p&&o)S.push([[p.x,p.y],[o.x,o.y],p.id,o.id]);});});
  let n=0;for(let i=0;i<S.length;i++)for(let j=i+1;j<S.length;j++){const a=S[i],b=S[j];if(a[2]===b[2]||a[2]===b[3]||a[3]===b[2]||a[3]===b[3])continue;if(segX(a[0],a[1],b[0],b[1]))n++;}
  return n;}
function nodeBox(o,pad){const s=kind(o.id)==='e'?eSize(o):rSize(o);return{x1:o.x-s.w/2-pad,y1:o.y-s.h/2-pad,x2:o.x+s.w/2+pad,y2:o.y+s.h/2+pad};}
function layoutBad(m){ // incroci + linee che passano sopra elementi + elementi sovrapposti
  let bad=layoutCrossings(m)*1000;const all=[...m.ents,...m.rels];
  m.links.forEach(l=>{const e=get(l.ent,m),r=get(l.rel,m);if(!e||!r)return;all.forEach(o=>{if(o===e||o===r)return;if(segBox([e.x,e.y],[r.x,r.y],nodeBox(o,4)))bad+=900;});});
  for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++)if(boxHit(nodeBox(all[i],14),nodeBox(all[j],14),0)>0)bad+=900;
  return bad;}
function gridArrange(m,startId,dirs){ // entità e associazioni su una griglia: ogni associazione in fila tra le sue entità
  const cell=new Map(),pos={};const K=(c,r)=>c+','+r;
  const free=(c,r)=>!cell.has(K(c,r));const put=(id,c,r)=>{pos[id]={c,r};cell.set(K(c,r),id);};
  const nearFree=(c,r)=>{for(let d=1;d<60;d++)for(let dr=-d;dr<=d;dr++)for(let dc=-d;dc<=d;dc++){if(Math.max(Math.abs(dc),Math.abs(dr))!==d)continue;if(free(c+dc,r+dr))return[c+dc,r+dr];}return[c+99,r];};
  const relEnts=r=>[...new Set(m.links.filter(l=>l.rel===r).map(l=>l.ent))];
  const entRels=e=>[...new Set(m.links.filter(l=>l.ent===e).map(l=>l.rel))];
  const q=[];const order=[startId,...m.ents.map(e=>e.id).filter(id=>id!==startId)];
  for(const sid of order){if(pos[sid])continue;
    const ps=Object.values(pos);put(sid,ps.length?Math.max(...ps.map(p=>p.c))+3:0,0);q.push(sid);
    while(q.length){const id=q.shift();const{c,r}=pos[id];
      // generalizzazione: figli due righe sotto, la riga in mezzo resta al pettine
      m.isas.filter(i=>i.parent===id).forEach(i=>{const kids=i.children.filter(k=>!pos[k]);const n=kids.length;if(!n)return;
        const cols=kids.map((k,j)=>c+Math.round((j-(n-1)/2)*2));for(let x=Math.min(c,...cols);x<=Math.max(c,...cols);x++)if(free(x,r+1))cell.set(K(x,r+1),'#');
        kids.forEach((k,j)=>{let p=[cols[j],r+2];if(!free(...p))p=nearFree(...p);put(k,...p);q.push(k);});});
      m.isas.filter(i=>i.children.includes(id)&&!pos[i.parent]).forEach(i=>{let p=[c,r-2];if(!free(...p))p=nearFree(...p);put(i.parent,...p);q.push(i.parent);
        i.children.filter(k=>!pos[k]).forEach(k=>{let x=null;for(let d=2;d<40&&x==null;d+=2){if(free(c+d,r))x=c+d;else if(free(c-d,r))x=c-d;}put(k,x??c+40,r);q.push(k);});
        const xs=i.children.map(k=>pos[k].c);for(let x=Math.min(...xs);x<=Math.max(...xs);x++)if(free(x,r-1))cell.set(K(x,r-1),'#');});
      for(const R of entRels(id)){if(pos[R])continue;const others=relEnts(R).filter(x=>x!==id);
        if(!others.length){const d=dirs.find(([dx,dy])=>free(c+dx,r+dy));put(R,...(d?[c+d[0],r+d[1]]:nearFree(c,r)));continue;}
        if(others.length===1){const O=others[0];
          if(pos[O]){const p=pos[O];
            if(p.r===r&&Math.abs(p.c-c)===2&&free((p.c+c)/2,r)){put(R,(p.c+c)/2,r);continue;}
            if(p.c===c&&Math.abs(p.r-r)===2&&free(c,(p.r+r)/2)){put(R,c,(p.r+r)/2);continue;}
            const mc=Math.round((p.c+c)/2),mr=Math.round((p.r+r)/2);put(R,...(free(mc,mr)?[mc,mr]:nearFree(mc,mr)));continue;}
          let ok=false;
          for(const[dx,dy]of dirs)if(free(c+dx,r+dy)&&free(c+2*dx,r+2*dy)){put(R,c+dx,r+dy);put(O,c+2*dx,r+2*dy);q.push(O);ok=true;break;}
          if(!ok)for(const[dx,dy]of dirs)if(free(c+dx,r+dy)){put(R,c+dx,r+dy);let k=3;while(!free(c+k*dx,r+k*dy)&&k<30)k++;put(O,c+k*dx,r+k*dy);q.push(O);ok=true;break;}
          if(!ok){const t=nearFree(c,r);put(R,...t);put(O,...nearFree(...t));q.push(O);}
          continue;}
        const need=others.filter(o=>!pos[o]).length;let rc=null;
        const tdirs=[[0,1],[0,-1],...dirs.filter(d=>d[0]!==0)];
        for(const[dx,dy]of tdirs){const cc=c+dx,rr=r+dy;if(!free(cc,rr))continue;const nb=[[-dy,dx],[dy,-dx],[dx,dy]].filter(([a,b])=>free(cc+a,rr+b)).length;if(nb>=need){rc=[cc,rr,dx,dy];break;}}
        if(!rc){const t=nearFree(c,r);rc=[t[0],t[1],1,0];}
        put(R,rc[0],rc[1]);const nbs=[[-rc[3],rc[2]],[rc[3],-rc[2]],[rc[2],rc[3]]];
        others.forEach(O=>{if(pos[O])return;const nb=nbs.find(([a,b])=>free(rc[0]+a,rc[1]+b));put(O,...(nb?[rc[0]+nb[0],rc[1]+nb[1]]:nearFree(rc[0],rc[1])));q.push(O);});}
    }}
  m.rels.forEach(r=>{if(!pos[r.id])put(r.id,...nearFree(0,0));});
  return pos;}
function applyGrid(m,pos){
  const ids=Object.keys(pos);const cs=ids.map(id=>pos[id].c),rs=ids.map(id=>pos[id].r);
  const c0=Math.min(...cs),c1=Math.max(...cs),r0=Math.min(...rs),r1=Math.max(...rs);
  const cw={},rh={};for(let c=c0;c<=c1;c++)cw[c]=40;for(let r=r0;r<=r1;r++)rh[r]=50;
  ids.forEach(id=>{const o=get(id,m);if(!o)return;const k=kind(id);const s=k==='e'?eSize(o):rSize(o);
    const at=k==='e'?m.attrs.filter(a=>a.owner===id):[];const lab=at.length?Math.max(...at.map(a=>tw(a.name,ATTR_FS,400))):0;
    cw[pos[id].c]=Math.max(cw[pos[id].c],s.w+(k==='e'?60+(at.length?Math.min(140,lab+40):0):50));
    rh[pos[id].r]=Math.max(rh[pos[id].r],s.h+(k==='e'?70+(at.length?60:0):60));});
  const X={},Y={};let x=0;for(let c=c0;c<=c1;c++){X[c]=x+cw[c]/2;x+=cw[c];}let y=0;for(let r=r0;r<=r1;r++){Y[r]=y+rh[r]/2;y+=rh[r];}
  ids.forEach(id=>{const o=get(id,m);if(o){o.x=snapv(X[pos[id].c]);o.y=snapv(Y[pos[id].r]);}});
  // due associazioni tra le stesse due entità: affiancate
  const pairs={};m.rels.forEach(r=>{const es=[...new Set(m.links.filter(l=>l.rel===r.id).map(l=>l.ent))];if(es.length===2)(pairs[es.sort().join('|')]=pairs[es.sort().join('|')]||[]).push(r);});
  Object.entries(pairs).forEach(([k,g])=>{if(g.length<2)return;const[a,b]=k.split('|').map(id=>get(id,m));g.forEach((r,i)=>{r.x=snapv((a.x+b.x)/2);r.y=snapv((a.y+b.y)/2);const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy)||1,off=(i-(g.length-1)/2)*90;r.x+=snapv(-dy/L*off);r.y+=snapv(dx/L*off);});});
}
function placeAllAttrs(m){const tmp=m.attrs.slice();m.attrs.length=0;tmp.forEach(a=>{a.man=false;});
  m.ents.slice().sort((a,b)=>tmp.filter(x=>x.owner===b.id).length-tmp.filter(x=>x.owner===a.id).length).forEach(e=>{const mine=tmp.filter(a=>a.owner===e.id);mine.forEach(a=>m.attrs.push(a));placeAttrs(e,mine,m);});
  tmp.forEach(a=>{if(!m.attrs.includes(a))m.attrs.push(a);});}
function arrange(){
  const m=M();if(!m.ents.length)return toast('Il foglio è vuoto.');commit();
  const deg=id=>m.links.filter(l=>l.ent===id).length+m.isas.filter(i=>i.parent===id||i.children.includes(id)).length*1.5;
  const kids=new Set(m.isas.flatMap(i=>i.children));let starts=m.ents.filter(e=>!kids.has(e.id)).sort((a,b)=>deg(b.id)-deg(a.id)).slice(0,4).map(e=>e.id);if(!starts.length)starts=[m.ents[0].id];
  const R=[1,0],L=[-1,0],U=[0,-1],Dn=[0,1];
  const orders=[[R,L,Dn,U],[R,Dn,L,U],[L,R,Dn,U],[Dn,R,L,U],[R,L,U,Dn],[R,U,L,Dn]];
  const snapL=()=>({p:[...m.ents,...m.rels].map(o=>[o,o.x,o.y]),a:m.attrs.map(a=>[a,a.dx,a.dy])});
  let best=null,bs=Infinity;
  for(const s of starts)for(const o of orders){const pos=gridArrange(m,s,o);applyGrid(m,pos);placeAllAttrs(m);
    let bent=0;m.links.forEach(l=>{const a=pos[l.ent],b=pos[l.rel];if(a&&b&&a.c!==b.c&&a.r!==b.r)bent++;});
    const xs=[...m.ents,...m.rels].map(o=>o.x),ys=[...m.ents,...m.rels].map(o=>o.y);const w=Math.max(...xs)-Math.min(...xs)+300,h=Math.max(...ys)-Math.min(...ys)+250;
    let isaBad=0;m.isas.forEach(i=>{const p=pos[i.parent];const rs=i.children.map(k=>pos[k]).filter(Boolean);if(!p||!rs.length)return;if(new Set(rs.map(x=>x.r)).size>1)isaBad++;if(rs.some(x=>x.r<=p.r))isaBad++;});
    let tern=0;m.rels.forEach(r=>{const es=[...new Set(m.links.filter(l=>l.rel===r.id).map(l=>l.ent))];if(es.length!==3||!pos[r.id])return;const q=pos[r.id];
      const side=es.map(e=>pos[e]).filter(Boolean).map(p=>p.c===q.c?'v':p.r===q.r?'h':'x');if(!(side.filter(x=>x==='h').length===2&&side.includes('v')))tern++;});
    const ob=sceneObstacles(m);let attrBad=0;ob.boxes.forEach(b=>{if(!b.attr)return;const a=get(b.attr,m);
      if(ob.boxes.some(o=>o!==b&&o.id!==(a&&a.owner)&&boxHit(b,o,2)>0))attrBad++;if(ob.segs.some(sg=>sg.attr!==b.attr&&sg.ent!==(a&&a.owner)&&segBox(sg.p,sg.q,b)))attrBad++;});
    const sc=layoutBad(m)+bent*400+isaBad*1500+attrBad*300+tern*250+Math.abs(Math.log((w/h)/1.41))*300+(w*h)/4000;
    if(sc<bs){bs=sc;best=snapL();}}
  best.p.forEach(([o,x,y])=>{o.x=x;o.y=y;});best.a.forEach(([a,dx,dy])=>{a.dx=dx;a.dy=dy;a.lx=null;a.ly=null;a.man=false;});
  placeNotes(m);
  m.k=1;m.tx=0;m.ty=0;fit(true);
  {const b=bbox(m),A=paperBox(SH());if(b){m.tx=A.x+(A.w-(b.x2-b.x1)*m.k)/2-b.x1*m.k;m.ty=A.y+(A.h-(b.y2-b.y1)*m.k)/2-b.y1*m.k;}}
  save();render();fitView();
  const c=layoutCrossings(m);toast(c?`Diagramma riordinato (${c} incroci rimasti: vengono disegnati con il ponticello).`:'Diagramma riordinato: linee dritte e senza incroci.');
}

/* ================= pannello proprietà ================= */
const KNAME={simple:'Semplice',key:'Chiave',comp:'Composto',multi:'Multivalore'};
const KICON={simple:'<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  key:'<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="5" fill="currentColor"/></svg>',
  comp:'<svg viewBox="0 0 16 16"><rect x="3.5" y="3.5" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  multi:'<svg viewBox="0 0 16 16"><path d="M1 4l3 4-3 4M5 4l3 4-3 4" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>'};
let panelSnap=null;
function warnHtml(){const w=warnings();
  return `<div class="psec"><h3>Avvisi ${w.length?`<span class="badge">${w.length}</span>`:''}</h3>`+
   (w.length?`<div class="warns">${w.map(x=>`<button class="warn" data-go="${x.id}"><span>${esc(x.t)}</span></button>`).join('')}</div><p class="note">Sono solo avvisi: non bloccano niente e non compaiono nel PDF.</p>`:`<div class="okmsg">Nessun problema trovato.</div>`)+`</div>`;}
function renderPanel(){
  const p=$('#panel');const m=M();const ids=[...sel].filter(id=>get(id));let h='';
  if(ids.length===0){
    h+=`<div class="psec"><h3>Foglio</h3><label class="fld"><span>Titolo in alto sul foglio</span><input data-sheet="title" value="${esc(SH().title)}" placeholder="Es. Schema ER – Biblioteca"></label>
      <div class="stats"><div><b>${m.ents.length}</b><span>entità</span></div><div><b>${m.rels.length}</b><span>associazioni</span></div><div><b>${m.attrs.length}</b><span>attributi</span></div></div>
      <p class="note">Trascina gli elementi dalla barra a sinistra. Tocca due volte un elemento per rinominarlo. Trascina lo sfondo per spostarti, rotellina o due dita per lo zoom, Maiusc + trascina per selezionare più elementi.</p></div>`;
  }else if(ids.length===1){const id=ids[0],o=get(id),k=kind(id);
    if(k==='e'){const at=m.attrs.filter(a=>a.owner===id);
      h+=`<div class="psec"><h3>Entità</h3><label class="fld"><span>Nome</span><input data-f="name" value="${esc(o.name)}"></label>
       <div class="row"><button class="btn sm" data-a="fitsize"${o.w||o.h?'':' disabled'}>Dimensione automatica</button><button class="btn sm danger" data-a="del">Elimina</button></div></div>
       <div class="psec"><h3>Attributi (${at.length})</h3><div class="row">${['simple','key','comp','multi'].map(t=>`<button class="btn sm" data-add="${t}">+ ${KNAME[t]}</button>`).join('')}</div>
       <div class="alist">${at.map(a=>`<div class="aitem"><span title="${KNAME[a.kind]}">${KICON[a.kind]}</span><span class="nm">${esc(a.name)}</span><span><button data-go="${a.id}" title="Seleziona">Modifica</button></span></div>`).join('')||'<p class="note">Nessun attributo. Ricorda la chiave (pallino pieno).</p>'}</div>
       <button class="btn sm" data-a="replace">Ridisponi gli attributi attorno</button></div>`;}
    else if(k==='r'){const ls=m.links.filter(l=>l.rel===id);
      h+=`<div class="psec"><h3>Associazione</h3><label class="fld"><span>Nome (un verbo)</span><input data-f="name" value="${esc(o.name)}"></label>`+
       (S.triangle?`<div class="fld"><span>Verso di lettura (triangolino)</span><div class="seg">${[['','Nessuno'],['l','←'],['r','→'],['u','↑'],['d','↓']].map(([v,t])=>`<button data-dir="${v}" class="${(o.dir||'')===v?'on':''}">${t}</button>`).join('')}</div></div>`:'')+
       `<button class="btn sm danger" data-a="del">Elimina</button></div>
       <div class="psec"><h3>Lati (${ls.length})</h3>${ls.map(l=>{const e=get(l.ent);return`<div class="fld"><span>${esc(dispEnt(e?e.name:'?'))}</span><div class="row"><div class="seg">${['1','N','M'].map(c=>`<button data-lc="${l.id}:${c}" class="${l.card===c?'on':''}">${c}</button>`).join('')}</div><div class="seg"><button data-lp="${l.id}:obb" class="${l.part==='obb'?'on':''}">Continua</button><button data-lp="${l.id}:fac" class="${l.part==='fac'?'on':''}">Tratt.</button></div></div></div>`;}).join('')}
       <p class="note">${S.assocMode==='trascina'?'Per un altro lato trascina il pallino + blu dall\'associazione a un\'entità.':''}</p></div>`;}
    else if(k==='l'){const e=get(o.ent),r=get(o.rel);
      h+=`<div class="psec"><h3>Linea</h3><h2>${esc(dispEnt(e.name))} — ${esc(r.name)}</h2>
       <div class="fld"><span>Molteplicità (vicino a ${esc(dispEnt(e.name))})</span><div class="seg">${['1','N','M'].map(c=>`<button data-lc="${o.id}:${c}" class="${o.card===c?'on':''}">${c}</button>`).join('')}</div></div>
       <div class="fld"><span>Partecipazione</span><div class="seg"><button data-lp="${o.id}:obb" class="${o.part==='obb'?'on':''}">Continua</button><button data-lp="${o.id}:fac" class="${o.part==='fac'?'on':''}">Tratteggiata</button></div></div>
       <button class="btn sm danger" data-a="del">Elimina linea</button></div>`;}
    else if(k==='a'){const e=get(o.owner);
      h+=`<div class="psec"><h3>Attributo di ${esc(dispEnt(e.name))}</h3><label class="fld"><span>Nome</span><input data-f="name" value="${esc(o.name)}"></label>
       <div class="fld"><span>Tipo</span><div class="seg">${['simple','key','comp','multi'].map(t=>`<button data-kind="${t}" class="${o.kind===t?'on':''}">${KNAME[t]}</button>`).join('')}</div></div>`+
       (o.kind==='comp'?`<label class="fld"><span>Sotto-attributi (uno per riga)</span><textarea data-f="subs">${esc((o.subs||[]).join('\n'))}</textarea></label>`:'')+
       `<div class="row"><button class="btn sm" data-a="labelreset"${o.lx==null?' disabled':''}>Rimetti il nome al suo posto</button><button class="btn sm" data-a="place">Posizione automatica</button><button class="btn sm danger" data-a="del">Elimina</button></div>
       <p class="note">Trascina il pallino per spostarlo, trascina il nome per spostare solo la scritta.</p></div>`;}
    else if(k==='i'){const pr=get(o.parent);
      h+=`<div class="psec"><h3>Generalizzazione</h3><h2>${esc(dispEnt(pr.name))}</h2><p class="note">Figlie: ${o.children.map(c=>esc(dispEnt((get(c)||{}).name||'?'))).join(', ')}</p>
       <div class="fld"><span>Copertura</span><div class="seg">${['t,e','t,s','p,e','p,s'].map(c=>`<button data-cov="${c}" class="${o.cov===c?'on':''}">(${c})</button>`).join('')}</div></div>
       <p class="note">t = totale, p = parziale, e = esclusiva, s = sovrapposta.</p><button class="btn sm danger" data-a="del">Elimina</button></div>`;}
    else if(k==='n'){const an=o.anchor?get(o.anchor):null;
      h+=`<div class="psec"><h3>Commento</h3><label class="fld"><span>Testo</span><textarea data-f="text">${esc(o.text)}</textarea></label>
       <p class="note">${an?'Attaccato a un elemento: lo segue quando lo sposti.':'Libero sul foglio. Per attaccarlo, trascina «Commento» dalla barra sopra un elemento.'}</p>
       <div class="row">${an?'<button class="btn sm" data-a="detach">Stacca</button>':''}<button class="btn sm danger" data-a="del">Elimina</button></div></div>`;}
  }else{
    const ents=ids.filter(i=>kind(i)==='e');
    h+=`<div class="psec"><h3>Selezione</h3><h2>${ids.length} elementi</h2>`+
     (S.assocMode==='seleziona'&&ents.length===2?`<button class="btn primary" data-a="assoc">Crea associazione tra le due entità</button>`:'')+
     (S.advanced?`<div class="fld"><span>Allinea</span><div class="row">${[['l','Sinistra'],['cx','Centro ↔'],['r','Destra'],['t','Sopra'],['cy','Centro ↕'],['b','Sotto']].map(([v,t])=>`<button class="btn sm" data-al="${v}">${t}</button>`).join('')}</div></div>
       <div class="fld"><span>Distribuisci</span><div class="row"><button class="btn sm" data-al="dh">In orizzontale</button><button class="btn sm" data-al="dv">In verticale</button></div></div>`:'<p class="note">Passa alla modalità Avanzata per allineare e distribuire.</p>')+
     `<button class="btn sm danger" data-a="del">Elimina selezionati</button></div>`;
  }
  p.innerHTML=h;
}
const panel=$('#panel');
panel.addEventListener('focusin',ev=>{if(ev.target.matches('input,textarea'))panelSnap=snap();});
panel.addEventListener('input',ev=>{const t=ev.target;
  if(t.dataset.sheet){SH().title=t.value;fit();renderCanvas();save();return;}
  const f=t.dataset.f;if(!f)return;const id=[...sel][0];const o=get(id);if(!o)return;
  if(f==='subs')o.subs=t.value.split('\n').map(s=>s.trim()).filter(Boolean);else o[f]=t.value;renderCanvas();});
panel.addEventListener('change',ev=>{const t=ev.target;if(!t.dataset.f)return;const id=[...sel][0];const o=get(id);if(!o)return;
  if(t.dataset.f==='name'&&S.camel&&(kind(id)==='e'||kind(id)==='a')){o.name=camel(o.name);}
  if(panelSnap)pushHist(panelSnap);panelSnap=null;changed();});
panel.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;const id=[...sel][0];const o=get(id);const d=b.dataset;
  if(d.go){sel=new Set([d.go]);render();if(isMobile())setPanel(true);return;}
  if(d.add){commit();const a=addAttr(o,d.add);sel=new Set([a.id]);changed();startRename(a.id);return;}
  if(d.dir!=null&&d.dir!==undefined&&b.closest('.seg')&&'dir' in d){commit();o.dir=d.dir;changed();return;}
  if(d.lc){const[lid,c]=d.lc.split(':');commit();setCard(get(lid),c);changed();return;}
  if(d.lp){const[lid,v]=d.lp.split(':');commit();get(lid).part=v;changed();return;}
  if(d.kind){commit();o.kind=d.kind;if(d.kind==='comp'&&!(o.subs||[]).length)o.subs=['Via','Città','CAP'];changed();return;}
  if(d.cov){commit();o.cov=d.cov;changed();return;}
  if(d.al){align(d.al);return;}
  const a=d.a;if(!a)return;
  if(a==='del')return deleteSel();
  if(a==='fitsize'){commit();delete o.w;delete o.h;changed();}
  if(a==='replace'){commit();relayoutAttrs(o);changed();}
  if(a==='labelreset'){commit();o.lx=null;o.ly=null;changed();}
  if(a==='place'){commit();autoPlace(get(o.owner),o);changed();}
  if(a==='detach'){commit();const g=noteGeo(o);o.x=g.x;o.y=g.y;delete o.anchor;delete o.dx;delete o.dy;changed();}
  if(a==='assoc'){const es=[...sel].filter(i=>kind(i)==='e');createAssoc(es[0],es[1]);}
});

/* ================= fogli (come Excel) ================= */
let sheetConfirm=null;
let sheetTap={i:-1,t:0};
$('#tabs').addEventListener('click',ev=>{
  const add=ev.target.closest('[data-sadd]');if(add){doc.sheets.push({id:uid('s'),name:`Foglio ${doc.sheets.length+1}`,title:'',m:emptyModel()});doc.cur=doc.sheets.length-1;sel.clear();save();render();return;}
  const x=ev.target.closest('[data-sx]');if(x){const i=+x.dataset.sx;if(sheetConfirm===i){doc.sheets.splice(i,1);doc.cur=Math.max(0,i-1);sheetConfirm=null;hist=hist.filter(h=>h.sh!==i);sel.clear();save();render();}else{sheetConfirm=i;renderTabs();}return;}
  const s=ev.target.closest('[data-s]');if(!s)return;const i=+s.dataset.s;sheetConfirm=null;
  const now=performance.now();
  if(i===doc.cur&&sheetTap.i===i&&now-sheetTap.t<400){const sp=s.querySelector('[data-sn]');sp.outerHTML=`<input value="${esc(doc.sheets[i].name)}" data-sedit="${i}" aria-label="Nome del foglio">`;const inp=s.querySelector('input');inp.focus();inp.select();
    const done=()=>{doc.sheets[i].name=inp.value.trim()||doc.sheets[i].name;save();renderTabs();};inp.addEventListener('blur',done);inp.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')inp.blur();});return;}
  sheetTap={i,t:now};
  if(i!==doc.cur){doc.cur=i;sel.clear();closePop();render();fitView();checkOverflow();}else renderTabs();
});

/* ================= finestre ================= */
const modal=$('#modal'),dlg=$('#dialog');
function openModal(html,wide){dlg.className='dialog'+(wide?' wide':'');dlg.innerHTML=html;modal.hidden=false;const f=dlg.querySelector('input,button');}
function closeModal(){modal.hidden=true;dlg.innerHTML='';}
modal.addEventListener('pointerdown',ev=>{if(ev.target===modal)closeModal();});
dlg.addEventListener('click',ev=>{if(ev.target.closest('[data-close]'))closeModal();});
let toastT=null;function toast(t){const el=$('#toast');el.innerHTML=ICO.info+'<span>'+esc(t)+'</span>';el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,3600);}

function settingsDlg(){
  const r=(name,val,opts)=>`<div class="seg" data-set="${name}">${opts.map(([v,t])=>`<button data-v="${v}" class="${String(S[name])===String(v)?'on':''}">${t}</button>`).join('')}</div>`;
  const c=(name,t,sub)=>`<label class="chk"><input type="checkbox" data-chk="${name}"${S[name]?' checked':''}><span>${t}${sub?`<small>${sub}</small>`:''}</span></label>`;
  openModal(`<div class="dhead"><h2>Impostazioni</h2><button class="xbtn" data-close aria-label="Chiudi">×</button></div>
  <div class="dbody">
   <div class="grid2">
    <div class="set"><h4>Nomi delle entità</h4>${r('caseName',S.caseName,[['upper','MAIUSCOLO'],['cap','Iniziale maiuscola']])}</div>
    <div class="set"><h4>Molteplicità (1, N, M)</h4>${r('multPos',S.multPos,[['entita','Vicino all\'entità'],['meta','A metà linea']])}</div>
    <div class="set"><h4>Forma delle linee</h4>${r('lineStyle',S.lineStyle,[['dritte','Dritte'],['rette','Ad angolo'],['morbide','Morbide']])}</div>
    <div class="set"><h4>Colori del diagramma</h4>${r('colors',S.colors,[['bn','Bianco e nero'],['soft','Colori tenui']])}</div>
    <div class="set"><h4>Aggiungere attributi</h4>${r('attrMode',S.attrMode,[['pulsante','Pulsante'],['trascina','Trascina'],['entrambi','Entrambi']])}</div>
    <div class="set"><h4>Creare associazioni</h4>${r('assocMode',S.assocMode,[['trascina','Trascina da A a B'],['seleziona','Seleziona 2 + pulsante']])}</div>
   </div>
   <div class="grid2">
    <div class="set"><h4>Simboli</h4>${c('triangle','Triangolino del verso di lettura','Dentro il rombo, punta verso l\'oggetto del verbo')}${c('ternary','Associazioni ternarie','Un rombo collegato a tre entità')}</div>
    <div class="set"><h4>Foglio A4</h4>${c('showPage','Mostra il bordo del foglio A4')}${c('autoFit','Adatta da solo al foglio','A ogni modifica rimpicciolisce il diagramma se esce dall\'A4')}</div>
    <div class="set"><h4>Nomi</h4>${c('camel','Converti in CamelCase','«data di nascita» diventa DataNascita, «Città» diventa Citta')}</div>
    <div class="set"><h4>Interfaccia</h4>${c('advanced','Modalità avanzata','Mostra Sistema tutto, Allinea e Distribuisci')}${c('warnOverlay','Avvisi sopra gli elementi','Un fumetto con il problema sopra l\'entità, l\'associazione o la linea. Non finisce nel PDF')}
      <label class="fld"><span>Lingua</span><select data-sel="lang"><option value="it"${S.lang==='it'?' selected':''}>Italiano</option><option value="en"${S.lang==='en'?' selected':''}>English (in arrivo)</option></select></label></div>
   </div>
   <div class="set"><h4>Intestazione sul foglio</h4>${c('header','Mostra l\'intestazione in alto a destra')}
     <div class="keys" style="grid-template-columns:1fr 1.4fr 30px;margin-top:8px">${S.headerFields.map((f,i)=>`<input class="inp" data-hf="${i}:l" value="${esc(f.l)}" aria-label="Etichetta"><input class="inp" data-hf="${i}:v" value="${esc(f.v)}" aria-label="Valore" placeholder="vuoto = riga da compilare"><button class="btn sm" data-hfdel="${i}" aria-label="Togli">×</button>`).join('')}</div>
     <button class="btn sm" data-hfadd style="margin-top:6px">+ Campo</button></div>
   <div class="set"><h4>Scorciatoie da tastiera</h4><div class="keys">${[['ent','Entità'],['rel','Associazione'],['isa','Generalizzazione'],['simple','Attributo semplice'],['key','Chiave'],['comp','Attributo composto'],['multi','Multivalore'],['note','Commento']].map(([k,t])=>`<span>${t}</span><input class="inp" maxlength="1" data-key="${k}" value="${esc(S.keys[k])}">`).join('')}</div>
     <h4 style="margin-top:12px">Comandi di modifica</h4><div class="keys">${Object.keys(COMBO_NAME).map(a=>`<span>${COMBO_NAME[a]}</span><input class="inp combo" readonly data-combo="${a}" value="${esc(S.combos[a])}" title="Clicca e premi la nuova combinazione">`).join('')}</div>
     <p class="note" id="comboMsg" style="margin-top:6px">Clicca un campo e premi la combinazione nuova (per esempio Ctrl+Maiusc+Z). Esc per lasciarla com'è (per «Annulla azione» clicca fuori dal campo).</p>
</div>
  </div><div class="dfoot"><button class="btn" data-reset>Ripristina predefiniti</button><button class="btn primary" data-close>Fatto</button></div>`);
}
dlg.addEventListener('keydown',ev=>{const t=ev.target;if(!t.dataset||!t.dataset.combo)return;ev.preventDefault();ev.stopPropagation();
  if(ev.key==='Escape'&&!ev.ctrlKey&&!ev.shiftKey&&!ev.altKey&&t.dataset.combo!=='esc'){t.value=S.combos[t.dataset.combo];t.blur();return;}
  const cb=comboOf(ev);if(!cb)return;const msg=$('#comboMsg');
  const other=Object.keys(S.combos).find(a=>a!==t.dataset.combo&&S.combos[a]===cb);
  const fixed=FIXED_COMBOS[cb]||null;
  const tool=!/^(Ctrl|Alt)\+/.test(cb)&&Object.keys(S.keys).find(x=>S.keys[x].toUpperCase()===cb.replace('Maiusc+',''))?'uno strumento':null;
  const clash=other?COMBO_NAME[other]:fixed||tool;
  if(clash){msg.innerHTML=`<b style="color:var(--err)">${esc(cb)} è già usato da ${esc(clash)}.</b> Scegline un'altra.`;t.value=S.combos[t.dataset.combo];return;}
  S.combos[t.dataset.combo]=cb;t.value=cb;msg.textContent=`${COMBO_NAME[t.dataset.combo]}: ora ${cb}.`;applySettings(true);});
dlg.addEventListener('focusin',ev=>{if(ev.target.dataset&&ev.target.dataset.combo)ev.target.value='Premi i tasti…';});
dlg.addEventListener('focusout',ev=>{if(ev.target.dataset&&ev.target.dataset.combo)ev.target.value=S.combos[ev.target.dataset.combo];});
dlg.addEventListener('click',ev=>{
  const sb=ev.target.closest('[data-set] [data-v]');if(sb){const k=sb.closest('[data-set]').dataset.set;S[k]=sb.dataset.v;applySettings();settingsDlg();return;}
  if(ev.target.closest('[data-hfadd]')){S.headerFields.push({l:'Campo',v:''});applySettings();settingsDlg();return;}
  const hd=ev.target.closest('[data-hfdel]');if(hd){S.headerFields.splice(+hd.dataset.hfdel,1);applySettings();settingsDlg();return;}
  if(ev.target.closest('[data-reset]')){const k=S.headerFields;S=JSON.parse(JSON.stringify(DEF_SETTINGS));S.headerFields=k;applySettings();settingsDlg();return;}
});
dlg.addEventListener('change',ev=>{const t=ev.target;
  if(t.dataset.chk){S[t.dataset.chk]=t.checked;applySettings();return;}
  if(t.dataset.sel){S[t.dataset.sel]=t.value;if(t.value==='en')toast('Per ora c\'è solo l\'italiano: l\'inglese arriverà in una prossima versione.');applySettings();return;}});
dlg.addEventListener('input',ev=>{const t=ev.target;
  if(t.dataset.hf){const[i,k]=t.dataset.hf.split(':');S.headerFields[+i][k]=t.value;applySettings(true);return;}
  if(t.dataset.key){const v=t.value.toLowerCase();if(v)S.keys[t.dataset.key]=v;applySettings(true);}});
function applySettings(quiet){
  try{localStorage.setItem(STORE_KEY,JSON.stringify({doc,S}));}catch(e){}
  document.querySelectorAll('.adv').forEach(b=>b.hidden=!S.advanced);
  document.querySelectorAll('kbd[data-k]').forEach(k=>k.textContent=(S.keys[k.dataset.k]||'').toUpperCase());
  bannerDismissed=false;fit();render();
}

function legendDlg(){
  const box=(inner,h=56)=>`<svg viewBox="0 0 220 ${h}">${inner}</svg>`;
  const items=[
    ['Entità','Rettangolo con il nome. Una «cosa» di cui salvi i dati.',box('<rect x="60" y="12" width="100" height="32" fill="#fff" stroke="#111" stroke-width="1.6"/><text x="110" y="33" text-anchor="middle" font-size="13" font-weight="700" font-family="Helvetica,Arial">STUDENTE</text>')],
    ['Associazione','Rombo con un verbo dentro. Collega due entità.',box('<path d="M50 28 110 6 170 28 110 50Z" fill="#fff" stroke="#111" stroke-width="1.6"/><text x="110" y="32" text-anchor="middle" font-size="12" font-weight="600" font-family="Helvetica,Arial">frequenta</text>')],
    ['Attributo semplice','Pallino vuoto collegato con una linea.',box('<rect x="20" y="14" width="60" height="28" fill="#fff" stroke="#111" stroke-width="1.4"/><line x1="80" y1="28" x2="125" y2="28" stroke="#111" stroke-width="1.3"/><circle cx="130" cy="28" r="5" fill="#fff" stroke="#111" stroke-width="1.5"/><text x="142" y="32" font-size="12" font-family="Helvetica,Arial">Nome</text>')],
    ['Chiave','Pallino pieno: identifica ogni elemento in modo unico.',box('<rect x="20" y="14" width="60" height="28" fill="#fff" stroke="#111" stroke-width="1.4"/><line x1="80" y1="28" x2="125" y2="28" stroke="#111" stroke-width="1.3"/><circle cx="130" cy="28" r="5" fill="#111"/><text x="142" y="32" font-size="12" font-family="Helvetica,Arial">Matricola</text>')],
    ['Attributo composto','Quadrato vuoto, con i pezzi in elenco sotto.',box('<rect x="20" y="10" width="60" height="28" fill="#fff" stroke="#111" stroke-width="1.4"/><line x1="80" y1="24" x2="125" y2="24" stroke="#111" stroke-width="1.3"/><rect x="125" y="19" width="10" height="10" fill="#fff" stroke="#111" stroke-width="1.5"/><text x="142" y="28" font-size="12" font-family="Helvetica,Arial">Indirizzo</text><text x="142" y="42" font-size="11" font-family="Helvetica,Arial">• Via</text><text x="142" y="54" font-size="11" font-family="Helvetica,Arial">• Città</text>',60)],
    ['Multivalore','Doppia freccia e pallino: può avere più valori.',box('<rect x="20" y="14" width="60" height="28" fill="#fff" stroke="#111" stroke-width="1.4"/><line x1="80" y1="28" x2="125" y2="28" stroke="#111" stroke-width="1.3"/><polyline points="105,24 110,28 105,32" fill="none" stroke="#111" stroke-width="1.4"/><polyline points="111,24 116,28 111,32" fill="none" stroke="#111" stroke-width="1.4"/><circle cx="130" cy="28" r="5" fill="#fff" stroke="#111" stroke-width="1.5"/><text x="142" y="32" font-size="12" font-family="Helvetica,Arial">Telefoni</text>')],
    ['Molteplicità','1, N o M, scritto vicino all\'entità che viene contata.',box('<rect x="8" y="14" width="56" height="28" fill="#fff" stroke="#111" stroke-width="1.4"/><line x1="64" y1="28" x2="150" y2="28" stroke="#111" stroke-width="1.5"/><path d="M150 28 182 14 214 28 182 42Z" fill="#fff" stroke="#111" stroke-width="1.4"/><text x="86" y="22" text-anchor="middle" font-size="14" font-weight="700" font-family="Helvetica,Arial">N</text>')],
    ['Partecipazione','Linea continua = deve partecipare. Tratteggiata = può non partecipare.',box('<line x1="20" y1="18" x2="200" y2="18" stroke="#111" stroke-width="1.5"/><line x1="20" y1="40" x2="200" y2="40" stroke="#111" stroke-width="1.5" stroke-dasharray="7 5"/>')],
    ['Generalizzazione','Freccia piena verso il padre, con la copertura (t,e).',box('<rect x="85" y="2" width="50" height="16" fill="#fff" stroke="#111" stroke-width="1.3"/><path d="M110 18l-5 8h10z" fill="#111"/><path d="M110 26v6M60 32h100M60 32v8M160 32v8" stroke="#111" stroke-width="1.3" fill="none"/><rect x="35" y="40" width="50" height="14" fill="#fff" stroke="#111" stroke-width="1.3"/><rect x="135" y="40" width="50" height="14" fill="#fff" stroke="#111" stroke-width="1.3"/><text x="117" y="29" font-size="11" font-family="Helvetica,Arial">(t,e)</text>')],
    ['Verso di lettura','Triangolino nel rombo: punta verso l\'oggetto del verbo.',box('<path d="M50 28 110 6 170 28 110 50Z" fill="#fff" stroke="#111" stroke-width="1.6"/><path d="M151 28l-10-6v12z" fill="#111"/><text x="104" y="32" text-anchor="middle" font-size="12" font-weight="600" font-family="Helvetica,Arial">eleva</text>')],
    ['Incrocio','Se due linee si incrociano, una fa un piccolo salto.',box('<path d="M20 28H105A5 5 0 0 1 115 28H200" fill="none" stroke="#111" stroke-width="1.5"/><line x1="110" y1="6" x2="110" y2="50" stroke="#111" stroke-width="1.5"/>')],
    ['Commento','Testo libero o attaccato a un elemento (es. i ruoli di una ricorsiva).',box('<text x="110" y="32" text-anchor="middle" font-size="12" font-style="italic" fill="#555" font-family="Helvetica,Arial">ruolo: genitore</text>')]
  ];
  openModal(`<div class="dhead"><h2>Legenda dei simboli</h2><button class="xbtn" data-close aria-label="Chiudi">×</button></div><div class="dbody"><div class="leg">${items.map(i=>`<div>${i[2]}<b>${i[0]}</b><span>${i[1]}</span></div>`).join('')}</div></div>`,true);
}

function exportDlg(){
  const missing=doc.sheets.reduce((s,sh)=>s+sh.m.links.filter(l=>!l.card).length,0);
  openModal(`<div class="dhead"><h2>Esporta</h2><button class="xbtn" data-close aria-label="Chiudi">×</button></div>
  <div class="dbody">
   <label class="fld"><span>Nome del file</span><input id="exName" value="${esc(doc.title)}"></label>
   <div class="set"><h4>Formato</h4><div class="seg" id="exFmt"><button data-f="pdf" class="on">PDF A4 orizzontale</button><button data-f="png">PNG</button><button data-f="svg">SVG</button><button data-f="json">.json</button></div></div>
   <div class="set"><h4>Fogli da esportare</h4>${doc.sheets.map((s,i)=>`<label class="chk"><input type="checkbox" data-exs="${i}"${i===doc.cur?' checked':''}><span>${esc(s.name)}<small>${s.m.ents.length} entità · ${s.m.rels.length} associazioni</small></span></label>`).join('')}</div>
   ${missing?`<div class="warn"><span>Mancano ${missing} molteplicità. Nel PDF quei punti resteranno vuoti. Puoi esportare lo stesso.</span></div>`:''}
   <p class="note" id="exNote">Il PDF contiene il disegno vettoriale e, nascosti dentro, i dati del diagramma: riaprendolo con «Apri» torni a modificarlo. Ogni foglio scelto diventa una pagina A4.</p>
  </div><div class="dfoot"><button class="btn" id="exPrev">Anteprima</button><button class="btn primary" id="exGo">Esporta</button></div>`);
  let fmt='pdf';
  $('#exFmt').onclick=ev=>{const b=ev.target.closest('[data-f]');if(!b)return;fmt=b.dataset.f;[...$('#exFmt').children].forEach(x=>x.classList.toggle('on',x===b));$('#exNote').textContent={pdf:'Il PDF contiene il disegno vettoriale e, nascosti dentro, i dati del diagramma: riaprendolo con «Apri» torni a modificarlo. Ogni foglio scelto diventa una pagina A4.',png:'Un\'immagine per ogni foglio scelto, ad alta risoluzione. Non si può riaprire per modificarla.',svg:'Un disegno vettoriale per ogni foglio scelto. Non si può riaprire per modificarlo.',json:'Tutti i fogli del diagramma in un file di testo: si riapre con «Apri».'}[fmt];};
  $('#exPrev').onclick=()=>previewDlg();
  $('#exGo').onclick=async()=>{const name=($('#exName').value.trim()||'diagramma').replace(/[\\/:*?"<>|]+/g,'-');
    const idx=[...dlg.querySelectorAll('[data-exs]')].filter(x=>x.checked).map(x=>+x.dataset.exs);
    if(!idx.length)return toast('Scegli almeno un foglio');
    const go=$('#exGo');go.disabled=true;go.textContent='Esporto…';
    try{
      if(fmt==='json'){downloadBlob(new Blob([docToJson(plainDoc())],{type:'application/json'}),name+'.json');}
      else if(fmt==='pdf'){const bytes=await exportPdf(idx.map(i=>svgOf(doc.sheets[i])),encodeDoc(plainDoc()),doc.title||name);downloadBlob(new Blob([bytes],{type:'application/pdf'}),name+'.pdf');}
      else{for(const i of idx){const sh=doc.sheets[i],suf=idx.length>1?' - '+sh.name:'';
        if(fmt==='svg')downloadBlob(new Blob([svgOf(sh)],{type:'image/svg+xml'}),name+suf+'.svg');
        else downloadBlob(await svgToPngBlob(svgOf(sh),PAGE.w,PAGE.h,2),name+suf+'.png');}}
      closeModal();toast(`Salvato «${name}.${fmt}»`);
    }catch(e){console.error(e);go.disabled=false;go.textContent='Esporta';toast('Esportazione non riuscita: '+(e&&e.message||e));}};
}
function plainDoc(){return JSON.parse(JSON.stringify(doc));}
async function printPdf(){
  try{toast('Preparo la stampa…');const bytes=await exportPdf(doc.sheets.map(sh=>svgOf(sh)),encodeDoc(plainDoc()),doc.title||'diagramma');
    const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
    const f=document.createElement('iframe');f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';f.src=url;
    f.onload=()=>{try{f.contentWindow.focus();f.contentWindow.print();}catch(e){window.open(url,'_blank');}setTimeout(()=>{f.remove();URL.revokeObjectURL(url);},60000);};
    document.body.appendChild(f);
  }catch(e){console.error(e);toast('Stampa non riuscita');}
}
// per l'export: niente zone di clic trasparenti (svg2pdf non conosce 'transparent')
function svgOf(sh){const body=pageSvg(sh,true).replace(/<(?:path|circle|rect)\b[^>]*="transparent"[^>]*\/>/g,'').replace(/font-weight="(?:600|700)"/g,'font-weight="bold"');
  return`<svg xmlns="http://www.w3.org/2000/svg" width="${PAGE.w}" height="${PAGE.h}" viewBox="0 0 ${PAGE.w} ${PAGE.h}" font-family="Helvetica, Arial, sans-serif">${body}</svg>`;}
function previewDlg(){
  const s=sel;sel=new Set();const svg=svgOf(SH());sel=s;
  openModal(`<div class="dhead"><h2>Anteprima del PDF · ${esc(SH().name)}</h2><button class="xbtn" data-close aria-label="Chiudi">×</button></div>
   <div class="dbody"><div class="paperWrap">${svg}</div><p class="note">A4 orizzontale, margini 10 mm. Niente avvisi, griglia o selezioni: solo il diagramma.</p></div>
   <div class="dfoot"><button class="btn" data-act2="export">Torna all'esportazione</button><button class="btn primary" data-close>Chiudi</button></div>`,true);
  dlg.querySelector('[data-act2]').onclick=()=>exportDlg();
}
function driveDlg(){
  openModal(`<div class="dhead"><h2>I miei diagrammi</h2><button class="xbtn" data-close aria-label="Chiudi">×</button></div>
   <div class="dbody"><div class="warn"><span>Google Drive non è ancora collegato: lo colleghiamo alla fine, quando crei il Client ID su Google Cloud. Ogni persona userà il proprio account Google.</span></div>
   <div class="set"><h4>Come apparirà</h4><div class="drv">
     <div><b>${esc(doc.title)}.pdf</b><span>modificato ora · ${doc.sheets.length} ${doc.sheets.length===1?'foglio':'fogli'}</span></div>
     <div><b>Biblioteca.pdf</b><span>esempio · ieri</span></div>
     <div><b>Ospedale.pdf</b><span>esempio · 3 giorni fa</span></div></div></div>
   <p class="note">Salvataggio automatico 2 secondi dopo l'ultima modifica, nella cartella «ER Studio». Offline salva sul dispositivo e sincronizza quando torna la rete. Drive tiene anche la cronologia delle versioni.</p></div>
   <div class="dfoot"><button class="btn" disabled>Collega Google Drive</button><button class="btn primary" data-close>Chiudi</button></div>`);
}
function newDlg(){
  openModal(`<div class="dhead"><h2>Nuovo diagramma</h2><button class="xbtn" data-close aria-label="Chiudi">×</button></div>
   <div class="dbody"><p>Inizi da un foglio bianco. Il diagramma attuale viene sostituito: se vuoi tenerlo, esportalo prima in PDF o .json.</p></div>
   <div class="dfoot"><button class="btn" data-close>Annulla</button><button class="btn primary" id="newGo">Foglio bianco</button></div>`);
  $('#newGo').onclick=()=>{doc=newDoc(false);hist=[];fut=[];sel.clear();$('#fileName').value=doc.title;closeModal();save();render();fitView();checkOverflow();};
}
function loadDoc(d,msg){doc=d;doc.cur=0;hist=[];fut=[];sel.clear();$('#fileName').value=doc.title;save();render();fitView();checkOverflow();toast(msg);}
async function openFile(f){
  const buf=new Uint8Array(await f.arrayBuffer());
  const head=new TextDecoder('latin1').decode(buf.subarray(0,1024));
  if(head.includes('%PDF-')){const data=await readPdfData(buf);const d=data&&decodeDoc(data);
    if(d)return loadDoc(d,`Diagramma riaperto da «${f.name}».`);
    return errDlg(data?`«${f.name}» contiene dati di ER Studio danneggiati o di una versione non compatibile.`:`«${f.name}» non è stato creato con ER Studio, quindi non contiene il diagramma da riaprire. Apri un PDF esportato da ER Studio.`);}
  if(/\.json$/i.test(f.name)||head.trim().startsWith('{')){const d=parseDocJson(new TextDecoder().decode(buf));
    if(d)return loadDoc(d,'Diagramma aperto.');return errDlg('Questo file .json non è un diagramma di ER Studio.');}
  errDlg('Si possono aprire solo PDF creati con ER Studio o file .json di ER Studio.');
}
$('#file').addEventListener('change',async ev=>{const f=ev.target.files[0];ev.target.value='';if(f)openFile(f);});
function errDlg(t){openModal(`<div class="dhead"><h2>Impossibile aprire il file</h2><button class="xbtn" data-close aria-label="Chiudi">×</button></div><div class="dbody"><p>${esc(t)}</p></div><div class="dfoot"><button class="btn primary" data-close>Ok</button></div>`);}

/* ================= barra in alto ================= */
$('#fileName').addEventListener('input',ev=>{doc.title=ev.target.value;save();renderCrumbs();});
$('#fileName').addEventListener('keydown',ev=>ev.stopPropagation());
stage.addEventListener('dragover',ev=>ev.preventDefault());
stage.addEventListener('drop',ev=>{ev.preventDefault();const f=ev.dataTransfer.files[0];if(f)openFile(f);});

/* ================= tastiera ================= */
document.addEventListener('keydown',ev=>{
  const t=ev.target;if(t&&(t.matches('input,textarea,select'))){if(ev.key==='Escape')t.blur();return;}
  if(!modal.hidden){if(ev.key==='Escape')closeModal();return;}
  const mod=ev.ctrlKey||ev.metaKey;const k=ev.key.toLowerCase();
  if(!menu.hidden&&k==='escape'){closeMenu();return;}
  {const cb=comboOf(ev);const act=cb&&Object.keys(S.combos).find(a=>S.combos[a]===cb);if(act){ev.preventDefault();return runCmd(COMBO_CMD[act]);}}
  if((mod&&ev.shiftKey&&k==='p')||ev.key==='F1'){ev.preventDefault();return openQi();}
  if(mod&&!ev.shiftKey){const map={',':'file.settings',o:'file.open',e:'file.export',p:'file.print',b:'view.side','0':'zoom.fit','+':'zoom.in','=':'zoom.in','-':'zoom.out'};
    if(map[k]){ev.preventDefault();return runCmd(map[k]);}}
  if(mod&&k==='a'){ev.preventDefault();const m=M();sel=new Set([...m.ents,...m.rels,...m.notes].map(o=>o.id));render();return;}
  if(k==='backspace'&&S.combos.del==='Canc'&&!mod){ev.preventDefault();return deleteSel();}
  if(k==='enter'&&ev.altKey&&sel.size){ev.preventDefault();return runCmd('ctx.props');}
  if(mod||ev.altKey)return;
  const tool=Object.keys(S.keys).find(x=>S.keys[x]===k);if(tool){ev.preventDefault();toolClick(tool);}
});
window.addEventListener('resize',()=>fitView());


/* ================= interfaccia stile VS Code ================= */
const isMobile=()=>window.innerWidth>0&&window.innerWidth<760;
const isMid=()=>window.innerWidth<1180;
const ui={view:'tools',side:!isMobile(),panel:!isMobile()&&!isMid()};
let lastLayout=isMobile()?'m':isMid()?'d':'w';
const ICO={
  e:'<svg viewBox="0 0 16 16"><rect x="2" y="4" width="12" height="8" fill="none" stroke="#2f7ed8" stroke-width="1.4"/></svg>',
  r:'<svg viewBox="0 0 16 16"><path d="M1.5 8 8 3.5 14.5 8 8 12.5Z" fill="none" stroke="#c27c0e" stroke-width="1.4"/></svg>',
  i:'<svg viewBox="0 0 16 16"><path d="M8 2 4.5 7h7z" fill="#8a63d2"/><path d="M8 7v3M3.5 10h9M3.5 10v3M12.5 10v3" fill="none" stroke="#8a63d2" stroke-width="1.3"/></svg>',
  n:'<svg viewBox="0 0 16 16"><path d="M3 4.5h10M3 8h10M3 11.5h6" fill="none" stroke="#6c8a52" stroke-width="1.4"/></svg>',
  sheet:'<svg class="ti" viewBox="0 0 16 16"><rect x="1.5" y="3.5" width="13" height="9" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M5 8h2M9 6.5 10.5 8 9 9.5 7.5 8Z" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>',
  warn:'<svg viewBox="0 0 16 16"><path d="M8 1.8 1 14h14z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 6.5v3.5M8 11.6v.4" stroke="currentColor" stroke-width="1.4"/></svg>',
  ok:'<svg viewBox="0 0 16 16"><path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>',
  info:'<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 7v4.2M8 4.8v.4" stroke="currentColor" stroke-width="1.5"/></svg>',
  chev:'<svg viewBox="0 0 16 16" width="16" height="16"><path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.3"/></svg>'
};
const VIEWS={tools:'Strumenti',outline:'Struttura',problems:'Problemi',drive:'Google Drive'};
function applyUi(){
  const wb=$('#wb');wb.classList.toggle('noside',!ui.side);wb.classList.toggle('nopanel',!ui.panel);
  document.querySelectorAll('.ab[data-view]').forEach(b=>b.classList.toggle('on',ui.side&&b.dataset.view===ui.view));
  document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!=='view-'+ui.view);
  $('#sideTitle').textContent=VIEWS[ui.view];
  $('#sideFill').style.display=ui.side?'':'none';$('#panelFill').style.display=ui.panel?'':'none';
  renderSide();
  requestAnimationFrame(()=>{if(!drag)renderCanvas();});
}
function showView(v){
  if(ui.side&&ui.view===v&&(isMobile()||document.activeElement?.closest?.('.activity'))){ui.side=false;}
  else{ui.view=v;ui.side=true;if(isMobile())ui.panel=false;}
  applyUi();
}
function setPanel(on){ui.panel=on;if(on&&isMobile())ui.side=false;applyUi();}

function renderTabs(){
  $('#tabs').innerHTML=doc.sheets.map((s,i)=>`<div class="tab${i===doc.cur?' on':''}" role="tab" aria-selected="${i===doc.cur}" data-s="${i}">${ICO.sheet}<span data-sn="${i}">${esc(s.name)}</span>${doc.sheets.length>1?`<button class="x${sheetConfirm===i?' confirm':''}" data-sx="${i}" aria-label="Elimina foglio" title="Elimina foglio">${sheetConfirm===i?'Elimina?':'×'}</button>`:''}</div>`).join('')+
   `<button class="tabadd" data-sadd aria-label="Nuovo foglio" title="Nuovo foglio">+</button>`;
}
function renderCrumbs(){
  const ids=[...sel].filter(id=>get(id));let last='';
  if(ids.length===1){const o=get(ids[0]);const k=kind(ids[0]);
    const nm=k==='e'?dispEnt(o.name):k==='l'?'Collegamento':k==='i'?'Generalizzazione':k==='n'?'Commento':o.name;
    if(k==='a'){const ow=get(o.owner);last=`${ICO.chev}<span>${esc(dispEnt(ow?ow.name:''))}</span>${ICO.chev}<span>${esc(o.name)}</span>`;}
    else last=`${ICO.chev}${ICO[k]||''}<span>${esc(nm)}</span>`;}
  else if(ids.length>1)last=`${ICO.chev}<span>${ids.length} elementi selezionati</span>`;
  $('#crumbs').innerHTML=`<span>${esc(doc.title||'Senza titolo')}</span>${ICO.chev}<span>${esc(SH().name)}</span>${last}`;
}
function renderSide(){
  if(!ui.side)return;const m=M();
  if(ui.view==='outline'){
    const row=(id,ic,name,detail,lvl)=>`<button class="trow${sel.has(id)?' on':''}" data-go="${id}" style="padding-left:${8+lvl*14}px">${ic}<span class="tn">${esc(name)}</span>${detail?`<span class="td">${esc(detail)}</span>`:''}</button>`;
    let h='<div class="tree">';
    const sec=(t,n)=>`<div class="trow sec" style="padding-left:8px;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.04em">${t}<span class="td">${n}</span></div>`;
    h+=sec('Entità',m.ents.length);
    m.ents.forEach(e=>{const at=m.attrs.filter(a=>a.owner===e.id);h+=row(e.id,ICO.e,dispEnt(e.name),at.length?at.length+' attributi':'',1);
      at.forEach(a=>{h+=row(a.id,`<span style="width:16px;height:16px;display:grid;place-items:center;color:var(--muted)">${KICON[a.kind]}</span>`,a.name,KNAME[a.kind]+(a.subs&&a.subs.length?` (${a.subs.join(', ')})`:''),2);});});
    h+=sec('Associazioni',m.rels.length);
    m.rels.forEach(r=>{const ends=m.links.filter(l=>l.rel===r.id).map(l=>{const e=get(l.ent);return e?dispEnt(e.name):'?';});h+=row(r.id,ICO.r,r.name,ends.join(' – '),1);});
    if(m.isas.length){h+=sec('Generalizzazioni',m.isas.length);m.isas.forEach(i=>{const p=get(i.parent);h+=row(i.id,ICO.i,p?dispEnt(p.name):'?',`(${i.cov}) ${i.children.length} figlie`,1);});}
    if(m.notes.length){h+=sec('Commenti',m.notes.length);m.notes.forEach(n=>h+=row(n.id,ICO.n,n.text,n.anchor?'agganciato':'',1));}
    $('#view-outline').innerHTML=h+'</div>';
  }
  if(ui.view==='problems'){const w=warnings();
    $('#view-problems').innerHTML=w.length?w.map(x=>`<button class="prob" data-go="${x.id}">${ICO.warn}<span>${esc(x.t)}<small>${esc(SH().name)}</small></span></button>`).join('')+`<p class="empty">Sono solo avvisi: non bloccano niente e non finiscono nel PDF.</p>`
      :`<p class="empty">Nessun problema rilevato nel foglio.</p>`;}
  if(ui.view==='drive'){
    $('#view-drive').innerHTML=`<div class="psec"><p class="note" style="margin:0 0 10px">Collega Google Drive per salvare ogni modifica in automatico, dopo circa 2 secondi, nella cartella <b>ER Studio</b>.</p><button class="btn primary" data-cmd="file.drive" style="width:100%">Accedi con Google</button></div>
      <div class="ghead" style="cursor:default">I miei diagrammi <span style="margin-left:auto;font-weight:400;text-transform:none">esempio</span></div>
      <div class="drv"><div><b style="font-weight:400">Agenzie immobiliari.pdf</b><span>adesso</span></div><div><b style="font-weight:400">Biblioteca.pdf</b><span>ieri</span></div><div><b style="font-weight:400">Palestra.pdf</b><span>3 giorni fa</span></div></div>`;
  }
}
function renderStatus(){
  const n=warnings().length;
  $('#probStatus').innerHTML=`${ICO.warn}<span>${n}</span>`;$('#probStatus').title=n?`${n} avvisi`:'Nessun problema';
  const b=$('#probBadge');b.hidden=!n;b.textContent=n;
  $('#sbLines').textContent='Linee: '+({dritte:'dritte',rette:'ad angolo retto',morbide:'morbide'}[S.lineStyle]||S.lineStyle);
  $('#sbMult').textContent='Molteplicità: '+(S.multPos==='entita'?'vicino all\'entità':'a metà linea');
  $('#sbMode').textContent=S.advanced?'Avanzata':'Semplice';
}

/* --- comandi --- */
const ZC=()=>{const r=cv.getBoundingClientRect();return[r.left+r.width/2,r.top+r.height/2];};
const CMD={
  'file.new':{l:'Nuovo diagramma',c:'File',run:()=>newDlg()},
  'file.open':{l:'Apri PDF o .json…',c:'File',k:'Ctrl+O',run:()=>$('#file').click()},
  'file.drive':{l:'I miei diagrammi su Drive',c:'File',run:()=>driveDlg()},
  'file.export':{l:'Esporta…',c:'File',k:'Ctrl+E',run:()=>exportDlg()},
  'file.print':{l:'Stampa',c:'File',k:'Ctrl+P',run:()=>printPdf()},
  'file.settings':{l:'Impostazioni',c:'File',k:'Ctrl+,',run:()=>settingsDlg()},
  'edit.undo':{l:'Annulla',c:'Modifica',k:'Ctrl+Z',run:()=>undo()},
  'edit.redo':{l:'Ripeti',c:'Modifica',k:'Ctrl+Y',run:()=>redo()},
  'edit.cut':{l:'Taglia',c:'Modifica',en:()=>sel.size>0,run:()=>{if(copySel()){deleteSel();toast('Tagliato');}}},
  'edit.copy':{l:'Copia',c:'Modifica',k:'Ctrl+C',en:()=>sel.size>0,run:()=>{if(copySel())toast('Copiato');}},
  'edit.paste':{l:'Incolla',c:'Modifica',k:'Ctrl+V',en:()=>!!clip,run:()=>paste()},
  'edit.dup':{l:'Duplica',c:'Modifica',k:'Ctrl+D',en:()=>sel.size>0,run:()=>{if(copySel())paste();}},
  'edit.rename':{l:'Rinomina',c:'Modifica',k:'Invio',en:()=>sel.size===1&&kind([...sel][0])!=='l'&&kind([...sel][0])!=='i',run:()=>startRename([...sel][0])},
  'edit.delete':{l:'Elimina',c:'Modifica',k:'Canc',en:()=>sel.size>0,run:()=>deleteSel()},
  'edit.enter':{l:'Rinomina o apri la linea',c:'Modifica',hidden:1,run:()=>{if(sel.size!==1)return;const id=[...sel][0];if(kind(id)==='l'){const g=linkGeo(get(id));const mp=multPos(g);const sp=toScreen(mp[0],mp[1]);openLinkPop(id,sp[0],sp[1]);}else if(kind(id)!=='i')startRename(id);}},
  'edit.escape':{l:'Annulla azione e deseleziona',c:'Modifica',hidden:1,run:()=>{if(mode){mode=null;temp='';showHint();}closePop();sel.clear();render();}},
  'edit.all':{l:'Seleziona tutto',c:'Modifica',k:'Ctrl+A',run:()=>{const m=M();sel=new Set([...m.ents,...m.rels,...m.notes].map(o=>o.id));render();}},
  'align.l':{l:'Allinea a sinistra',c:'Disponi',en:()=>sel.size>1,run:()=>align('l')},
  'align.cx':{l:'Allinea al centro (verticale)',c:'Disponi',en:()=>sel.size>1,run:()=>align('cx')},
  'align.r':{l:'Allinea a destra',c:'Disponi',en:()=>sel.size>1,run:()=>align('r')},
  'align.t':{l:'Allinea in alto',c:'Disponi',en:()=>sel.size>1,run:()=>align('t')},
  'align.cy':{l:'Allinea al centro (orizzontale)',c:'Disponi',en:()=>sel.size>1,run:()=>align('cy')},
  'align.b':{l:'Allinea in basso',c:'Disponi',en:()=>sel.size>1,run:()=>align('b')},
  'align.dh':{l:'Distribuisci in orizzontale',c:'Disponi',en:()=>sel.size>2,run:()=>align('dh')},
  'align.dv':{l:'Distribuisci in verticale',c:'Disponi',en:()=>sel.size>2,run:()=>align('dv')},
  'edit.arrange':{l:'Sistema tutto (disposizione automatica)',c:'Disponi',adv:1,run:()=>arrange()},
  'ins.ent':{l:'Entità',c:'Inserisci',tool:'ent'},'ins.rel':{l:'Associazione',c:'Inserisci',tool:'rel'},'ins.isa':{l:'Generalizzazione',c:'Inserisci',tool:'isa'},
  'ins.simple':{l:'Attributo semplice',c:'Inserisci',tool:'simple'},'ins.key':{l:'Attributo chiave',c:'Inserisci',tool:'key'},'ins.comp':{l:'Attributo composto',c:'Inserisci',tool:'comp'},'ins.multi':{l:'Attributo multivalore',c:'Inserisci',tool:'multi'},
  'ins.note':{l:'Commento',c:'Inserisci',tool:'note'},
  'sheet.new':{l:'Nuovo foglio',c:'Inserisci',run:()=>{doc.sheets.push({id:uid('s'),name:`Foglio ${doc.sheets.length+1}`,title:'',m:emptyModel()});doc.cur=doc.sheets.length-1;sel.clear();save();render();fitView();}},
  'view.tools':{l:'Strumenti',c:'Visualizza',run:()=>{ui.view='tools';ui.side=true;applyUi();}},
  'view.outline':{l:'Struttura',c:'Visualizza',run:()=>{ui.view='outline';ui.side=true;applyUi();}},
  'view.problems':{l:'Problemi',c:'Visualizza',run:()=>{ui.view='problems';ui.side=true;if(isMobile())ui.panel=false;applyUi();}},
  'view.drive':{l:'Google Drive',c:'Visualizza',run:()=>{ui.view='drive';ui.side=true;if(isMobile())ui.panel=false;applyUi();}},
  'view.side':{l:'Mostra/nascondi barra laterale',c:'Visualizza',k:'Ctrl+B',run:()=>{ui.side=!ui.side;if(ui.side&&isMobile())ui.panel=false;applyUi();}},
  'view.panel':{l:'Mostra/nascondi proprietà',c:'Visualizza',run:()=>setPanel(!ui.panel)},
  'zoom.in':{l:'Ingrandisci',c:'Visualizza',k:'Ctrl++',run:()=>{const[x,y]=ZC();zoomAt(1.2,x,y);}},
  'zoom.out':{l:'Riduci',c:'Visualizza',k:'Ctrl+-',run:()=>{const[x,y]=ZC();zoomAt(1/1.2,x,y);}},
  'zoom.fit':{l:'Adatta il foglio alla finestra',c:'Visualizza',k:'Ctrl+0',run:()=>fitView()},
  'set.lines':{l:'Cambia forma delle linee',c:'Impostazioni',run:()=>{const o=['dritte','rette','morbide'];S.lineStyle=o[(o.indexOf(S.lineStyle)+1)%3];applySettings();toast('Linee: '+$('#sbLines').textContent.split(': ')[1]);}},
  'set.mult':{l:'Sposta la molteplicità (entità / metà linea)',c:'Impostazioni',run:()=>{S.multPos=S.multPos==='entita'?'meta':'entita';applySettings();}},
  'set.warnov':{l:'Mostra/nascondi avvisi sopra gli elementi',c:'Impostazioni',run:()=>{S.warnOverlay=!S.warnOverlay;applySettings();toast(S.warnOverlay?'Avvisi sopra gli elementi: attivi':'Avvisi sopra gli elementi: spenti');}},
  'set.mode':{l:'Passa a modalità semplice/avanzata',c:'Impostazioni',run:()=>{S.advanced=!S.advanced;applySettings();toast('Modalità '+(S.advanced?'avanzata':'semplice'));}},
  'help.legend':{l:'Legenda dei simboli',c:'Aiuto',run:()=>legendDlg()},
  'help.keys':{l:'Scorciatoie da tastiera',c:'Aiuto',run:()=>settingsDlg()},
  'help.about':{l:'Informazioni su ER Studio',c:'Aiuto',run:()=>toast('ER Studio · diagrammi ER in notazione Chen, PDF A4 riapribile. Versione '+__APP_VERSION__+'.')},
  'cmd.palette':{l:'Riquadro comandi',c:'Visualizza',k:'Ctrl+Maiusc+P',run:()=>openQi()}
};
Object.values(CMD).forEach(c=>{if(c.tool)c.run=()=>toolClick(c.tool);});
const MENUS={
  file:['file.new','file.open','file.drive','-','file.export','file.print','-','file.settings'],
  edit:['edit.undo','edit.redo','-','edit.cut','edit.copy','edit.paste','edit.dup','edit.rename','edit.delete','-','edit.all','-','align.l','align.cx','align.r','align.t','align.cy','align.b','align.dh','align.dv','-','edit.arrange'],
  insert:['ins.ent','ins.rel','ins.isa','-','ins.simple','ins.key','ins.comp','ins.multi','-','ins.note','-','sheet.new'],
  view:['cmd.palette','-','view.tools','view.outline','view.problems','view.drive','-','view.side','view.panel','-','zoom.in','zoom.out','zoom.fit','-','set.lines','set.mult','set.mode','set.warnov'],
  help:['help.legend','help.keys','-','help.about']
};
const MTITLE={file:'File',edit:'Modifica',insert:'Inserisci',view:'Visualizza',help:'Aiuto'};
const COMBO_CMD={undo:'edit.undo',redo:'edit.redo',cut:'edit.cut',copy:'edit.copy',paste:'edit.paste',dup:'edit.dup',del:'edit.delete',ren:'edit.enter',esc:'edit.escape'};
const COMBO_NAME={undo:'Annulla',redo:'Ripeti',cut:'Taglia',copy:'Copia',paste:'Incolla',dup:'Duplica',del:'Elimina',ren:'Rinomina',esc:'Annulla azione / deseleziona'};
const KEY_IT={Delete:'Canc',Enter:'Invio',Escape:'Esc',Backspace:'Backspace',Tab:'Tab',ArrowUp:'Su',ArrowDown:'Giù',ArrowLeft:'Sinistra',ArrowRight:'Destra',Insert:'Ins',Home:'Inizio',End:'Fine',PageUp:'PagSu',PageDown:'PagGiù'};
const FIXED_COMBOS={'Ctrl+Maiusc+P':'Riquadro comandi','Ctrl+,':'Impostazioni','Ctrl+O':'Apri','Ctrl+E':'Esporta','Ctrl+P':'Stampa','Ctrl+B':'Barra laterale','Ctrl+A':'Seleziona tutto','Ctrl+0':'Adatta','Alt+Invio':'Proprietà','Tab':'tasti di sistema'};
function comboOf(ev){if(['Control','Shift','Alt','Meta','AltGraph'].includes(ev.key))return null;const p=[];if(ev.ctrlKey||ev.metaKey)p.push('Ctrl');if(ev.altKey)p.push('Alt');if(ev.shiftKey)p.push('Maiusc');
  let k=ev.key;if(k===' ')k='Spazio';else if(k.length===1)k=k.toUpperCase();else if(KEY_IT[k])k=KEY_IT[k];p.push(k);return p.join('+');}
function cmdOk(id){const c=CMD[id];return c&&(!c.adv||S.advanced)&&(!c.en||c.en());}
function runCmd(id){const c=CMD[id];if(!c)return;closeMenu();closeQi();if(c.adv&&!S.advanced)return toast('Disponibile in modalità avanzata');if(c.en&&!c.en())return;c.run();}
function toolKey(id){const c=CMD[id];const ck=id==='edit.rename'?'ren':Object.keys(COMBO_CMD).find(a=>COMBO_CMD[a]===id);if(ck)return S.combos[ck];if(c.tool&&S.keys[c.tool])return S.keys[c.tool].toUpperCase();return c.k||'';}
function menuItems(list){return list.filter(id=>id==='-'||!CMD[id].adv||S.advanced).map(id=>id==='-'?'<div class="msep"></div>':id.startsWith('#')?`<div class="mh">${esc(id.slice(1))}</div>`:
  `<button class="mi" data-cmd="${id}"${cmdOk(id)?'':' disabled'}><span></span><span>${esc(CMD[id].l)}</span><kbd>${esc(toolKey(id))}</kbd></button>`).join('').replace(/^(<div class="msep"><\/div>)+|(<div class="msep"><\/div>)+$/g,'').replace(/(<div class="msep"><\/div>){2,}/g,'<div class="msep"></div>');}
const menu=$('#menu');let menuFor=null;
function openMenu(html,x,y,owner){menu.innerHTML=html;menu.hidden=false;menuFor=owner||null;
  const r=menu.getBoundingClientRect();menu.style.left=Math.max(4,Math.min(x,window.innerWidth-r.width-4))+'px';menu.style.top=Math.max(4,Math.min(y,window.innerHeight-r.height-4))+'px';
  document.querySelectorAll('.mb').forEach(b=>b.classList.toggle('open',b===owner));}
function closeMenu(){menu.hidden=true;menuFor=null;document.querySelectorAll('.mb.open').forEach(b=>b.classList.remove('open'));}
function openBarMenu(b){const k=b.dataset.menu;const r=b.getBoundingClientRect();
  const list=k==='all'?Object.keys(MENUS).flatMap((m,i)=>[...(i?['-']:[]),'#'+MTITLE[m],...MENUS[m]]):MENUS[k];
  openMenu(menuItems(list),r.left,r.bottom+2,b);}
$('#menubar').addEventListener('click',ev=>{const b=ev.target.closest('[data-menu]');if(!b)return;if(menuFor===b)closeMenu();else openBarMenu(b);});
$('#menubar').addEventListener('pointerover',ev=>{const b=ev.target.closest('[data-menu]');if(b&&menuFor&&menuFor!==b&&!menu.hidden)openBarMenu(b);});
document.addEventListener('pointerdown',ev=>{if(!menu.hidden&&!ev.target.closest('#menu')&&!ev.target.closest('[data-menu]'))closeMenu();
  if(!qi.hidden&&!ev.target.closest('#qi')&&!ev.target.closest('#cc'))closeQi();},true);
document.addEventListener('click',ev=>{const c=ev.target.closest('[data-cmd]');if(c&&!c.disabled){ev.preventDefault();runCmd(c.dataset.cmd);return;}
  const v=ev.target.closest('.ab[data-view]');if(v){showView(v.dataset.view);return;}
  const gh=ev.target.closest('.group>.ghead');if(gh){gh.parentElement.classList.toggle('closed');return;}
  const go=ev.target.closest('.sidebar [data-go]');if(go){const id=go.dataset.go;if(get(id)){sel=new Set([id]);if(isMobile())ui.side=false;if(!ui.panel&&!isMobile())ui.panel=true;applyUi();render();centerOn(id);}}
});
function centerOn(id){const o=get(id);if(!o)return;let x=o.x,y=o.y;if(kind(id)==='a'){const g=attrGeo(o);if(g){x=g.P[0];y=g.P[1];}}
  if(x==null||y==null)return;const s=toScreen(x,y);const r=cv.getBoundingClientRect();
  if(s[0]<r.left+40||s[0]>r.right-40||s[1]<r.top+40||s[1]>r.bottom-40){V.x+=r.left+r.width/2-s[0];V.y+=r.top+r.height/2-s[1];renderCanvas();}}
$('#statusbar').addEventListener('click',ev=>{const b=ev.target.closest('[data-z]');if(!b)return;if(b.dataset.z==='fit')fitView();else runCmd(b.dataset.z==='+'?'zoom.in':'zoom.out');});

/* --- menu contestuale --- */
let ctxPt=null;
cv.addEventListener('contextmenu',ev=>{ev.preventDefault();if(edState)endRename(true);closePop();
  const g=ev.target.closest('[data-id]');ctxPt=[ev.clientX,ev.clientY];let list;
  if(g){const id=g.dataset.id;if(!sel.has(id)){sel=new Set([id]);render();}const k=kind(id);
    list=[...(ui.panel?[]:['ctx.props']),'edit.rename','-'];
    if(k==='e'&&sel.size===1)list.push('ctx.simple','ctx.key','ctx.comp','ctx.multi','ctx.note','-');
    if(k==='l'&&sel.size===1)list.push('ctx.card','-');
    list.push('edit.cut','edit.copy','edit.dup','edit.delete');
    if(sel.size>1)list.push('-','align.l','align.cx','align.t','align.cy','align.dh','align.dv');}
  else list=['ctx.ent','ctx.rel','ctx.note','-','edit.paste','edit.all','-','edit.arrange','zoom.fit'];
  openMenu(menuItems(list),ev.clientX,ev.clientY);});
Object.assign(CMD,{
  'ctx.ent':{l:'Nuova entità qui',c:'Inserisci',run:()=>toolDrop('ent',...ctxPt)},
  'ctx.rel':{l:'Nuova associazione qui',c:'Inserisci',run:()=>toolDrop('rel',...ctxPt)},
  'ctx.note':{l:'Commento qui',c:'Inserisci',run:()=>{const one=[...sel][0];if(one&&ctxPt&&kind(one)==='e'){commit();const o=get(one);const n=addNote(o.x+eSize(o).w/2+60,o.y-50,one);sel=new Set([n.id]);changed();startRename(n.id);}else toolDrop('note',...ctxPt);}},
  'ctx.simple':{l:'Aggiungi attributo semplice',c:'Inserisci',run:()=>toolClick('simple')},
  'ctx.key':{l:'Aggiungi chiave',c:'Inserisci',run:()=>toolClick('key')},
  'ctx.comp':{l:'Aggiungi attributo composto',c:'Inserisci',run:()=>toolClick('comp')},
  'ctx.multi':{l:'Aggiungi attributo multivalore',c:'Inserisci',run:()=>toolClick('multi')},
  'ctx.props':{l:'Proprietà',c:'Visualizza',k:'Alt+Invio',run:()=>{setPanel(true);requestAnimationFrame(()=>{const f=$('#panel input,#panel textarea');if(f)f.focus();});}},
  'ctx.card':{l:'Molteplicità e partecipazione…',c:'Modifica',run:()=>{openLinkPop([...sel][0],ctxPt[0],ctxPt[1]);}}
});
['ctx.ent','ctx.rel','ctx.note','ctx.simple','ctx.key','ctx.comp','ctx.multi','ctx.card'].forEach(k=>CMD[k].hidden=1);

/* --- riquadro comandi --- */
const qi=$('#qi'),qiIn=$('#qiIn'),qiList=$('#qiList');let qiAct=0,qiRes=[];
function openQi(){closeMenu();qi.hidden=false;qiIn.value='';qiAct=0;renderQi();qiIn.focus();}
function closeQi(){qi.hidden=true;}
function renderQi(){const q=qiIn.value.toLowerCase().replace(/^>\s*/,'').trim();
  qiRes=Object.keys(CMD).filter(id=>!CMD[id].hidden&&(!CMD[id].adv||S.advanced)&&(CMD[id].c+': '+CMD[id].l).toLowerCase().includes(q));
  qiAct=Math.min(qiAct,Math.max(0,qiRes.length-1));
  qiList.innerHTML=qiRes.length?qiRes.map((id,i)=>`<button class="mi${i===qiAct?' act':''}" data-cmd="${id}"${cmdOk(id)?'':' disabled'}><span></span><span><small>${esc(CMD[id].c)}:</small>${esc(CMD[id].l)}</span><kbd>${esc(toolKey(id))}</kbd></button>`).join(''):'<div class="empty">Nessun comando corrispondente</div>';
  const a=qiList.querySelector('.act');if(a)a.scrollIntoView({block:'nearest'});}
qiIn.addEventListener('input',()=>{qiAct=0;renderQi();});
qiIn.addEventListener('keydown',ev=>{ev.stopPropagation();
  if(ev.key==='ArrowDown'){ev.preventDefault();qiAct=Math.min(qiRes.length-1,qiAct+1);renderQi();}
  else if(ev.key==='ArrowUp'){ev.preventDefault();qiAct=Math.max(0,qiAct-1);renderQi();}
  else if(ev.key==='Enter'){ev.preventDefault();const id=qiRes[qiAct];if(id)runCmd(id);}
  else if(ev.key==='Escape'){closeQi();}});
$('#cc').addEventListener('click',ev=>{if(ev.target.closest('input'))return;openQi();});
window.addEventListener('resize',()=>{const L=isMobile()?'m':isMid()?'d':'w';if(L===lastLayout)return;
  if(L==='m'){ui.side=false;ui.panel=false;}else if(L==='d'){ui.side=true;ui.panel=false;}else{ui.side=true;ui.panel=true;}
  lastLayout=L;applyUi();requestAnimationFrame(()=>fitView());});
if(window.ResizeObserver){let rw=0,rh=0;new ResizeObserver(en=>{const r=en[0].contentRect;if(Math.abs(r.width-rw)>40||Math.abs(r.height-rh)>40){const first=rw<50;rw=r.width;rh=r.height;if(first||!sel.size)fitView();else renderCanvas();}}).observe(stage);}


/* --- colonne ridimensionabili --- */
const SASH={side:{min:200,max:520,def:264,v:'--sideW'},panel:{min:240,max:560,def:300,v:'--panelW'}};
const colW={side:264,panel:300};
try{const w=JSON.parse(localStorage.getItem('erstudio-cols')||'null');if(w){colW.side=+w.side||264;colW.panel=+w.panel||300;}}catch(e){}
function setCol(k,w){const c=SASH[k];const other=k==='side'?(ui.panel?colW.panel:0):(ui.side?colW.side:0);
  const max=Math.min(c.max,window.innerWidth-48-other-320);const v=Math.round(Math.max(c.min,Math.min(max,w)));
  colW[k]=v;$('#wb').style.setProperty(c.v,v+'px');return v!==Math.round(w);}
setCol('side',colW.side);setCol('panel',colW.panel);
let sashD=null;
document.querySelectorAll('.sash').forEach(sh=>{
  sh.addEventListener('pointerdown',ev=>{ev.preventDefault();const k=sh.dataset.sash;sashD={k,x:ev.clientX,w:colW[k],el:sh};sh.classList.add('on');document.body.classList.add('sashing');try{sh.setPointerCapture(ev.pointerId);}catch(e){}});
  sh.addEventListener('pointermove',ev=>{if(!sashD)return;const dx=ev.clientX-sashD.x;const stop=setCol(sashD.k,sashD.w+(sashD.k==='side'?dx:-dx));sh.classList.toggle('stop',stop);fitView();});
  const end=()=>{if(!sashD)return;sashD=null;sh.classList.remove('on','stop');document.body.classList.remove('sashing');try{localStorage.setItem('erstudio-cols',JSON.stringify(colW));}catch(e){}};
  sh.addEventListener('pointerup',end);sh.addEventListener('pointercancel',end);
  sh.addEventListener('dblclick',()=>{setCol(sh.dataset.sash,SASH[sh.dataset.sash].def);try{localStorage.setItem('erstudio-cols',JSON.stringify(colW));}catch(e){}fitView();});
});
window.addEventListener('resize',()=>{setCol('side',colW.side);setCol('panel',colW.panel);});

/* ================= avvio ================= */
load();
$('#fileName').value=doc.title;
applySettings();
applyUi();
requestAnimationFrame(()=>{fitView();renderTabs();checkOverflow();});
