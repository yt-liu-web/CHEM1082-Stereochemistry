/* 2-bromobutane: idealized tetrahedral substituent-group geometry.
 * Quaternion convention: [x, y, z, w]; multiply(a,b) applies b first, then a.
 * Right-handed coordinates: +x right, +y up, +z toward the viewer.
 * A canvas projection uses (x, -y). All interactive motions are proper rotations.
 * CH2CH3 and CH3 nodes represent entire groups, not single atoms.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BromobutaneRS = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const EPS = 1e-12;
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const subtract = (a, b) => a.map((v, i) => v - b[i]);
  const length = v => Math.hypot(...v);
  const unit = v => {
    const n = length(v);
    if (!Number.isFinite(n) || n < EPS) throw new RangeError('A direction must be a finite nonzero vector.');
    return v.map(x => x / n);
  };
  const identity = () => [0, 0, 0, 1];
  const normalize = q => {
    const n = Math.hypot(...q);
    return Number.isFinite(n) && n > EPS ? q.map(x => x / n) : identity();
  };
  function axisAngle(axis, radians) {
    const a = unit(axis), s = Math.sin(radians / 2);
    return [a[0] * s, a[1] * s, a[2] * s, Math.cos(radians / 2)];
  }
  function multiply(a, b) {
    return normalize([
      a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
      a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
      a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
      a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
    ]);
  }
  function rotate(quaternion, position) {
    const q = normalize(quaternion), u = q.slice(0, 3);
    const t = cross(u, position).map(x => 2 * x), c = cross(u, t);
    return position.map((x, i) => x + q[3] * t[i] + c[i]);
  }
  function fromTo(from, to) {
    const a = unit(from), b = unit(to), d = Math.max(-1, Math.min(1, dot(a, b)));
    if (d > 1 - EPS) return identity();
    if (d < -1 + EPS) {
      // Choose a perpendicular axis even when a is parallel to a coordinate axis.
      const least = a.map(Math.abs).indexOf(Math.min(...a.map(Math.abs)));
      const basis = [0, 0, 0]; basis[least] = 1;
      return axisAngle(cross(a, basis), Math.PI);
    }
    return normalize([...cross(a, b), 1 + d]);
  }
  function flip(axis = 'y') {
    const axes = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
    if (!axes[axis]) throw new RangeError('Flip axis must be x, y, or z.');
    return axisAngle(axes[axis], Math.PI);
  }

  // CIP priorities: Br > CH2CH3 > CH3 > H. For the carbon tie,
  // ethyl's next sphere [C,H,H] precedes methyl's [H,H,H].
  const definitions = [
    { id: 'br', label: 'Br', name: 'bromine', priority: 1, attachedAtom: 'Br', atomicNumber: 35, color: '#b44332' },
    { id: 'ethyl', label: 'CH2CH3', name: 'ethyl', priority: 2, attachedAtom: 'C', atomicNumber: 6, nextSphere: ['C', 'H', 'H'], color: '#287eae' },
    { id: 'methyl', label: 'CH3', name: 'methyl', priority: 3, attachedAtom: 'C', atomicNumber: 6, nextSphere: ['H', 'H', 'H'], color: '#9c6ac1' },
    { id: 'h', label: 'H', name: 'hydrogen', priority: 4, attachedAtom: 'H', atomicNumber: 1, color: '#f0f3f7' }
  ];
  const bondLength = 1.6, radius = Math.sqrt(8 / 9), halfWidth = radius * Math.sqrt(3) / 2;
  const tetrahedron = [[0, radius, -1 / 3], [-halfWidth, -radius / 2, -1 / 3], [halfWidth, -radius / 2, -1 / 3], [0, 0, 1]];
  // Oblique front-facing H remains separated from the stereocenter in projection.
  const tilt = axisAngle([1, 0, 0], 28 * Math.PI / 180);
  const rPositions = tetrahedron.map(p => rotate(tilt, p.map(x => x * bondLength)));
  const models = ['R', 'S'].map(id => ({
    id,
    name: '(' + id + ')-2-bromobutane',
    answer: id,
    formula: 'CH3CH(Br)CH2CH3',
    center: [0, 0, 0],
    bondLength,
    idealized: true,
    groups: definitions.map((definition, i) => ({
      ...definition,
      position: id === 'R' ? rPositions[i].slice() : [-rPositions[i][0], rPositions[i][1], rPositions[i][2]]
    }))
  }));
  const modelById = Object.fromEntries(models.map(model => [model.id, model]));
  function resolve(modelOrId) {
    const model = typeof modelOrId === 'string' ? modelById[modelOrId.toUpperCase()] : modelOrId;
    if (!model || !Array.isArray(model.groups)) throw new TypeError('Provide a 2-bromobutane model or its R/S id.');
    return model;
  }
  function transformedGroups(modelOrId, quaternion = identity()) {
    return resolve(modelOrId).groups.map(group => ({ ...group, position: rotate(quaternion, group.position) }));
  }
  function orientationWithHydrogenAway(modelOrId) {
    const hydrogen = resolve(modelOrId).groups.find(group => group.priority === 4);
    return fromTo(hydrogen.position, [0, 0, -1]);
  }
  function chirality(modelOrId, quaternion = identity()) {
    const p = transformedGroups(modelOrId, quaternion).sort((a, b) => a.priority - b.priority).map(group => group.position);
    const determinant = dot(subtract(p[0], p[3]), cross(subtract(p[1], p[3]), subtract(p[2], p[3])));
    // In a right-handed coordinate system, R has negative oriented volume.
    if (Math.abs(determinant) < EPS) return null;
    return determinant < 0 ? 'R' : 'S';
  }
  function projectedWinding(modelOrId, quaternion = identity()) {
    const p = transformedGroups(modelOrId, quaternion).sort((a, b) => a.priority - b.priority).slice(0, 3).map(group => group.position);
    const area = p.reduce((sum, a, i) => {
      const b = p[(i + 1) % 3];
      return sum + a[0] * b[1] - b[0] * a[1];
    }, 0);
    return Math.abs(area) < EPS ? 'edge-on' : area < 0 ? 'clockwise' : 'counterclockwise';
  }
  models.forEach(model => {
    if (chirality(model) !== model.answer) throw new Error('The model geometry has an incorrect stereodescriptor.');
  });
  return { models, modelById, bondLength, dot, cross, subtract, length, unit, identity, normalize, axisAngle, multiply, rotate, fromTo, flip, transformedGroups, orientationWithHydrogenAway, chirality, projectedWinding };
});
