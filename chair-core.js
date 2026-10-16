/* Ideal tetrahedral cyclohexane chairs, viewed from a fixed perspective.
   C1-C6 identities and the ring's up face are unchanged by a ring flip. */
(function (root) {
  'use strict';
  const BOND_LENGTH = 60, TOLERANCE_DEGREES = 22;
  const elevation = 18 * Math.PI / 180;
  const radius = 165, height = radius / Math.sqrt(32);
  const normalizeVector = (dx, dy, length = BOND_LENGTH) => {
    const size = Math.hypot(dx, dy);
    return Number.isFinite(size) && size > 1e-8 ? {dx: dx / size * length, dy: dy / size * length} : {dx: 0, dy: 0};
  };
  const project = ([x,y,z]) => ({x: 300+x, y:210+y*Math.sin(elevation)-z*Math.cos(elevation)});
  const chairs = [0,1].map(chair => {
    const carbons = [], bonds = [];
    for(let carbon = 0; carbon < 6; carbon++) {
      const angle = carbon*Math.PI/3;
      const axialSign = (carbon%2===0 ? 1 : -1) * (chair===0 ? 1 : -1);
      carbons.push(project([radius*Math.cos(angle),radius*Math.sin(angle),height*axialSign]));
      bonds.push({carbon,type:'axial',face:axialSign>0?'up':'down',dx:0,dy:-axialSign*BOND_LENGTH});
      // Ideal equatorial direction: radial component sqrt(8/9), vertical component +/-1/3.
      const dx = Math.sqrt(8/9)*Math.cos(angle);
      const dy = Math.sqrt(8/9)*Math.sin(angle)*Math.sin(elevation)+axialSign/3*Math.cos(elevation);
      bonds.push({carbon,type:'equatorial',face:axialSign>0?'down':'up',...normalizeVector(dx,dy)});
    }
    return {carbons,bonds};
  });
  function angularError(bond, target) {
    const size = Math.hypot(bond?.dx,bond?.dy)*Math.hypot(target.dx,target.dy);
    if(!Number.isFinite(size) || size < 1e-8) return 180;
    return Math.acos(Math.max(-1,Math.min(1,(bond.dx*target.dx+bond.dy*target.dy)/size)))*180/Math.PI;
  }
  function gradeCarbon(chairIndex, carbonIndex, bonds) {
    const expected = chairs[chairIndex]?.bonds.filter(b=>b.carbon===carbonIndex);
    if(!expected || expected.length!==2 || !Array.isArray(bonds)) return {results:[],complete:false};
    // Match geometry one-to-one, independently of the labels the student chose.
    const errors = bonds.map(b=>expected.map(e=>angularError(b,e)));
    let assignment = [];
    if(bonds.length===1) assignment = [errors[0][0]<=errors[0][1]?0:1];
    if(bonds.length>=2) assignment = errors[0][0]+errors[1][1]<=errors[0][1]+errors[1][0] ? [0,1] : [1,0];
    const results = bonds.map((bond,i)=>{
      const target = expected[assignment[i]??0];
      const geometryCorrect = i<2 && angularError(bond,target)<=TOLERANCE_DEGREES;
      const labelCorrect = bond.type===target.type, faceCorrect = bond.face===target.face;
      const correct = geometryCorrect && labelCorrect && faceCorrect;
      const notes = [];
      if(!geometryCorrect) notes.push('Adjust the bond direction. Each carbon needs one vertical axial bond and one outward equatorial bond.');
      if(!labelCorrect) notes.push(bond.type ? `This position is ${target.type}.` : 'Choose axial or equatorial.');
      if(!faceCorrect) notes.push(bond.face ? `This position points ${target.face} relative to the ring.` : 'Choose up or down.');
      return {geometryCorrect,labelCorrect,faceCorrect,correct,expectedType:target.type,expectedFace:target.face,message:correct?'Correct direction and labels.':notes.join(' ')};
    });
    return {results,complete:bonds.length===2 && results.every(r=>r.correct)};
  }
  const api = {chairs,normalizeVector,gradeCarbon,angularError,BOND_LENGTH,TOLERANCE_DEGREES};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  else root.ChairCore=api;
})(typeof window==='undefined'?globalThis:window);
