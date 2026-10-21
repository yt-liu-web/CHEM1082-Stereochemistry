/* Rotation of a view, rotation about a methyl bond, and a change of
 * configuration are independent operations. No external libraries required. */
(() => {
  'use strict';
  const G = window.DimethylCyclopentane;
  const grid = document.getElementById('molecule-grid');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const colors = { ring:'#738b9a', methyl1:'#389d80', methyl2:'#9a6ac3', H:'#e9eff3' };
  const initialView = () => G.multiply(G.axisAngle([0,1,0],-.20), G.axisAngle([1,0,0],-.88));
  const cards = [];
  let frame = null, lastTime = null;
  const by = (card, selector) => card.element.querySelector(selector);
  const cap = value => value.charAt(0).toUpperCase()+value.slice(1);
  const lerp = (a,b,t) => a.map((v,i)=>v+(b[i]-v)*t);
  function currentModel(card, time=performance.now()) {
    if (!card.motion) return G.buildModel(card.state);
    const {action,start,duration,before}=card.motion;
    let t=Math.min(1,(time-start)/duration);t=t*t*(3-2*t);
    if(action==='break'||action==='switch') return G.buildModel({...card.state,progress:t});
    const target=G.buildModel(card.state),old=G.buildModel(before),map=new Map(old.atoms.map(a=>[a.id,a]));
    return {...target,bonds:t<1?old.bonds:target.bonds,atoms:target.atoms.map(a=>({...a,position:lerp(map.get(a.id).position,a.position,t)}))};
  }
  function requestFrame() { if(frame===null) frame=requestAnimationFrame(tick); }
  function tick(time) {
    frame=null;
    const dt=lastTime===null?0:Math.min((time-lastTime)/1000,.05);lastTime=time;
    let again=false;
    for(const card of cards) {
      if(card.spinning&&!document.hidden) {
        card.state.angles[card.bond]=(card.state.angles[card.bond]+dt*65)%360;
        syncAngle(card);draw(card,time);again=true;
      }
      if(card.motion) {
        if(time-card.motion.start>=card.motion.duration){card.motion=null;sync(card);}
        draw(card,time);again=true;
      }
    }
    if(again&&!document.hidden)requestFrame();else lastTime=null;
  }
  function syncAngle(card) {
    const angle=card.state.angles[card.bond];by(card,'.angle-slider').value=String(angle);by(card,'.angle').textContent=`${Math.round(angle)}°`;
  }
  function structure(card) {
    const svg=by(card,'.structure'), detached=card.state.stage!=='bonded',switched=card.state.stage==='switched';
    const cis=(card.state.configuration==='cis')!==switched;
    const p=[[51,61],[98,61],[113,106],[75,132],[37,106]];
    const line=(a,b,color='currentColor',width=2)=>`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" stroke-width="${width}"/>`;
    const wedge=(a,b,front,color)=>{
      const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy),px=-dy/len,py=dx/len;
      if(front)return `<polygon points="${a} ${b[0]+px*4.7},${b[1]+py*4.7} ${b[0]-px*4.7},${b[1]-py*4.7}" fill="${color}"/>`;
      let out='';for(let j=1;j<=7;j++){const t=j/7,x=a[0]+dx*t,y=a[1]+dy*t,r=t*4.7;out+=line([x+px*r,y+py*r],[x-px*r,y-py*r],color,1.7);}return out;
    };
    const title=detached?'C2 attachment bonds removed; CH3 and H '+(switched?'exchanged':'detached'):`${cap(card.state.configuration)}-1,2-dimethylcyclopentane wedge–dash structure`;
    svg.setAttribute('aria-label',title);
    let out=`<title>${title}</title><g stroke-linecap="round" stroke-linejoin="round">`;
    for(let i=0;i<5;i++)out+=line(p[i],p[(i+1)%5]);
    out+=wedge(p[0],[27,29],true,colors.methyl1);
    if(!detached) {
      out+=wedge(p[1],[120,29],cis,colors.methyl2);
      out+=wedge(p[1],[140,74],!cis,'currentColor');
      out+='<text x="148" y="80" font-size="12" text-anchor="middle" fill="currentColor">H</text>';
    } else {
      // Dotted guide arcs are not bonds; neither attachment is drawn while broken.
      out+=`<text x="121" y="25" font-size="12" text-anchor="middle" fill="${colors.methyl2}">CH₃</text><text x="146" y="78" font-size="12" text-anchor="middle" fill="currentColor">H</text>`;
      out+=`<text x="122" y="39" font-size="9" text-anchor="middle" fill="${colors.methyl2}">face ${cis?'+':'−'}</text><text x="143" y="91" font-size="9" text-anchor="middle" fill="currentColor">face ${cis?'−':'+'}</text>`;
    }
    out+='<text x="44" y="76" font-size="10" fill="currentColor">1</text><text x="91" y="76" font-size="10" fill="currentColor">2</text></g>';
    svg.innerHTML=out;
  }
  function sync(card) {
    const {state}=card,busy=!!card.motion,bonded=state.stage==='bonded';
    const switched=state.stage==='switched',face2=(state.configuration==='cis')!==switched?'+':'−';
    card.element.dataset.configuration=state.configuration;card.element.dataset.stage=state.stage;
    const description=bonded?`${cap(state.configuration)}-1,2-dimethylcyclopentane. The methyl groups are on ${state.configuration==='cis'?'the same face':'opposite faces'} of the ring.`:`C2 attachment bonds are broken. CH₃ and H are ${switched?'exchanged and still detached':'detached and ready to exchange'}.`;
    card.canvas.textContent=description;
    card.canvas.setAttribute('aria-label',`Interactive 3D model of Molecule ${card.element.dataset.molecule}. ${description}`);
    by(card,'.angle').setAttribute('aria-live','off');
    by(card,'.model-name').textContent=bonded?`${cap(state.configuration)}-1,2-dimethylcyclopentane`:'C2 bonds detached';
    by(card,'.relationship').textContent=bonded?(state.configuration==='trans'?'Opposite faces · trans':'Same face · cis'):(switched?'CH₃ and H exchanged':'Ready to exchange CH₃ and H');
    by(card,'.face2-value').textContent=`C2 methyl: face ${face2}${bonded?'':' (detached)'}`;
    const rotate=by(card,'[data-action="rotation"]');rotate.setAttribute('aria-pressed',String(card.rotation));rotate.disabled=!bonded||busy;
    rotate.textContent=card.rotation?'σ rotation enabled':'Enable σ rotation';
    const spin=by(card,'[data-action="spin"]');spin.disabled=!bonded||!card.rotation||busy;spin.textContent=card.spinning?'Pause':'Spin';spin.setAttribute('aria-pressed',String(card.spinning));
    by(card,'.angle-slider').disabled=!card.rotation||!bonded||busy;by(card,'.bond-select').disabled=!bonded||busy;
    for(const [action,enabled] of [['break',bonded],['switch',state.stage==='broken'],['form',switched]]) {
      const button=by(card,`[data-action="${action}"]`);button.disabled=!enabled||busy;button.classList.toggle('next',enabled&&!busy);
    }
    by(card,'.rotation-note').textContent=!bonded?'Form the new bonds before trying σ-bond rotation again.':card.rotation?'Move the slider or press Spin. Watch the marked H move; the methyl carbon stays fixed.':'Enable rotation to unlock the angle slider and Spin button.';
    const text=busy?'Moving the detached groups…':state.stage==='broken'?'Both C2–CH₃ and C2–H bonds are broken. The ring stays intact. Next, switch the two detached groups.':switched?'CH₃ and H have exchanged positions at C2. They are still detached. Form the new bonds to complete the change.':card.completed?`New bonds formed: this model is now ${state.configuration}. Only C2 changed configuration. You can repeat the steps to change it back.`:'Break the two bonds at C2, switch CH₃ with H, then form new bonds to change cis ↔ trans.';
    by(card,'.feedback').textContent=text;by(card,'.step-label').textContent=bonded?(card.completed?'Exchange complete':'Bonds intact'):switched?'Step 2 of 3 complete':'Step 1 of 3 complete';
    by(card,'[data-action="all-h"]').setAttribute('aria-pressed',String(card.allH));
    syncAngle(card);structure(card);draw(card);
  }
  function draw(card,time) {
    const canvas=card.canvas,rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height;
    if(!w||!h)return;
    const dpr=Math.min(devicePixelRatio||1,2);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const dark=matchMedia('(prefers-color-scheme: dark)').matches,ink=dark?'#dce9f1':'#234350';
    const model=currentModel(card,time),scale=Math.min(w/8.8,h/7.5),cx=w/2,cy=h*.55;
    const project=position=>{const v=G.rotate(card.q,position),perspective=1/(1-v[2]*.055);return {x:cx+v[0]*scale*perspective,y:cy-v[1]*scale*perspective,z:v[2],perspective};};
    function line(a,b,width,color,dashed=false){ctx.beginPath();ctx.setLineDash(dashed?[4,4]:[]);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.stroke();ctx.setLineDash([]);}
    const plane=model.ring.map(v=>project(G.scale(v,1.35)));
    ctx.beginPath();plane.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=dark?'#6b9ab21a':'#c5dce84d';ctx.fill();ctx.strokeStyle=dark?'#587385':'#adc5d2';ctx.setLineDash([4,5]);ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
    const face=project([0,-.35,1.75]);ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillStyle=dark?'#90aeba':'#617f8e';ctx.fillText('face +',face.x,face.y);
    const back=project([0,-.35,-1.75]);ctx.fillText('face −',back.x,back.y);
    const shown=model.atoms.filter(a=>card.allH||!/^ring[345]-h/.test(a.id));
    const nodes=shown.map(a=>({...a,...project(a.position)})),nodesById=new Map(nodes.map(a=>[a.id,a]));
    const pieces=[];
    for(const bond of model.bonds) {
      const a=nodesById.get(bond.a),b=nodesById.get(bond.b);if(!a||!b)continue;
      const active=bond.kind==='methyl-axis'&&bond.b===`methyl${card.bond+1}`;
      const color=active?(card.bond===0?'#389d80':'#9a6ac3'):bond.kind==='ring'?(dark?'#a4b8c4':'#8ca1ac'):(dark?'#899ba8':'#afbec7');
      for(let i=0;i<12;i++){
        const p=project(lerp(a.position,b.position,i/12)),q=project(lerp(a.position,b.position,(i+1)/12));
        pieces.push({z:(p.z+q.z)/2,type:'bond',p,q,color,width:active?7:bond.kind==='ring'?6:4.3});
      }
    }
    nodes.forEach(n=>pieces.push({z:n.z,type:'atom',n}));pieces.sort((a,b)=>a.z-b.z);
    for(const item of pieces) {
      if(item.type==='bond'){line(item.p,item.q,item.width,item.color);continue;}
      const n=item.n,r=(n.element==='H'?.13:.235)*scale*n.perspective;
      n.r=r;
      const color=n.element==='H'?colors.H:colors[n.group]||colors.ring;
      const gradient=ctx.createRadialGradient(n.x-r*.35,n.y-r*.4,0,n.x,n.y,r);
      gradient.addColorStop(0,'#fff');gradient.addColorStop(.32,color);gradient.addColorStop(1,n.element==='H'?'#bacbd4':color);
      ctx.beginPath();ctx.arc(n.x,n.y,r,0,Math.PI*2);ctx.fillStyle=gradient;ctx.fill();ctx.lineWidth=1;ctx.strokeStyle=dark?'#ccd9df':'#6d8795';ctx.stroke();
      if(n.id==='ring1'||n.id==='ring2') {ctx.font=`600 ${Math.max(10,scale*.23)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#102a39';ctx.fillText(n.label,n.x,n.y);ctx.textBaseline='alphabetic';}
      if(n.id===`methyl${card.bond+1}-h1`){ctx.beginPath();ctx.arc(n.x,n.y,2.8,0,Math.PI*2);ctx.fillStyle='#bd7013';ctx.fill();}
    }
    // Place group labels outside the atoms, with short leaders to retain identity.
    const labels=nodes.filter(n=>['methyl1','methyl2','ring2-h'].includes(n.id));
    const occupied=[];
    for(const n of labels){
      const text=n.id==='ring2-h'?'H at C2':n.id==='methyl1'?'CH₃ at C1':'CH₃ at C2';
      ctx.font='600 12px system-ui';const tw=ctx.measureText(text).width;
      let best=null;
      for(const dist of [24,39,54])for(let i=0;i<16;i++){
        const angle=i*Math.PI/8,x=Math.max(tw/2+7,Math.min(w-tw/2-7,n.x+Math.cos(angle)*dist)),y=Math.max(16,Math.min(h-12,n.y+Math.sin(angle)*dist));
        let score=dist*dist;
        for(const p of nodes) {const dx=Math.max(0,Math.abs(p.x-x)-tw/2),dy=Math.max(0,Math.abs(p.y-y)-8);score+=Math.max(0,(p.r||7)+5-Math.hypot(dx,dy))**2*180;}
        for(const p of occupied)if(Math.abs(x-p.x)<(tw+p.tw)/2+4&&Math.abs(y-p.y)<20)score+=50000;
        if(!best||score<best.score)best={x,y,tw,score};
      }
      occupied.push(best);line(n,best,1,dark?'#7f99a9':'#8da4b2');
      ctx.fillStyle=dark?'#1b242bea':'#fafcfdeb';ctx.fillRect(best.x-tw/2-3,best.y-10,tw+6,18);
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=ink;ctx.fillText(text,best.x,best.y);ctx.textBaseline='alphabetic';
    }
    card.element.dataset.methylFace=card.state.configuration==='cis'?'same':'opposite';
  }
  function act(card,action) {
    if(action==='reset') {
      card.state=G.transition(card.state,'reset');card.q=initialView();card.motion=null;card.rotation=false;card.spinning=false;card.completed=false;card.bond=1;card.allH=false;by(card,'.bond-select').value='1';sync(card);return;
    }
    if(['oblique','top','edge','all-h'].includes(action)) {
      if(action==='oblique')card.q=initialView();if(action==='top')card.q=G.identity();if(action==='edge')card.q=G.axisAngle([1,0,0],-Math.PI/2);if(action==='all-h')card.allH=!card.allH;sync(card);return;
    }
    if(card.motion)return;
    if(action==='rotation'&&card.state.stage==='bonded'){card.rotation=!card.rotation;if(!card.rotation)card.spinning=false;sync(card);return;}
    if(action==='spin'&&card.rotation&&card.state.stage==='bonded'){card.spinning=!card.spinning;sync(card);if(card.spinning)requestFrame();return;}
    if(!['break','switch','form'].includes(action))return;
    const before=card.state,next=G.transition(before,action);if(before===next)return;
    card.state=next;card.spinning=false;card.rotation=false;
    if(action==='form')card.completed=true;
    if(!reducedMotion.matches)card.motion={action,before,start:performance.now(),duration:action==='switch'?1100:650};
    sync(card);if(card.motion)requestFrame();
  }
  for(const [i,configuration] of ['trans','cis'].entries()) {
    const id=i===0?'A':'B',element=document.createElement('section');element.className='molecule';element.dataset.molecule=id;element.setAttribute('aria-labelledby',`heading-${id}`);
    element.innerHTML=`<div class="model-header"><h2 id="heading-${id}">Molecule ${id}</h2><span class="badge">Starts ${configuration}</span></div>
      <div class="figure-row"><svg class="structure" viewBox="0 0 165 145" role="img"></svg><div class="face-readout"><p class="model-name"></p><p class="face1">C1 methyl: face +</p><p class="face2 face2-value"></p><p class="relationship"></p></div></div>
      <div class="stage"><div class="viewer-tools" role="group" aria-label="Molecule ${id} view"><button type="button" data-action="oblique">3D view</button><button type="button" data-action="top">Top view</button><button type="button" data-action="edge">Edge view</button><button type="button" data-action="all-h" aria-pressed="false">Show all H</button></div><canvas class="model-canvas" tabindex="0" role="img" aria-label="Interactive 3D model of Molecule ${id}" aria-describedby="hint-${id}">3D model of ${configuration}-1,2-dimethylcyclopentane. The methyl groups are on ${configuration==='cis'?'the same':'opposite'} ring faces.</canvas><p class="drag-hint" id="hint-${id}">Drag or use arrow keys to turn the whole model · Shift + arrows to roll</p></div>
      <div class="legend"><span class="face1">C1 methyl</span><span class="face2">C2 methyl</span><span>Ring carbons</span></div>
      <div class="controls"><h3>Try rotating a C–CH₃ σ bond</h3><div class="rotation-row"><label for="bond-${id}">Bond</label><select class="bond-select" id="bond-${id}"><option value="0">C1–CH₃ (green)</option><option value="1" selected>C2–CH₃ (purple)</option></select><button type="button" class="rotation-toggle" data-action="rotation" aria-pressed="false">Enable σ rotation</button><button type="button" data-action="spin" aria-pressed="false" disabled>Spin</button></div><div class="slider-row"><input type="range" class="angle-slider" min="0" max="360" step="1" value="0" disabled aria-label="Molecule ${id}: selected methyl bond rotation angle"><output class="angle">0°</output></div><p class="rotation-note"></p>
      <div class="conversion"><h3>Exchange CH₃ and H at C2</h3><div class="sequence"><button type="button" data-action="break">1. Break bonds</button><button type="button" data-action="switch" disabled>2. Switch positions</button><button type="button" data-action="form" disabled>3. Form bonds</button></div><p class="feedback" aria-live="polite" aria-atomic="true"></p><div class="reset-row"><span class="step-label"></span><button type="button" data-action="reset">Reset molecule ${id}</button></div></div></div>`;
    grid.append(element);
    const card={element,canvas:element.querySelector('canvas'),state:G.createState(configuration),q:initialView(),bond:1,rotation:false,spinning:false,allH:false,motion:null,completed:false};cards.push(card);
    element.addEventListener('click',event=>{const button=event.target.closest('button[data-action]');if(button&&!button.disabled)act(card,button.dataset.action);});
    by(card,'.bond-select').addEventListener('change',event=>{card.bond=Number(event.target.value);sync(card);});
    by(card,'.angle-slider').addEventListener('input',event=>{if(!card.rotation||card.state.stage!=='bonded'||card.motion)return;card.spinning=false;card.state.angles[card.bond]=Number(event.target.value);sync(card);});
    let drag=null;
    card.canvas.addEventListener('pointerdown',event=>{if(event.button!==0)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY};card.canvas.setPointerCapture(event.pointerId);card.canvas.focus({preventScroll:true});});
    card.canvas.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;drag.x=event.clientX;drag.y=event.clientY;card.q=G.multiply(G.multiply(G.axisAngle([0,1,0],dx*.012),G.axisAngle([1,0,0],dy*.012)),card.q);draw(card);});
    const end=event=>{if(drag?.id===event.pointerId)drag=null;};for(const type of ['pointerup','pointercancel','lostpointercapture'])card.canvas.addEventListener(type,end);
    card.canvas.addEventListener('keydown',event=>{const directions={ArrowLeft:-1,ArrowRight:1,ArrowUp:-1,ArrowDown:1};if(!(event.key in directions))return;event.preventDefault();const axis=event.shiftKey?[0,0,1]:['ArrowLeft','ArrowRight'].includes(event.key)?[0,1,0]:[1,0,0];card.q=G.multiply(G.axisAngle(axis,directions[event.key]*Math.PI/12),card.q);draw(card);});
    new ResizeObserver(()=>draw(card)).observe(card.canvas);sync(card);
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>cards.forEach(c=>draw(c)));
  document.addEventListener('visibilitychange',()=>{lastTime=null;if(!document.hidden&&cards.some(c=>c.spinning||c.motion))requestFrame();});
})();
