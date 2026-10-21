/* Idealized 1,2-dimethylcyclopentane teaching geometry, in angstrom-like units.
 * The ring is drawn planar to define its two faces clearly; real cyclopentane
 * is puckered. This is a stereochemical model, not an energy calculation.
 * +z is the upper ring face. Quaternions are [x,y,z,w]; multiply(a,b) applies b first.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DimethylCyclopentane = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const EPS = 1e-12, CC = 1.54, CH = 1.09, GAP = 0.82;
  const add = (a,b) => a.map((v,i) => v+b[i]);
  const subtract = (a,b) => a.map((v,i) => v-b[i]);
  const scale = (v,k) => v.map(x => x*k);
  const dot = (a,b) => a.reduce((s,x,i) => s+x*b[i],0);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const length = v => Math.hypot(...v);
  function unit(v) {
    const n = length(v);
    if (!Number.isFinite(n) || n < EPS) throw new RangeError('Direction must be finite and nonzero.');
    return scale(v,1/n);
  }
  const identity = () => [0,0,0,1];
  function normalize(q) {
    const n = Math.hypot(...q);
    return Number.isFinite(n) && n>EPS ? q.map(x => x/n) : identity();
  }
  function axisAngle(axis,radians) {
    const a=unit(axis),s=Math.sin(radians/2);
    return [...scale(a,s),Math.cos(radians/2)];
  }
  function multiply(a,b) {
    return normalize([
      a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
      a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
      a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
      a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]
    ]);
  }
  function rotate(quaternion,position) {
    const q=normalize(quaternion),u=q.slice(0,3),t=scale(cross(u,position),2),c=cross(u,t);
    return position.map((x,i) => x+q[3]*t[i]+c[i]);
  }
  const opposite = configuration => configuration==='trans' ? 'cis' : 'trans';
  function validateConfiguration(configuration) {
    if (!['trans','cis'].includes(configuration)) throw new RangeError('Configuration must be trans or cis.');
  }
  function createState(configuration='trans') {
    validateConfiguration(configuration);
    return {initialConfiguration:configuration,configuration,stage:'bonded',angles:[0,0]};
  }
  // Invalid or out-of-order operations are inert, including a switch while bonded.
  // The stable cis/trans identity changes only after the new bonds are formed.
  function transition(state,action) {
    if (action==='reset') return createState(state.initialConfiguration);
    if (action==='break' && state.stage==='bonded') return {...state,stage:'broken'};
    if (action==='switch' && state.stage==='broken') return {...state,stage:'switched'};
    if (action==='form' && state.stage==='switched') return {...state,stage:'bonded',configuration:opposite(state.configuration)};
    return state;
  }
  function buildModel({configuration='trans',angles=[0,0],stage='bonded',progress=1}={}) {
    validateConfiguration(configuration);
    if (!['bonded','broken','switched'].includes(stage)) throw new RangeError('Unknown model stage.');
    if (!Array.isArray(angles) || angles.length!==2 || !angles.every(Number.isFinite)) throw new RangeError('Supply two finite methyl angles in degrees.');
    if (!Number.isFinite(progress)) throw new RangeError('Progress must be finite.');
    const p=Math.max(0,Math.min(1,progress)),atoms=[],bonds=[];
    const radius=CC/(2*Math.sin(Math.PI/5));
    const ring=Array.from({length:5},(_,i) => {
      const t=(126-i*72)*Math.PI/180;
      return [radius*Math.cos(t),radius*Math.sin(t),0];
    });
    const atom=(id,element,position,metadata={}) => atoms.push({id,element,position,...metadata});
    const bond=(a,b,metadata={}) => bonds.push({a,b,...metadata});
    ring.forEach((position,i) => {
      atom(`ring${i+1}`,'C',position,{group:'ring',label:`C${i+1}`});
      bond(`ring${i+1}`,`ring${(i+1)%5+1}`,{kind:'ring'});
    });
    for (let i=0;i<5;i++) {
      const number=i+1,center=ring[i],radial=unit([center[0],center[1],0]);
      const direction=sign => add(scale(radial,Math.sqrt(1/3)),[0,0,sign*Math.sqrt(2/3)]);
      if (i>=2) {
        for (const [j,sign] of [1,-1].entries()) {
          const id=`ring${number}-h${j+1}`;
          atom(id,'H',add(center,scale(direction(sign),CH)),{group:'ring'});
          bond(`ring${number}`,id);
        }
        continue;
      }
      const selected=i===1,detached=selected && stage!=='bonded';
      const sign=i===0 || configuration==='cis' ? 1 : -1;
      let methylAxis=direction(sign),hydrogenAxis=direction(-sign);
      // During a detached switch, rotate the two attachment directions about
      // their outward bisector. They never pass through each other or the ring.
      if (selected && stage==='switched') {
        const exchange=axisAngle(radial,Math.PI*p);
        methylAxis=rotate(exchange,methylAxis);
        hydrogenAxis=rotate(exchange,hydrogenAxis);
      }
      const gap=detached ? GAP*(stage==='broken'?p:1) : 0;
      const methylId=`methyl${number}`,hId=`ring${number}-h`;
      const methylCenter=add(center,scale(methylAxis,CC+gap));
      atom(methylId,'C',methylCenter,{group:methylId,label:'CH₃',selected,detached});
      atom(hId,'H',add(center,scale(hydrogenAxis,CH+gap)),{group:'ring',label:'H',selected,detached});
      if (!detached) {
        bond(`ring${number}`,methylId,{selected,kind:'methyl-axis'});
        bond(`ring${number}`,hId,{selected,kind:'stereocenter-hydrogen'});
      }
      // The three C-H bonds form a tetrahedron with the fixed C-C axis.
      // Spin only these H atoms: the methyl carbon is exactly angle-independent.
      const tangent=unit(cross([0,0,1],methylAxis));
      const other=unit(cross(methylAxis,tangent));
      for (let j=0;j<3;j++) {
        const theta=(angles[i]+j*120)*Math.PI/180;
        const radialH=add(scale(tangent,Math.cos(theta)),scale(other,Math.sin(theta)));
        const hDirection=add(scale(methylAxis,1/3),scale(radialH,Math.sqrt(8/9)));
        const id=`${methylId}-h${j+1}`;
        atom(id,'H',add(methylCenter,scale(hDirection,CH)),{group:methylId,selected,detached,methylHydrogen:j+1});
        bond(methylId,id,{kind:'methyl-hydrogen'});
      }
    }
    return {atoms,bonds,ring,configuration,stage,formula:'C7H14',idealized:true};
  }
  return {buildModel,createState,transition,opposite,CC,CH,GAP,add,subtract,scale,dot,cross,length,unit,identity,normalize,axisAngle,multiply,rotate};
});
