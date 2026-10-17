/* Activity state is local to this page. All molecule motions are rigid rotations. */
(() => {
  'use strict';
  const G = window.BromobutaneRS;
  const key = 'chem1082:bromobutane-rs:v1';
  const stateVersion = 2;
  const grid = document.getElementById('molecule-grid');
  const labels = {br:'Br', ethyl:'CH₂CH₃', methyl:'CH₃', h:'H'};
  const groups = ['ethyl','br','methyl'];
  const initialOrientation = model => model.id==='R' ? G.orientationWithHydrogenAway(model) : G.identity();
  const blank = model => ({q:initialOrientation(model), ranks:{br:'',ethyl:'',methyl:''}, answer:'', checked:false, revealed:false});
  let saved;
  try { saved = JSON.parse(localStorage.getItem(key)); } catch { saved = null; }
  const cards = [];
  function restore(i) {
    const s = [1,stateVersion].includes(saved?.version) && saved.cards?.[i], state = blank(G.models[i]);
    if (!s || typeof s !== 'object') return state;
    // Apply A's revised starting view once to older saved work; retain its answers.
    if ((saved.version===stateVersion || i!==0) && Array.isArray(s.q) && s.q.length === 4 && s.q.every(Number.isFinite) && Math.hypot(...s.q)>1e-9) state.q=G.normalize(s.q);
    for (const id of groups) if (['','1','2','3'].includes(s.ranks?.[id])) state.ranks[id]=s.ranks[id];
    if (['','R','S'].includes(s.answer)) state.answer=s.answer;
    state.checked=s.checked===true; state.revealed=s.revealed===true;
    return state;
  }
  function save() { try { localStorage.setItem(key,JSON.stringify({version:stateVersion,cards:cards.map(c=>c.state)})); } catch { /* Browsing without storage still supports the activity. */ } }
  function invalidate(card) { card.state.checked=false;card.state.revealed=false; feedback(card); }
  function applyRotation(card,rotation) { card.state.q=G.multiply(rotation,card.state.q);draw(card);save(); }
  function feedback(card) {
    const {state,model,element}=card, out=element.querySelector('.feedback');
    out.replaceChildren();out.removeAttribute('data-status');
    element.querySelector('.answer-tag').textContent='';
    element.querySelectorAll('select').forEach(s=>s.removeAttribute('aria-invalid'));
    if (!state.checked && !state.revealed) return;
    const values=groups.map(id=>state.ranks[id]);
    const complete=values.every(Boolean), distinct=new Set(values).size===3;
    const count=model.groups.filter(g=>g.id!=='h' && Number(state.ranks[g.id])===g.priority).length;
    const correctAnswer=state.answer===model.answer;
    const say=text=>{const p=document.createElement('p');p.textContent=text;out.append(p);};
    if (state.revealed) {
      out.dataset.status='correct';
      element.querySelector('.answer-tag').textContent=`(${model.answer})-2-bromobutane`;
      say(`Answer: ${model.answer}. Br is 1, ethyl is 2, methyl is 3, and H is 4.`);
      say('Ethyl and methyl both start with C. Compare the next atoms: (C, H, H) outranks (H, H, H).');
      say(`With H away, 1 → 2 → 3 runs ${model.answer==='R'?'clockwise':'counterclockwise'}.`);
      return;
    }
    if (!complete) say('Choose a priority for each of the three groups.');
    else if (!distinct) say('Use each priority — 1, 2, and 3 — exactly once.');
    else say(`Priorities: ${count}/3 correct.${count===3?' Br > ethyl > methyl > H.':' Compare atomic numbers; for a carbon tie, look at the next attached atoms.'}`);
    if (!state.answer) say('Choose R or S for this molecule.');
    else if (correctAnswer) say(`Configuration: correct — Molecule ${card.letter} is ${model.answer}.`);
    else say('Configuration: not yet. Point H away, then follow 1 → 2 → 3: clockwise is R; counterclockwise is S.');
    const all=complete && distinct && count===3 && correctAnswer;
    out.dataset.status=all?'correct':'incorrect';
    if (all) element.querySelector('.answer-tag').textContent=`(${model.answer})-2-bromobutane`;
    for (const id of groups) element.querySelector(`[data-rank="${id}"]`).setAttribute('aria-invalid',String(Number(state.ranks[id])!==model.groups.find(g=>g.id===id).priority));
    element.querySelector('[data-answer]').setAttribute('aria-invalid',String(!correctAnswer));
  }
  function sync(card) {
    for (const id of groups) card.element.querySelector(`[data-rank="${id}"]`).value=card.state.ranks[id];
    card.element.querySelector('[data-answer]').value=card.state.answer;
    feedback(card);draw(card);
  }
  function draw(card) {
    const {canvas,state,model}=card, rect=canvas.getBoundingClientRect();
    if (!rect.width) return;
    const dpr=Math.min(window.devicePixelRatio||1,2), w=rect.width,h=rect.height;
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    // Resolve CSS light-dark tokens via the element's computed colors.
    const fg=getComputedStyle(document.body).color, background=getComputedStyle(document.body).backgroundColor;
    const dark=matchMedia('(prefers-color-scheme: dark)').matches;
    const scale=Math.min(w/5.7,69), cx=w/2, cy=h/2-5;
    const nodes=G.transformedGroups(model,state.q).map(g=>{const [x,y,z]=g.position, perspective=1/(1-z*.10);return {...g,x:cx+x*scale*perspective,y:cy-y*scale*perspective,z,r:(g.id==='h'?16:22)*perspective};});
    const hydrogen=nodes.find(n=>n.id==='h'), away=hydrogen.z/model.bondLength < -.96;
    const status=card.element.querySelector('.orientation');
    const direction=hydrogen.z/model.bondLength;
    status.textContent=away?'H points directly away · follow 1 → 2 → 3':direction<-.15?'H is behind C2':direction>.15?'H points toward you':'H is nearly in the screen plane';
    status.dataset.away=String(away);card.element.dataset.hydrogenZ=direction.toFixed(5);card.element.dataset.orientation=state.q.join(',');
    const bond=(x1,y1,x2,y2,width,color,dashed=false)=>{ctx.beginPath();ctx.setLineDash(dashed?[4,4]:[]);ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.lineWidth=width;ctx.strokeStyle=color;ctx.lineCap='round';ctx.stroke();ctx.setLineDash([]);};
    if (state.revealed && away) {
      const sequence=nodes.filter(n=>n.id!=='h').sort((a,b)=>a.priority-b.priority);
      for(let i=0;i<2;i++) {
        const a=sequence[i],b=sequence[i+1],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;
        const ax=a.x+ux*29,ay=a.y+uy*29,bx=b.x-ux*29,by=b.y-uy*29;
        bond(ax,ay,bx,by,2,dark?'#75c6e0':'#3d849c',true);
        ctx.fillStyle=dark?'#75c6e0':'#3d849c';ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx-ux*9+uy*4,by-uy*9-ux*4);ctx.lineTo(bx-ux*9-uy*4,by-uy*9+ux*4);ctx.fill();
      }
    }
    function sphere(n) {
      const color=n.color||'#7d8b94', grad=ctx.createRadialGradient(n.x-n.r*.35,n.y-n.r*.4,n.r*.05,n.x,n.y,n.r);
      grad.addColorStop(0,'#ffffff');grad.addColorStop(.36,color);grad.addColorStop(1,n.id==='h'?'#aab3bc':color);
      ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);ctx.fillStyle=grad;ctx.fill();ctx.lineWidth=1.4;ctx.strokeStyle=dark?'#a9b7c0':'#677c89';ctx.stroke();
      if(n.id==='center'){ctx.font='600 13px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.strokeStyle='#314451';ctx.lineWidth=3;ctx.strokeText('C2',n.x,n.y);ctx.fillText('C2',n.x,n.y);}
    }
    const sorted=[...nodes,{id:'center',x:cx,y:cy,z:0,r:20,color:'#6e7b85'}].sort((a,b)=>a.z-b.z);
    function groupBond(n) {
      const dx=n.x-cx,dy=n.y-cy,len=Math.hypot(dx,dy);
      if(len<23)return; // H directly behind C2 has no visible projected bond.
      const sx=cx+dx/len*19,sy=cy+dy/len*19;
      bond(sx,sy,n.x,n.y,8,dark?'#8799a4':'#9baab4');
      bond(sx-1,sy-1,n.x-1,n.y-1,3,dark?'#adbcc5':'#e5ebef');
    }
    for (const n of nodes.filter(n=>n.z<0)) groupBond(n);
    for (const n of sorted) {
      if(n.z>=0 && n.id!=='center')groupBond(n);
      sphere(n);
    }
    const occupied=[];
    for (const n of nodes) {
      const dx=n.x-cx,dy=n.y-cy,len=Math.hypot(dx,dy), name=labels[n.id],rank=n.id==='h'?'4':state.ranks[n.id]||'?';
      ctx.font='600 15px system-ui';const lw=ctx.measureText(name).width+42,lh=29;
      let lx=n.x+(len>12?dx/len*40:45),ly=n.y+(len>12?dy/len*38:42);
      lx=Math.max(lw/2+3,Math.min(w-lw/2-3,lx));ly=Math.max(20,Math.min(h-20,ly));
      for(let tries=0;tries<7 && occupied.some(o=>Math.abs(o.x-lx)<(o.w+lw)/2+3 && Math.abs(o.y-ly)<31);tries++)ly=Math.max(20,Math.min(h-20,ly+(ly>cy?-32:32)));
      occupied.push({x:lx,y:ly,w:lw});
      bond(n.x,n.y,lx,ly,1,dark?'#92a2ad':'#8a9ba6',n.id==='h'&&away);
      ctx.fillStyle=background;ctx.strokeStyle=dark?'#586b76':'#c1d0d9';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(lx-lw/2,ly-lh/2,lw,lh,6);ctx.fill();ctx.stroke();
      ctx.font='600 15px system-ui';ctx.fillStyle=fg;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(name,lx-lw/2+8,ly);
      ctx.beginPath();ctx.arc(lx+lw/2-14,ly,10,0,Math.PI*2);ctx.fillStyle=dark?'#334e5b':'#e5f0f5';ctx.fill();ctx.fillStyle=fg;ctx.textAlign='center';ctx.font='700 12px system-ui';ctx.fillText(rank,lx+lw/2-14,ly);
    }
  }
  G.models.forEach((model,i)=> {
    const letter=i===0?'A':'B',element=document.createElement('section');element.className='molecule';element.dataset.molecule=letter;element.setAttribute('aria-labelledby',`heading-${letter}`);
    element.innerHTML=`<div class="model-header"><h2 id="heading-${letter}">Molecule ${letter}</h2><span class="answer-tag"></span></div>
      <p class="drag-hint" id="hint-${letter}">Drag to rotate · arrow keys to turn · Shift + arrows to roll</p>
      <canvas class="model-canvas" tabindex="0" aria-label="Rotate Molecule ${letter}" aria-describedby="hint-${letter}">Interactive tetrahedral model of 2-bromobutane.</canvas>
      <p class="orientation"></p><div class="view-buttons"><button type="button" data-action="flip">Flip molecule</button><button type="button" data-action="away">Point H away</button><button type="button" data-action="reset">Reset view</button></div>
      <fieldset><legend>Rank the groups · 1 is highest</legend><div class="rank-list">
      ${groups.map(id=>`<label for="${letter}-${id}"><span class="swatch" style="background:${model.groups.find(g=>g.id===id).color}"></span>${labels[id]} <small>${id==='ethyl'?'ethyl':id==='methyl'?'methyl':'bromine'}</small></label><select id="${letter}-${id}" data-rank="${id}" aria-label="Molecule ${letter}: ${labels[id]} priority"><option value="">—</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select>`).join('')}
      <span class="hydrogen-label"><span class="swatch" style="background:#f0f3f7"></span> H <small>hydrogen</small></span><span class="fixed-rank">4 (lowest)</span></div></fieldset>
      <div class="assignment"><label for="${letter}-answer">Configuration</label><select id="${letter}-answer" data-answer aria-label="Molecule ${letter}: configuration"><option value="">R or S?</option><option value="R">R</option><option value="S">S</option></select></div>
      <div class="actions"><button type="button" class="primary" data-action="check">Check answer</button><button type="button" data-action="reveal">Show answer</button></div><div class="feedback" aria-live="polite" aria-atomic="true"></div>`;
    grid.append(element);
    const card={model,letter,element,state:restore(i),canvas:element.querySelector('canvas')};cards.push(card);
    element.addEventListener('change',e=>{if(e.target.matches('[data-rank]'))card.state.ranks[e.target.dataset.rank]=e.target.value;else if(e.target.matches('[data-answer]'))card.state.answer=e.target.value;else return;invalidate(card);draw(card);save();});
    element.addEventListener('click',e=>{
      const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;
      if(action==='flip')applyRotation(card,G.flip('y'));
      if(action==='away'){card.state.q=G.orientationWithHydrogenAway(model);draw(card);save();}
      if(action==='reset'){card.state.q=initialOrientation(model);draw(card);save();}
      if(action==='check'){card.state.checked=true;card.state.revealed=false;feedback(card);draw(card);save();}
      if(action==='reveal'){for(const group of model.groups)if(group.id!=='h')card.state.ranks[group.id]=String(group.priority);card.state.answer=model.answer;card.state.revealed=true;card.state.checked=false;card.state.q=G.orientationWithHydrogenAway(model);sync(card);save();}
    });
    let drag=null;
    card.canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};card.canvas.setPointerCapture(e.pointerId);card.canvas.focus({preventScroll:true});});
    card.canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;card.state.q=G.multiply(G.multiply(G.axisAngle([0,1,0],dx*.012),G.axisAngle([1,0,0],dy*.012)),card.state.q);draw(card);});
    const end=e=>{if(drag?.id===e.pointerId){drag=null;save();}};
    card.canvas.addEventListener('pointerup',end);card.canvas.addEventListener('pointercancel',end);card.canvas.addEventListener('lostpointercapture',end);
    card.canvas.addEventListener('keydown',e=>{const dirs={ArrowLeft:-1,ArrowRight:1,ArrowUp:-1,ArrowDown:1};if(!(e.key in dirs))return;e.preventDefault();const axis=e.shiftKey?[0,0,1]:e.key==='ArrowLeft'||e.key==='ArrowRight'?[0,1,0]:[1,0,0];applyRotation(card,G.axisAngle(axis,dirs[e.key]*Math.PI/12));});
    new ResizeObserver(()=>draw(card)).observe(card.canvas);sync(card);
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>cards.forEach(draw));
  document.getElementById('start-again').addEventListener('click',()=>{for(const card of cards){card.state=blank(card.model);sync(card);}save();});
  if(saved?.version===1)save();
})();
