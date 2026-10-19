/* Craftstales swipe discovery prototype. No dependencies; works from file://. */
(()=>{
const ALL=window.CT, byId=Object.fromEntries(ALL.map(p=>[p.id,p]));
const $=s=>document.querySelector(s);
const ROOMS={living:'Living room',bedroom:'Bedroom',dining:'Dining',entry:'Entrance','':'Every room'};
const MATW={brass:'antique brass',nickel:'nickel',iron:'hand-punched iron',bone:'bone inlay',wood:'wood',reclaimed:'reclaimed wood',travertine:'travertine',mango:'mango wood'};
const LBL={ai:'Concept image',product:'Product photo'};
const store={get(k,d){try{const v=localStorage.getItem('ct-swipe-'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem('ct-swipe-'+k,JSON.stringify(v))}catch(e){}}};
let S={room:store.get('room',null),board:store.get('board',[]),bought:store.get('bought',[]),resurfaced:store.get('resurfaced',[]),resurf:new Set(),keptAt:{},order:[],w:{},swipes:0,hist:[],noted:false,hinted:store.get('hinted',false)};
/* ---- silent intent signals per piece: dwell ms, profile opens, photos seen, revisits, kept time, last touch ---- */
const SIG=store.get('sig',{});
const sig=id=>SIG[id]||(SIG[id]={d:0,o:0,ph:0,r:0,k:0,l:0});
const saveSig=()=>store.set('sig',SIG);
const touchSig=id=>{sig(id).l=Date.now();saveSig()};
const addDwell=(id,ms)=>{if(id&&ms>0){sig(id).d+=Math.min(ms,30000);saveSig()}};
const STALE=7*864e5; // kept pieces untouched for a week fold into "Earlier"
const rankScore=id=>{const g=sig(id);return Math.min(g.d/1000,40)*.5+g.o*2+g.ph+g.r*3+g.k/1e13};
let topT=null;
const feats=p=>[...p.mat.map(m=>'m:'+m),'s:'+p.shape,...p.rooms.map(r=>'r:'+r),'z:'+p.size,'c:'+p.coll];
const score=p=>feats(p).reduce((a,f)=>a+(S.w[f]||0),0);
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const inr=n=>'₹'+Math.round(n).toLocaleString('en-IN');
const say=t=>{$('#live').textContent=t};

/* ---- ordering: diverse first, learned later ---- */
function initialOrder(){
  const room=S.room; const pool=ALL.filter(p=>!S.board.includes(p.id)&&!S.bought.includes(p.id));
  const fit=pool.filter(p=>!room||p.rooms.includes(room)), rest=pool.filter(p=>room&&!p.rooms.includes(room));
  // round-robin across collections so the first 8 swipes sample every craft
  const rr=list=>{const g={};list.forEach(p=>(g[p.coll]=g[p.coll]||[]).push(p));const ks=Object.keys(g),out=[];let i=0;while(out.length<list.length){const k=ks[i%ks.length];if(g[k].length)out.push(g[k].shift());i++}return out};
  return [...rr(fit),...rr(rest)].map(p=>p.id);
}
function relearn(){
  // sort what is left by learned score; every 5th slot is a wildcard from the bottom half (avoid a taste bubble)
  const left=S.order.slice(); if(left.length<3)return;
  const ranked=left.map(id=>({id,s:score(byId[id])})).sort((a,b)=>b.s-a.s).map(x=>x.id);
  const half=Math.ceil(ranked.length/2), top=ranked.slice(0,half), bot=ranked.slice(half), out=[];
  while(top.length||bot.length){for(let i=0;i<4&&top.length;i++)out.push(top.shift());if(bot.length)out.push(bot.shift())}
  S.order=out;
}
function tasteLine(){
  const m=Object.entries(S.w).filter(([k,v])=>k.startsWith('m:')&&v>0).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([k])=>MATW[k.slice(2)]);
  if(!m.length)return 'Nothing kept yet. <em>Trying something different.</em>';
  return `You lean toward <em>${m.join(' and ')}</em>.`;
}
let toastT;function toast(h,ms=3200){const t=$('#toast');t.innerHTML=h;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),ms)}

/* ---- render ---- */
const deck=$('#deck');
function cardEl(p,behind){
  const el=document.createElement('article'), again=S.resurf.has(p.id);
  el.className='card'+(p.kind==='ai'?' ai':'')+(behind?' behind':'');
  el.dataset.id=p.id; el.setAttribute('aria-label',`${p.name}. ${p.collName}, ${p.type}. ${p.priceText}${p.size==='large'?'. Large piece':''}.`);
  el.innerHTML=`<div class="photo" style="background:${p.bg}"><img src="${p.img}" alt="${esc(p.alt||p.name)}" draggable="false"><span class="tag">${LBL[p.kind]}</span></div>
   <div class="meta">${again?'<p class="again">Still thinking about this?</p>':''}<p class="eyebrow">${esc(p.craft)}${p.fin?' · '+esc(p.fin):''}</p><h2>${esc(p.name)}</h2><p class="line">${esc(p.tagline)}</p>
   <p class="price"><b>${p.priceText}</b>${p.compareText?`<s>${p.compareText}</s>`:''}${p.size==='large'?'<span class="lg">Large piece</span>':''}${again?'<span class="onb">on your Board</span>':''}</p></div>
   <div class="stamp keep">Kept</div><div class="stamp pass">Pass</div>`;
  return el;
}
function render(){
  deck.innerHTML='';
  const [a,b]=S.order;
  if(b)deck.appendChild(cardEl(byId[b],true));
  if(a){const el=cardEl(byId[a],false);deck.appendChild(el);bindDrag(el);if(!topT||topT.id!==a)topT={id:a,t:Date.now()}}
  else deck.appendChild(endCard());
  const n=boardIds().length; $('#count').textContent=n; $('#boardBtn').setAttribute('aria-label',`Open your Board, ${n} kept`);
  $('#undoBtn').disabled=!S.hist.length;
  $('#roomBtn').textContent=ROOMS[S.room||''];
}
function endCard(){const n=boardIds().length,el=document.createElement('div');el.className='endcard';
  el.innerHTML=`<p class="eyebrow">That's every piece for now</p><h2>You've seen them all.</h2><p>${n?`${n} piece${n>1?'s':''} on your Board, whenever you're ready.`:'Nothing kept yet. Have another look?'}</p>${n?'<button class="primary ox" id="endBoard">Open your Board</button>':''}<button class="quiet" id="endAgain">Keep exploring</button>`;
  el.addEventListener('click',e=>{if(e.target.id==='endBoard')openBoard();else if(e.target.id==='endAgain')restart()});return el}
const boardIds=()=>S.board.filter(id=>byId[id]&&!S.bought.includes(id));
function persist(){store.set('board',S.board)}

/* ---- actions ---- */
let busy=false;
function act(kind){
  if(busy)return; const id=S.order[0]; if(!id)return; const p=byId[id];
  const again=S.resurf.has(id);
  S.hist.push({id,kind,w:{...S.w},order:S.order.slice(),board:S.board.slice()});
  if(topT&&topT.id===id)addDwell(id,Date.now()-topT.t);
  if(again){
    if(kind==='keep'){sig(id).r++;touchSig(id)}
    else{S.board=S.board.filter(x=>x!==id);persist()}
  }
  const f=feats(p), d=kind==='keep'?1:kind==='pass'?-.6:.4;
  if(!again)f.forEach(k=>S.w[k]=(S.w[k]||0)+d);
  if(!again&&kind==='keep'&&!S.board.includes(id)){S.board.push(id);persist();sig(id).k=Date.now();touchSig(id);S.keptAt[id]=S.swipes;const b=$('#boardBtn');b.classList.add('pulse');setTimeout(()=>b.classList.remove('pulse'),900)}
  S.order.shift(); S.swipes++;
  if(S.swipes>=2&&!S.hinted){S.hinted=true;store.set('hinted',true);$('#hint').classList.add('off')}
  if(S.swipes===8||(S.swipes>8&&S.swipes%4===0))relearn();
  maybeResurface();
  say(again?(kind==='keep'?`Still on your Board: ${p.name}.`:`Let go of ${p.name}.`):kind==='keep'?`Kept ${p.name}. ${S.board.length} on your Board.`:`Passed ${p.name}.`);
  if(S.swipes===8&&!S.noted){S.noted=true;setTimeout(()=>toast(tasteLine()),420)}
}
/* a kept piece may come back once in the deck: "Still thinking about this?" */
function maybeResurface(){
  if(S.swipes<10||S.swipes%10!==0||S.order.length<2||S.resurf.size>=2)return; // at most two per session, each piece once ever
  const el=boardIds().filter(id=>!S.resurfaced.includes(id)&&!S.order.includes(id)&&(S.keptAt[id]==null||S.swipes-S.keptAt[id]>=8));
  if(!el.length)return; el.sort((a,b)=>rankScore(b)-rankScore(a)); const id=el[0];
  S.order.splice(1,0,id); S.resurf.add(id); S.resurfaced.push(id); store.set('resurfaced',S.resurfaced);
}
function fly(el,kind,dx=0,dy=0){
  busy=true; el.classList.add('anim');
  if(kind==='keep'){el.classList.add('kept');el.querySelector('.stamp.keep').style.opacity=1}
  if(kind==='pass')el.querySelector('.stamp.pass').style.opacity=1;
  const X=kind==='keep'?innerWidth*1.2:-innerWidth*1.2;
  requestAnimationFrame(()=>{el.style.transform=`translate(${X}px,${dy*0.5}px) rotate(${kind==='keep'?16:-16}deg)`;el.style.opacity=.2});
  const nb=deck.querySelector('.card.behind'); if(nb){nb.classList.add('anim');nb.classList.remove('behind')}
  setTimeout(()=>{busy=false;render()},kind==='keep'?420:340);
}
function keep(){const el=deck.querySelector('.card:not(.behind)');if(!el||busy)return;act('keep');fly(el,'keep')}
function pass(){const el=deck.querySelector('.card:not(.behind)');if(!el||busy)return;act('pass');fly(el,'pass')}
function undo(){
  if(busy||!S.hist.length)return; const h=S.hist.pop();
  S.w=h.w; S.order=h.order; S.board=h.board; if(!h.board.includes(h.id))delete S.keptAt[h.id]; S.swipes=Math.max(0,S.swipes-1); persist();
  closeBoard(); render(); say(`Brought back ${byId[h.id].name}.`);
  const el=deck.querySelector('.card:not(.behind)'); if(el){el.style.transform=`translate(${h.kind==='keep'?120:-120}px,0) rotate(${h.kind==='keep'?8:-8}deg)`;el.style.opacity=.4;el.classList.add('anim');requestAnimationFrame(()=>requestAnimationFrame(()=>{el.style.transform='';el.style.opacity=1}))}
}

/* ---- drag: pointer events (touch + mouse) ---- */
function bindDrag(el){
  let x0,y0,dx=0,dy=0,on=false,moved=false;
  const kS=el.querySelector('.stamp.keep'),pS=el.querySelector('.stamp.pass');
  el.addEventListener('pointerdown',e=>{if(busy)return;on=true;moved=false;x0=e.clientX;y0=e.clientY;dx=dy=0;el.setPointerCapture(e.pointerId);el.classList.remove('anim')});
  el.addEventListener('pointermove',e=>{if(!on)return;dx=e.clientX-x0;dy=e.clientY-y0;if(Math.abs(dx)+Math.abs(dy)>6)moved=true;
    el.style.transform=`translate(${dx}px,${Math.min(dy,0)*.5+Math.max(dy,0)*.3}px) rotate(${dx/18}deg)`;
    kS.style.opacity=Math.max(0,Math.min(1,dx/110));pS.style.opacity=Math.max(0,Math.min(1,-dx/110))});
  const end=()=>{if(!on)return;on=false;
    const T=Math.min(110,innerWidth*.26);
    if(dx>T){act('keep');fly(el,'keep',dx,dy)}
    else if(dx<-T){act('pass');fly(el,'pass',dx,dy)}
    else{el.classList.add('anim');el.style.transform='';kS.style.opacity=0;pS.style.opacity=0;
      if(dy<-90&&Math.abs(dx)<T)openPiece(el.dataset.id);
      else if(dy>110&&Math.abs(dx)<T)undo();
      else if(!moved)openPiece(el.dataset.id)}};
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
}

/* ---- profile (dating-app style, opens on tap / swipe up) ---- */
let cur=null, fi=0, prT=0, seen=new Set();
const PR=$('#profile'), SC=$('#prScroll');
function workdays(from,n){const d=new Date(from);let k=0;while(k<n){d.setDate(d.getDate()+1);const w=d.getDay();if(w!==0&&w!==6)k++}return d}
const fmt=d=>d.toLocaleDateString('en-IN',{day:'numeric',month:'short'});
function zone(pin){if(!/^[1-8]\d{5}$/.test(pin))return null;const p2=pin.slice(0,2),p3=+pin.slice(0,3);
  if(p3>=342&&p3<=345||p2==='34'||p2==='30'||p2==='31'||p2==='32'||p2==='33')return {n:'Rajasthan',t:[1,3]};
  if(['11','40','41','56','60','70','50'].includes(p2))return {n:'metro',t:[3,5]};return {n:'rest of India',t:[4,7]}}
function eta(p,pin){const z=zone(pin);if(!z)return null;const big=p.size==='large',d=big?[7,15]:[3,7],now=new Date();
  const l1=workdays(now,d[0]),l2=workdays(now,d[1]),a1=new Date(l1),a2=new Date(l2);a1.setDate(a1.getDate()+z.t[0]);a2.setDate(a2.getDate()+z.t[1]);
  return `Leaves Jodhpur ${fmt(l1)}–${fmt(l2)}${big?', crated':''}. Reaches you about <em>${fmt(a1)} – ${fmt(a2)}</em>. <span style="color:#8a7d70;font-size:12px">Transit days are a sample.</span>`}
const ANS={size:p=>p.h?`About ${p.h} (W × D × H).${p.size==='large'?' A large piece: we call to plan delivery.':''}`:p.diagram?`The last photo shows the measurements.${p.size==='large'?' A large piece: we call to plan delivery.':''}`:`Ask us on WhatsApp 90012 91131 for exact measurements.`,
  made:p=>`${p.craft}, made by hand in Jodhpur.`,see:p=>`Walk into our Jodhpur showroom, open daily 10–7, or ask for a video call on WhatsApp 90012 91131.`};
function showFrame(n){const f=cur.frames;fi=(n+f.length)%f.length;seen.add(fi);const g=sig(cur.id);if(seen.size>g.ph){g.ph=seen.size;saveSig()}
  PR.querySelectorAll('.pr-frames figure').forEach((x,k)=>x.classList.toggle('on',k===fi));
  PR.querySelectorAll('.pr-segs i').forEach((x,k)=>{x.className=k<fi?'done':k===fi?'on':''});
  $('#prLabel').textContent=f[fi].label}
function openPiece(id){
  const p=byId[id]; if(!p)return; if(cur)addDwell(cur.id,Date.now()-prT);
  const g=sig(id); if(g.o>0||S.board.includes(id))g.r++; g.o++; g.l=Date.now(); saveSig();
  cur=p; fi=0; prT=Date.now(); seen=new Set();
  feats(p).forEach(k=>S.w[k]=(S.w[k]||0)+.4);
  $('#prFrames').innerHTML=p.frames.map((f,k)=>`<figure style="background:${f.bg}"><img src="${f.src}" alt="${esc(f.alt||p.name+': '+f.label)}" style="object-fit:${f.label==='Dimensions'?'contain':'cover'}" ${k?'loading="lazy"':''}></figure>`).join('');
  $('#prSegs').innerHTML=p.frames.map(()=>'<i></i>').join('');
  $('#prName').textContent=p.name; $('#prTag').textContent=p.tagline; $('#prEyebrow').textContent=p.craft+(p.fin?' · '+p.fin:'');
  const pt=p.priceText+(p.compareText?` <s>${p.compareText}</s>`:''); $('#prPrice').innerHTML=pt; $('#prHPrice').innerHTML=pt+(p.size==='large'?'<span class="lg">Large piece</span>':''); $('#prYPrice').textContent=p.priceText;
  $('#prBio').textContent=p.bio; $('#prFacts').innerHTML=p.facts.map(f=>`<span>${f}</span>`).join('');
  $('#prPairs').innerHTML=p.pairs.map(o=>`<button data-id="${o}" aria-label="Open ${byId[o].name}"><img src="${byId[o].thumb}" alt="" loading="lazy">${esc(byId[o].name)}<small>${byId[o].priceText}</small></button>`).join('');
  $('#prYImg').style.background=p.bg; $('#prYImg').className='pr-yimg cover';
  $('#prYImgI').src=p.thumb; $('#prYLbl').textContent=LBL[p.kind]; $('#prYName').textContent=p.name;
  $('#prCare').textContent=p.care; $('#prFull').href=`pieces/${p.id}.html`;
  $('#prMore').open=false; $('#prAnswer').textContent=''; PR.querySelectorAll('.pr-ask button').forEach(b=>b.classList.remove('on'));
  const pin=store.get('pin','');$('#prPin').value=pin;$('#prPinRes').innerHTML=pin?eta(p,pin)||'':'';
  syncKeep(); showFrame(0); PR.classList.remove('closing'); PR.hidden=false; SC.scrollTop=0;
  $('#prKeep').focus({preventScroll:true}); say(`${p.name}. ${p.tagline}. Profile open.`);
}
function syncKeep(){const k=$('#prKeep'),on=cur&&S.board.includes(cur.id);k.classList.toggle('done',!!on);k.setAttribute('aria-label',on?'On your Board':'Keep on Board');k.textContent=on?'♥':'♡';
  const l=$('#prLater');l.textContent=on?'♥ On your Board':'♡ Keep for later';l.classList.toggle('done',!!on);
  const others=selIds().filter(x=>x!==cur.id);$('#prBuy').textContent=others.length?`Buy ${others.length+1} pieces · ${total([...others,cur.id])}`:`Buy now · ${cur.priceText}`}
function closePiece(cb){if(PR.hidden){cb&&cb();return}if(cur)addDwell(cur.id,Date.now()-prT);PR.classList.add('closing');setTimeout(()=>{PR.hidden=true;PR.classList.remove('closing');cur=null;if(retBoard){retBoard=false;renderBoard();B.hidden=false}cb&&cb()},cb?260:280)}
function profileDecide(kind){ if(!cur)return; const id=cur.id;
  if(S.order[0]===id){closePiece(()=>kind==='keep'?keep():pass());return}
  if(kind==='keep'&&!S.board.includes(id)){S.board.push(id);persist();sig(id).k=Date.now();touchSig(id);S.keptAt[id]=S.swipes;render();syncKeep();say(`Kept ${cur.name}.`);return}
  if(kind==='keep'){return}
  closePiece();
}
$('#prKeep').onclick=()=>profileDecide('keep'); $('#prPass').onclick=()=>profileDecide('pass');
$('#prClose').onclick=()=>closePiece();
$('#prBuy').onclick=profileBuy;
$('#prLater').onclick=()=>{if(cur&&!S.board.includes(cur.id))profileDecide('keep')};
$('#prAskBtn').onclick=()=>{$('#prMore').open=true;$('#prAskH').scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>PR.querySelector('.pr-ask button').focus({preventScroll:true}),350)};
$('#prPrev').onclick=()=>showFrame(fi-1); $('#prNext').onclick=()=>showFrame(fi+1);
$('#prPairs').onclick=e=>{const b=e.target.closest('button[data-id]');if(b)openPiece(b.dataset.id)};
$('#prAsk').onclick=e=>{const b=e.target.closest('button');if(!b||!cur)return;PR.querySelectorAll('.pr-ask button').forEach(x=>x.classList.toggle('on',x===b));$('#prAnswer').textContent=ANS[b.dataset.q](cur)};
const pinGo=()=>{const v=$('#prPin').value.trim(),r=eta(cur,v);$('#prPinRes').innerHTML=r||'Enter a 6-digit Indian PIN. We ship within India only.';if(r)store.set('pin',v)};
$('#prPinGo').onclick=pinGo; $('#prPin').addEventListener('keydown',e=>{if(e.key==='Enter')pinGo()});
// drag on the hero: swipe down (at top) closes; horizontal swipe steps photos
(()=>{const H=$('#prHero');let x0,y0,on=false,lastPtr=0;
  H.addEventListener('pointerdown',e=>{if(e.target.closest('.pr-close'))return;on=true;x0=e.clientX;y0=e.clientY});
  H.addEventListener('pointermove',e=>{if(!on||SC.scrollTop>0)return;const dy=e.clientY-y0;if(dy>0&&Math.abs(dy)>Math.abs(e.clientX-x0)){PR.style.transform=`translateY(${dy*.6}px)`}});
  const end=e=>{if(!on)return;on=false;lastPtr=Date.now();const dx=e.clientX-x0,dy=e.clientY-y0;PR.style.transform='';
    if(dy>90&&SC.scrollTop<=0&&Math.abs(dy)>Math.abs(dx)){e.preventDefault();closePiece();return}
    if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)){showFrame(fi+(dx<0?1:-1));return}};
  H.addEventListener('pointerup',end);
  // touch fallback: the browser may take over vertical pans (pointercancel), so read touches too
  let t0=null;H.addEventListener('touchstart',e=>{const t=e.touches[0];t0={x:t.clientX,y:t.clientY,top:SC.scrollTop}},{passive:true});
  H.addEventListener('touchend',e=>{if(!t0)return;if(Date.now()-lastPtr<400){t0=null;return}const t=e.changedTouches[0],dx=t.clientX-t0.x,dy=t.clientY-t0.y;
    if(t0.top<=0&&dy>90&&Math.abs(dy)>Math.abs(dx))closePiece();
    else if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))showFrame(fi+(dx<0?1:-1));t0=null},{passive:true});H.addEventListener('pointercancel',()=>{on=false;PR.style.transform=''});
  // edge buttons only respond to real taps (not the end of a drag)
  ['#prPrev','#prNext'].forEach(s=>$(s).addEventListener('click',e=>{if(Math.abs(e.clientX-x0)>12||Math.abs(e.clientY-y0)>12){e.stopImmediatePropagation()}},true));
})();

/* ---- Board: tick what you want, buy together (no gestures) ---- */
const B=$('#board'), RV=$('#review');
let leadId=null, sel=new Set(), selInit=false, snackT, lastRm=null, retBoard=false;
const bgOf=p=>p.bg;
function boardLists(){
  const now=Date.now(), ids=boardIds();
  let act=ids.filter(id=>now-(sig(id).l||sig(id).k||now)<STALE), early=ids.filter(id=>!act.includes(id));
  if(!act.length){act=early;early=[]}
  act.sort((a,b)=>rankScore(b)-rankScore(a));
  return {act,early};
}
function why(id,act){const g=sig(id),p=byId[id];
  if(g.r>=2)return `You came back to this one ${g.r===2?'twice':g.r+' times'}`;
  if(g.ph>=3&&g.ph>=p.frames.length)return 'You looked at every photo of this one';
  if(g.r===1)return 'You came back to this one';
  if(act.length>1&&g.d>3000&&act.every(o=>sig(o).d<=g.d))return 'You spent the longest with this one';
  if(g.o)return 'You opened this one to look closer';
  if(act.every(o=>sig(o).k<=g.k))return 'Your most recent keep';
  return 'On your Board';
}
const selIds=()=>boardIds().filter(id=>sel.has(id));
function tickBtn(id,big){const on=sel.has(id),n=byId[id].name;return `<button class="tick${on?' on':''}${big?' big':''}" data-act="tick" data-id="${id}" role="checkbox" aria-checked="${on}" aria-label="Select ${n}">${on?'✓':''}</button>`}
function rowEl(id){const p=byId[id],on=sel.has(id);
  return `<div class="b-row${on?' sel':''}" data-id="${id}"><button class="b-th cover" data-act="open" data-id="${id}" style="background:${bgOf(p)}" aria-label="Details: ${esc(p.name)}"><img src="${p.thumb}" alt=""></button>
   <div class="b-rt"><p class="b-rn">${esc(p.name)}${p.size==='large'?'<span class="lg">Large piece</span>':''}</p>${p.fin?`<p class="b-fin">${esc(p.fin)}</p>`:''}<p class="b-rp"><span class="b-rpp">${p.priceText}</span><span class="dot">·</span><button class="lnk" data-act="open" data-id="${id}">Details ›</button><span class="dot">·</span><button class="lnk" data-act="remove" data-id="${id}">Remove</button></p></div>${tickBtn(id)}</div>`}
function renderBoard(){
  const {act,early}=boardLists(), lead=act[0], all=[...act,...early];
  if(!selInit&&lead){sel=new Set([lead]);selInit=true}
  B.classList.toggle('is-empty',!lead); $('#bcount').textContent=all.length; leadId=lead||null;
  if(lead){const p=byId[lead],on=sel.has(lead);
    const L=$('#bLead'); L.className='b-lead'+(on?' sel':''); L.style.background=bgOf(p);
    $('#bPic').innerHTML=`<img src="${p.img}" alt="">`; $('#bPic').setAttribute('aria-label',`Details: ${p.name}`);
    $('#bChip').textContent=LBL[p.kind];
    const t=$('#bTick'); t.className='tick big'+(on?' on':''); t.textContent=on?'✓':''; t.setAttribute('aria-checked',on); t.setAttribute('aria-label',`Select ${p.name}`); t.dataset.id=lead;
    $('#bWhy').textContent=act.length===1&&!early.length?'The only piece on your Board':why(lead,act);
    $('#bName').textContent=p.name; $('#bFin').textContent=p.fin||p.craft; $('#bPrice').textContent=p.priceText; $('#bLarge').hidden=p.size!=='large';
    const pr=p.pairs.filter(o=>all.includes(o)&&o!==lead).map(o=>byId[o].name);
    $('#bPairs').hidden=!pr.length; $('#bPairs').innerHTML=pr.length?`<span aria-hidden="true">✦</span> Pairs with ${pr.join(' and ')}, also on your Board`:'';
    $('#bAlso').textContent=act.length>1?`Also kept · ${act.length-1}`:'';
    $('#bList').innerHTML=act.slice(1).map(rowEl).join('');
  }
  const E=$('#bEarlier'); E.hidden=!early.length; $('#bEarlierN').textContent=`Earlier · ${early.length}`; $('#bEarlierList').innerHTML=early.map(rowEl).join('');
  const allOn=all.length>0&&all.every(id=>sel.has(id));
  $('#bAll').textContent=allOn?'Clear all':'Select all'; $('#bAll').hidden=all.length<2; $('#bListHead').hidden=!lead;
  syncBuy();
}
const total=ids=>inr(ids.reduce((a,id)=>a+byId[id].price,0));
function syncBuy(){const ids=selIds(),n=ids.length,big=ids.filter(id=>byId[id].size==='large').length,b=$('#bBuy');
  b.disabled=!n; b.textContent=n?`Buy ${n} piece${n>1?'s':''} · ${total(ids)}`:'Select a piece';
  const note=big?`Includes ${big} large piece${big>1?'s':''}: we'll call to plan ${big>1?'their':'its'} delivery.`:'';
  $('#bNote').textContent=note; $('#bNote').hidden=!note; $('#bSticky').hidden=B.classList.contains('is-empty');
  if(!PR.hidden&&cur)syncKeep();
}
function toggle(id){if(sel.has(id))sel.delete(id);else sel.add(id);renderBoard();const f=B.querySelector(`.tick[data-id="${id}"]`);f&&f.focus({preventScroll:true});const n=selIds().length;say(`${byId[id].name} ${sel.has(id)?'selected':'unselected'}. ${n} selected.`)}
function removePiece(id){const p=byId[id];lastRm={id,board:S.board.slice(),on:sel.has(id)};
  S.board=S.board.filter(x=>x!==id);sel.delete(id);persist();renderBoard();render();
  $('#bSnackT').textContent=`${p.name} removed from your Board.`;$('#bSnack').classList.add('on');clearTimeout(snackT);snackT=setTimeout(hideSnack,6000);
  say(`${p.name} removed. Undo available.`)}
function hideSnack(){$('#bSnack').classList.remove('on')}
$('#bUndo').onclick=()=>{if(!lastRm)return;S.board=lastRm.board;persist();if(lastRm.on)sel.add(lastRm.id);const n=byId[lastRm.id].name;lastRm=null;hideSnack();renderBoard();render();say(`${n} is back.`)};
function boardDetails(id){retBoard=true;B.hidden=true;openPiece(id)}
B.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const id=b.dataset.id;
  if(b.dataset.act==='tick')toggle(id);else if(b.dataset.act==='open')boardDetails(id);else if(b.dataset.act==='remove')removePiece(id)});
$('#bPic').onclick=$('#bDetails').onclick=()=>leadId&&boardDetails(leadId);
$('#bRemove').onclick=()=>leadId&&removePiece(leadId);
$('#bAll').onclick=()=>{const all=boardIds();if(all.every(id=>sel.has(id)))sel.clear();else all.forEach(id=>sel.add(id));renderBoard();say($('#bAll').textContent==='Clear all'?'All selected.':'Selection cleared.')};
function openBoard(){retBoard=false;if(!PR.hidden)closePiece();renderBoard();B.hidden=false;$('#bEarlier').open=false;$('#bclose').focus({preventScroll:true});
  say(leadId?`Your Board. ${byId[leadId].name} first, selected. ${$('#bBuy').textContent}.`:'Your Board is empty.')}
function closeBoard(){B.hidden=true;hideSnack()}
$('#boardBtn').onclick=()=>openBoard();
$('#bclose').onclick=()=>closeBoard();
$('#bBack').onclick=()=>{closeBoard();if(!S.order.length)restart()};
$('#bBuy').onclick=()=>{if(selIds().length)openReview()};
/* ---- order review ---- */
function etaText(p,pin){const r=pin&&eta(p,pin);
  const base=r||`Leaves Jodhpur in ${p.size==='large'?'7–15':'3–7'} business days${p.size==='large'?', crated':''}. Add your PIN for an arrival estimate.`;
  return base+(p.size==='large'?'<br>We\'ll call to plan delivery.':'')}
function renderReview(){const ids=selIds(),pin=store.get('pin',''),big=ids.filter(id=>byId[id].size==='large').length;
  $('#rH').textContent=`${ids.length} piece${ids.length>1?'s':''}`;
  $('#rList').innerHTML=ids.map(id=>{const p=byId[id];return `<div class="r-row"><div class="b-th cover" style="background:${bgOf(p)}"><img src="${p.thumb}" alt=""></div><div class="b-rt"><div class="r-h"><p class="b-rn">${esc(p.name)}${p.fin?`<span class="b-fin">${esc(p.fin)}</span>`:''}</p><span class="b-price">${p.priceText}</span></div><p class="r-eta">${etaText(p,pin)}</p></div></div>`}).join('');
  $('#rPin').value=pin; $('#rPinMsg').textContent='';
  $('#rTotal').textContent=total(ids); $('#rPay').textContent=`Pay · ${total(ids)}`; $('#rNote').textContent=big?`Includes ${big} large piece${big>1?'s':''}: we'll call to plan ${big>1?'their':'its'} delivery.`:''; $('#rNote').hidden=!big; $('#stub').textContent='';
}
function openReview(){retBoard=false;renderReview();B.hidden=true;if(!PR.hidden){PR.hidden=true;cur=null}RV.hidden=false;$('#rBack').focus({preventScroll:true});say(`Review your order: ${$('#rH').textContent}.`)}
$('#rBack').onclick=()=>{RV.hidden=true;openBoard()};
$('#rPinGo').onclick=()=>{const v=$('#rPin').value.trim();if(!zone(v)){$('#rPinMsg').textContent='Enter a 6-digit Indian PIN. We ship within India only.';return}store.set('pin',v);renderReview()};
$('#rPin').addEventListener('keydown',e=>{if(e.key==='Enter')$('#rPinGo').click()});
$('#rPay').onclick=()=>{$('#stub').textContent='Prototype: Pay is a stub. This is where Shopify checkout opens.'};
/* profile "Make it yours": put this piece in the order (keeping anything already ticked) and go to review */
function profileBuy(){if(!cur)return;const id=cur.id;
  if(!S.board.includes(id)){S.board.push(id);persist();sig(id).k=Date.now();touchSig(id);S.keptAt[id]=S.swipes;render()}
  if(!selInit){selInit=true;sel=new Set()} sel.add(id); openReview()}
function restart(){closeBoard();S.order=initialOrder();S.hist=[];S.swipes=0;S.noted=false;S.resurf.clear();if(!S.order.length){S.order=ALL.map(p=>p.id).filter(id=>!S.board.includes(id))}render()}

/* ---- welcome (one tap) ---- */
function start(room){S.room=room;store.set('room',room);if(room)S.w['r:'+room]=2;$('#welcome').hidden=true;S.order=initialOrder();S.hist=[];render();
  if(S.hinted)$('#hint').classList.add('off');
  const want=location.hash.slice(1); if(want&&byId[want]){S.order=[want,...S.order.filter(i=>i!==want)];render();openPiece(want)}}
$('#welcome').addEventListener('click',e=>{const b=e.target.closest('button[data-room]');if(b)start(b.dataset.room)});
$('#roomBtn').onclick=()=>{$('#welcome').hidden=false};

/* ---- buttons + keyboard ---- */
$('#keepBtn').onclick=keep;$('#passBtn').onclick=pass;$('#undoBtn').onclick=undo;
addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea'))return;
  if(e.key==='Escape'){if(!RV.hidden)$('#rBack').click();else if(!PR.hidden)closePiece();else if(!B.hidden)closeBoard();else if(!$('#welcome').hidden&&S.order.length)$('#welcome').hidden=true;return}
  if(!$('#welcome').hidden||!RV.hidden)return;
  if(!PR.hidden){const k=e.key.toLowerCase();
    if(e.key==='ArrowLeft'){e.preventDefault();showFrame(fi-1)}else if(e.key==='ArrowRight'){e.preventDefault();showFrame(fi+1)}
    else if(e.key==='ArrowDown'&&SC.scrollTop<=0&&!e.target.closest('.pr-body')){e.preventDefault();closePiece()}
    else if(k==='k'){profileDecide('keep')}else if(k==='x'){profileDecide('pass')}
    return}
  if(!B.hidden)return;
  const k={ArrowRight:keep,ArrowLeft:pass,ArrowUp:()=>S.order[0]&&openPiece(S.order[0]),ArrowDown:undo}[e.key];
  if(k){e.preventDefault();k()}
  if(e.key==='b'||e.key==='B')openBoard();
});

/* ---- boot ---- */
if(S.room!==null&&!new URLSearchParams(location.search).has('welcome'))start(S.room); else {$('#welcome').hidden=false}
window.__ct={ALL,byId,persist,S,SIG,sig,keep,pass,undo,openPiece,openBoard,renderBoard,boardLists,selIds,sel:()=>sel,relearn,tasteLine,rankScore};
})();
