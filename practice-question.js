/* Substituent drawing practice. Uses the shared ChairCore endpoint geometry. */
(() => {
  'use strict';
  const root = document.getElementById('substituent-practice');
  const core = window.ChairCore;
  if (!root || !core || !core.chairs) return;
  const storageKey = 'chem1082-substituent-practice-1-2-v1';
  const blank = () => ({ cis: [{}, {}], trans: [{}, {}] });
  const state = { isomer: 'cis', chair: 0, carbon: 0, attempts: blank(), guides: false };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && ['cis', 'trans'].includes(saved.isomer)) state.isomer = saved.isomer;
    if (saved && [0, 1].includes(saved.chair)) state.chair = saved.chair;
    if (saved && [0, 1].includes(saved.carbon)) state.carbon = saved.carbon;
    for (const isomer of ['cis', 'trans']) for (const chair of [0, 1]) for (const carbon of [0, 1]) {
      const bond = saved?.attempts?.[isomer]?.[chair]?.[carbon];
      if (bond && Number.isFinite(bond.dx) && Number.isFinite(bond.dy) && Math.hypot(bond.dx, bond.dy) > 0) {
        state.attempts[isomer][chair][carbon] = normalize(bond.dx, bond.dy);
      }
    }
  } catch (_) { /* Private browsing may not allow storage. */ }

  root.innerHTML = `
    <div class="pr-heading"><p class="pr-eyebrow">Apply the chair flip</p><h2 id="pr-title">Draw the most stable conformation</h2></div>
    <p>Place a <strong>methyl group (CH₃) at C1</strong> and an <strong>isopropyl group [CH(CH₃)₂, or i-Pr] at C2</strong> on 1-methyl-2-isopropylcyclohexane.</p>
    <p class="pr-context">The name alone does not specify cis or trans. Try each case: <strong>cis</strong> groups share a ring face; <strong>trans</strong> groups occupy opposite faces.</p>
    <div class="pr-controls"><div class="pr-button-group" role="group" aria-label="Stereoisomer"><button type="button" data-pr-isomer="cis">cis-1,2</button><button type="button" data-pr-isomer="trans">trans-1,2</button></div><div class="pr-button-group" role="group" aria-label="Practice chair"><button type="button" data-pr-chair="0">Draw on Chair 1</button><button type="button" data-pr-chair="1">Draw on Chair 2</button></div></div>
    <p id="pr-prompt" class="pr-prompt"></p>
    <div class="pr-workspace">
      <div class="pr-drawing"><svg id="pr-canvas" viewBox="0 0 600 420" role="group" tabindex="0" aria-labelledby="pr-svg-title" aria-describedby="pr-draw-help pr-key-help"><title id="pr-svg-title">Draw the two substituent bonds on the numbered chair</title><g id="pr-scene"></g></svg><p id="pr-draw-help">Drag outward from <strong>C1</strong> or <strong>C2</strong>. Or select a carbon, then tap the bond’s endpoint. Drawing again replaces that group’s bond.</p><p class="pr-small">Each chair has its own drawing. Your attempts are kept when you switch chairs or cases.</p></div>
      <div class="pr-editor"><h3>Place a substituent</h3><div class="pr-button-group" role="group" aria-label="Select practice carbon"><button type="button" data-pr-carbon="0">C1 · CH₃</button><button type="button" data-pr-carbon="1">C2 · i-Pr</button></div>
        <p id="pr-selected" class="pr-selected"></p>
        <div class="pr-button-group pr-position-controls" role="group" aria-label="Draw in a standard bond direction"><button type="button" data-pr-direction="axial">Draw axial bond</button><button type="button" data-pr-direction="equatorial">Draw equatorial bond</button></div>
        <details class="pr-keyboard"><summary>Keyboard drawing controls</summary><p id="pr-key-help">Focus the diagram. Left/Right rotates the dotted preview by 5°. Up/Down rotates it by 45°. Enter draws it. Escape cancels the preview. Use the C1/C2 buttons to change carbon.</p><div class="pr-button-group"><button type="button" data-pr-rotate="-5" aria-label="Rotate preview counterclockwise five degrees">↶ 5°</button><button type="button" data-pr-rotate="5" aria-label="Rotate preview clockwise five degrees">↷ 5°</button><button type="button" id="pr-commit">Draw preview</button></div></details>
        <label class="pr-guide-toggle"><input id="pr-guides" type="checkbox"> Show bond-direction guides</label>
        <button type="button" id="pr-erase">Erase selected group’s bond</button>
        <div class="pr-assignment" id="pr-assignment" aria-live="polite"></div>
      </div>
    </div>
    <div class="pr-check-area"><button type="button" id="pr-check" class="primary">Check conformation</button><div id="pr-feedback" class="pr-feedback" role="status" aria-live="polite" aria-atomic="true"></div></div>
    <div class="pr-actions"><button type="button" id="pr-reveal">Show one solution</button><button type="button" id="pr-reset">Reset this drawing</button></div>
    <div id="pr-answer" class="pr-answer" hidden></div>
  `;
  const $ = selector => root.querySelector(selector);
  const svg = $('#pr-canvas');
  const scene = $('#pr-scene');
  let drag = null;
  let preview = null;
  let answerVisible = false;
  let checked = false;
  let layout = { carbonFont: 15, targetFont: 14, groupFont: 17, targetRadius: 18, numberOffset: 22 };
  const ns = 'http://www.w3.org/2000/svg';
  const chosen = () => state.attempts[state.isomer][state.chair];
  const geometry = () => core.chairs[state.chair];
  const groupName = carbon => carbon === 0 ? 'CH₃' : 'i-Pr';
  const save = () => { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) {} };
  function normalize(dx, dy) { const length = Math.hypot(dx, dy); return { dx: dx * 60 / length, dy: dy * 60 / length }; }
  function node(tag, attrs = {}, text) {
    const element = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function line(a, b, cls) { return node('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: cls }); }
  function bondAt(carbon, type) { return geometry().bonds.find(bond => bond.carbon === carbon && bond.type === type); }
  function carbonNumberPosition(index) {
    const carbons = geometry().carbons;
    const atom = carbons[index];
    if ([0, 1].includes(index)) return { x: atom.x, y: atom.y };
    const center = carbons.reduce((a, c) => ({ x: a.x + c.x / 6, y: a.y + c.y / 6 }), { x: 0, y: 0 });
    const direction = normalize(atom.x - center.x, atom.y - center.y);
    return { x: atom.x + direction.dx / 60 * layout.numberOffset, y: atom.y + direction.dy / 60 * layout.numberOffset };
  }
  function labelPosition(carbon, vector) {
    const start = geometry().carbons[carbon];
    const end = { x: start.x + vector.dx, y: start.y + vector.dy };
    const extension = Math.max(22, layout.groupFont * 1.3) / 60;
    const side = Math.max(36, layout.groupFont * 1.8) / 60;
    const candidates = [
      { x: end.x + vector.dx * extension, y: end.y + vector.dy * extension },
      { x: end.x - vector.dy * side, y: end.y + vector.dx * side },
      { x: end.x + vector.dy * side, y: end.y - vector.dx * side },
      { x: end.x + vector.dx * .8, y: end.y + vector.dy * .8 },
      { x: end.x + vector.dx * extension - vector.dy * side, y: end.y + vector.dy * extension + vector.dx * side },
      { x: end.x + vector.dx * extension + vector.dy * side, y: end.y + vector.dy * extension - vector.dx * side }
    ];
    // Keep group names clear of every carbon and its number in both chairs.
    const labelHalfWidth = layout.groupFont * 1.3, labelHalfHeight = layout.groupFont * .65;
    const score = point => geometry().carbons.reduce((total, atom, index) => {
      const target = [0, 1].includes(index);
      const atomRadius = target ? layout.targetRadius : 6;
      const number = carbonNumberPosition(index);
      const overlapsAtom = Math.abs(point.x - atom.x) < labelHalfWidth + atomRadius + 4 && Math.abs(point.y - atom.y) < labelHalfHeight + atomRadius + 4;
      const overlapsNumber = !target && Math.abs(point.x - number.x) < labelHalfWidth + layout.carbonFont * .8 + 5 && Math.abs(point.y - number.y) < labelHalfHeight + layout.carbonFont * .6 + 5;
      return total + (overlapsAtom || overlapsNumber ? 1000 : 0);
    }, point.x < labelHalfWidth + 6 || point.x > 594 - labelHalfWidth || point.y < labelHalfHeight + 6 || point.y > 414 - labelHalfHeight ? 1000 : 0);
    return candidates.map((point, index) => ({ point, score: score(point) + index })).sort((a, b) => a.score - b.score)[0].point;
  }
  function classify(carbon, vector) {
    if (!vector) return null;
    const length = Math.hypot(vector.dx, vector.dy);
    if (length < 1) return null;
    const matches = geometry().bonds.filter(bond => bond.carbon === carbon).map(bond => ({
      bond, score: (vector.dx * bond.dx + vector.dy * bond.dy) / (length * Math.hypot(bond.dx, bond.dy))
    })).sort((a, b) => b.score - a.score);
    return matches[0]?.score + 1e-12 >= Math.cos((core.TOLERANCE_DEGREES || 45) * Math.PI / 180) ? matches[0].bond : null;
  }
  function evaluateConformation(isomer, methyl, isopropyl) {
    const valid = ['cis', 'trans'].includes(isomer) && [methyl, isopropyl].every(bond =>
      bond && ['axial', 'equatorial'].includes(bond.type) && ['up', 'down'].includes(bond.face));
    if (!valid) return { valid: false, relation: null, relationCorrect: false, stabilityCorrect: false, correct: false };
    const relation = methyl.face === isopropyl.face ? 'cis' : 'trans';
    const relationCorrect = relation === isomer;
    // A 1,2 pattern is cis when axial/equatorial and trans when both roles match.
    const stabilityCorrect = methyl.type === (isomer === 'cis' ? 'axial' : 'equatorial') && isopropyl.type === 'equatorial';
    return { valid: true, relation, relationCorrect, stabilityCorrect, correct: relationCorrect && stabilityCorrect };
  }
  function showVerdict(verdict, messages) {
    const feedback = $('#pr-feedback');
    feedback.className = `pr-feedback pr-feedback-${verdict}`;
    const heading = document.createElement('h3');
    heading.className = 'pr-verdict';
    heading.textContent = { success: '✓ Correct', incorrect: '✕ Incorrect', incomplete: '… Incomplete' }[verdict];
    const paragraphs = messages.map(message => { const paragraph = document.createElement('p'); paragraph.textContent = message; return paragraph; });
    feedback.replaceChildren(heading, ...paragraphs);
  }
  function clearFeedback() {
    checked = false;
    $('#pr-feedback').replaceChildren();
    $('#pr-feedback').className = 'pr-feedback';
    answerVisible = false;
    $('#pr-answer').hidden = true;
    $('#pr-reveal').textContent = 'Show one solution';
  }
  function status(text) {
    $('#pr-feedback').className = 'pr-feedback pr-feedback-note';
    $('#pr-feedback').textContent = text;
  }
  function putBond(carbon, vector) {
    if (!vector || Math.hypot(vector.dx, vector.dy) < 12) return;
    chosen()[carbon] = normalize(vector.dx, vector.dy);
    state.carbon = carbon;
    preview = null;
    clearFeedback(); save(); render();
  }
  function render() {
    const model = geometry();
    const scale = Math.abs(svg.getScreenCTM()?.a) || 1;
    layout = {
      carbonFont: Math.max(15, 11 / scale),
      targetFont: Math.max(14, 11 / scale),
      groupFont: Math.max(17, 12 / scale),
      targetRadius: Math.max(18, 14 / scale),
      numberOffset: Math.max(22, 17 / scale)
    };
    svg.style.setProperty('--pr-carbon-font', `${layout.carbonFont}px`);
    svg.style.setProperty('--pr-target-font', `${layout.targetFont}px`);
    svg.style.setProperty('--pr-group-font', `${layout.groupFont}px`);
    scene.replaceChildren();
    model.carbons.forEach((carbon, index) => scene.append(line(carbon, model.carbons[(index + 1) % 6], 'pr-ring')));
    if (state.guides) for (const carbon of [0, 1]) for (const type of ['axial', 'equatorial']) {
      const start = model.carbons[carbon], bond = bondAt(carbon, type), vector = normalize(bond.dx, bond.dy);
      scene.append(line(start, { x: start.x + vector.dx, y: start.y + vector.dy }, 'pr-guide'));
      scene.append(node('circle', { cx: start.x + vector.dx, cy: start.y + vector.dy, r: 6, class: 'pr-guide-end' }));
    }
    if (answerVisible) for (const carbon of [0, 1]) {
      const type = state.isomer === 'trans' || carbon === 1 ? 'equatorial' : 'axial';
      const start = model.carbons[carbon], vector = normalize(bondAt(carbon, type).dx, bondAt(carbon, type).dy);
      const end = { x: start.x + vector.dx, y: start.y + vector.dy };
      const label = labelPosition(carbon, vector);
      scene.append(line(start, end, 'pr-solution-bond'));
      scene.append(node('text', { x: label.x, y: label.y, class: 'pr-solution-label', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, groupName(carbon)));
    }
    for (const carbon of [0, 1]) {
      const vector = chosen()[carbon];
      if (!vector) continue;
      const start = model.carbons[carbon], end = { x: start.x + vector.dx, y: start.y + vector.dy };
      const label = labelPosition(carbon, vector);
      const result = classify(carbon, vector);
      scene.append(line(start, end, checked && !result ? 'pr-substituent pr-invalid' : 'pr-substituent'));
      scene.append(node('text', { x: label.x, y: label.y, class: 'pr-group-label', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, groupName(carbon)));
    }
    if (preview) {
      const start = model.carbons[state.carbon];
      scene.append(line(start, { x: start.x + preview.dx, y: start.y + preview.dy }, 'pr-preview'));
    }
    model.carbons.forEach((carbon, index) => {
      const target = [0, 1].includes(index);
      const dot = node('circle', { cx: carbon.x, cy: carbon.y, r: target ? layout.targetRadius : 5, class: target ? `pr-carbon-target${state.carbon === index ? ' pr-carbon-active' : ''}` : 'pr-carbon', 'data-pr-carbon-node': index });
      scene.append(dot);
      if (target) scene.append(node('text', { x: carbon.x, y: carbon.y + .5, class: 'pr-carbon-number', 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'pointer-events': 'none' }, `C${index + 1}`));
      else {
        const number = carbonNumberPosition(index);
        scene.append(node('text', { x: number.x, y: number.y, class: 'pr-other-number', 'text-anchor': 'middle', 'dominant-baseline': 'middle' }, `C${index + 1}`));
      }
    });
    root.querySelectorAll('[data-pr-isomer]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.prIsomer === state.isomer)));
    root.querySelectorAll('[data-pr-chair]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.prChair) === state.chair)));
    root.querySelectorAll('[data-pr-carbon]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.prCarbon) === state.carbon)));
    $('#pr-prompt').textContent = `Draw the most stable ${state.isomer}-1-methyl-2-isopropylcyclohexane chair. Either up/down face arrangement is accepted.`;
    $('#pr-selected').textContent = `Selected: C${state.carbon + 1} · ${state.carbon === 0 ? 'methyl (CH₃)' : 'isopropyl (i-Pr)'}`;
    $('#pr-guides').checked = state.guides;
    $('#pr-erase').disabled = !chosen()[state.carbon];
    $('#pr-assignment').textContent = [0, 1].map(carbon => {
      const bond = chosen()[carbon];
      const result = classify(carbon, bond);
      return `C${carbon + 1}: ${!bond ? 'not drawn' : checked && result ? `${groupName(carbon)} ${result.type}, ${result.face}` : checked ? 'direction needs adjustment' : `${groupName(carbon)} drawn`}`;
    }).join(' · ');
    $('#pr-svg-title').textContent = `${state.isomer} practice, Chair ${state.chair + 1}. C${state.carbon + 1} selected. Draw CH₃ at C1 and i-Pr at C2.`;
  }
  function check() {
    answerVisible = false; $('#pr-answer').hidden = true; $('#pr-reveal').textContent = 'Show one solution';
    checked = true;
    const methyl = classify(0, chosen()[0]), isopropyl = classify(1, chosen()[1]);
    if (!chosen()[0] || !chosen()[1]) {
      showVerdict('incomplete', ['Finish both groups: draw CH₃ from C1 and i-Pr from C2, then check again.']);
    } else if (!methyl || !isopropyl) {
      showVerdict('incorrect', [`${[!methyl ? 'C1' : null, !isopropyl ? 'C2' : null].filter(Boolean).join(' and ')}: aim roughly along an axial or equatorial direction. Turn on the bond-direction guides if you need help. Approximate angles are accepted (within ${core.TOLERANCE_DEGREES || 45}°).`]);
    } else {
      const result = evaluateConformation(state.isomer, methyl, isopropyl);
      const relationMessage = `Ring faces: CH₃ is ${methyl.face}; i-Pr is ${isopropyl.face}. This is ${result.relation}${result.relationCorrect ? ' — correct for this case.' : `; this question asks for ${state.isomer}.`}`;
      const stabilityMessage = !result.relationCorrect ? 'Stability: first correct the cis/trans relationship; a chair flip cannot change it.'
        : result.stabilityCorrect ? state.isomer === 'trans'
          ? 'Stability: correct. Trans-1,2 can be diequatorial. Both groups are equatorial, avoiding their axial 1,3-diaxial interactions.'
          : 'Stability: correct. Cis-1,2 requires one axial group. The larger i-Pr group is equatorial and CH₃ is axial.'
        : state.isomer === 'trans'
          ? 'Stability: this is the less stable diaxial chair. A chair flip makes both groups equatorial while preserving their opposite ring faces.'
          : 'Stability: this is the less stable chair. A chair flip places the larger i-Pr group equatorial and CH₃ axial while preserving their shared ring face.';
      showVerdict(result.correct ? 'success' : 'incorrect', [relationMessage, stabilityMessage]);
    }
    render();
  }
  function reveal() {
    answerVisible = !answerVisible;
    $('#pr-answer').hidden = !answerVisible;
    $('#pr-reveal').textContent = answerVisible ? 'Hide solution' : 'Show one solution';
    if (answerVisible) {
      const methyl = bondAt(0, state.isomer === 'cis' ? 'axial' : 'equatorial'), isopropyl = bondAt(1, 'equatorial');
      $('#pr-answer').textContent = `Dashed green bonds show one lowest-energy answer in Chair ${state.chair + 1}: C1–CH₃ ${methyl.type}, ${methyl.face}; C2–i-Pr equatorial, ${isopropyl.face}. ${state.isomer === 'trans' ? 'A trans-1,2 relationship allows the diequatorial chair. The flipped chair is diaxial and less stable.' : 'A cis-1,2 relationship always has one axial and one equatorial group. Isopropyl has a greater axial penalty than methyl, so i-Pr is equatorial in the more stable chair.'} Up/down refers to the ring face, not the direction of a line on this screen.`;
    }
    render();
  }
  function rotate(degrees) {
    const current = preview || chosen()[state.carbon] || { dx: 0, dy: -60 };
    const theta = Math.atan2(current.dy, current.dx) + degrees * Math.PI / 180;
    preview = { dx: 60 * Math.cos(theta), dy: 60 * Math.sin(theta) };
    render();
  }
  function point(event) {
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const value = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: value.x, y: value.y };
  }
  function nearestCarbon(position) {
    const screenScale = svg.getScreenCTM()?.a || 1;
    const hitRadius = Math.max(27, 22 / screenScale);
    return [0, 1].find(carbon => Math.hypot(position.x - geometry().carbons[carbon].x, position.y - geometry().carbons[carbon].y) <= hitRadius);
  }
  svg.addEventListener('pointerdown', event => {
    if (event.button !== 0 || drag) return;
    const position = point(event); if (!position) return;
    const carbon = nearestCarbon(position);
    if (carbon !== undefined) {
      state.carbon = carbon;
      drag = { id: event.pointerId, carbon, start: position, moved: false };
      preview = null; svg.setPointerCapture(event.pointerId); render();
    } else {
      const start = geometry().carbons[state.carbon];
      putBond(state.carbon, { dx: position.x - start.x, dy: position.y - start.y });
    }
    event.preventDefault(); svg.focus({ preventScroll: true });
  });
  svg.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const position = point(event); if (!position) return;
    const start = geometry().carbons[drag.carbon];
    const vector = { dx: position.x - start.x, dy: position.y - start.y };
    if (Math.hypot(vector.dx, vector.dy) > 20) { drag.moved = true; preview = normalize(vector.dx, vector.dy); render(); }
  });
  svg.addEventListener('pointerup', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const active = drag; drag = null;
    if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    const position = point(event);
    if (active.moved && position) { const start = geometry().carbons[active.carbon]; putBond(active.carbon, { dx: position.x - start.x, dy: position.y - start.y }); }
    else { preview = null; save(); render(); }
  });
  const cancelDrag = () => { drag = null; preview = null; render(); };
  svg.addEventListener('pointercancel', cancelDrag);
  svg.addEventListener('lostpointercapture', () => { if (drag) cancelDrag(); });
  svg.addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault(); rotate({ ArrowLeft: -5, ArrowRight: 5, ArrowUp: -45, ArrowDown: 45 }[event.key]);
    } else if (event.key === 'Enter') { event.preventDefault(); putBond(state.carbon, preview || chosen()[state.carbon] || { dx: 0, dy: -60 }); }
    else if (event.key === 'Escape') { preview = null; render(); }
  });
  root.querySelectorAll('[data-pr-isomer]').forEach(button => button.addEventListener('click', () => { state.isomer = button.dataset.prIsomer; preview = null; clearFeedback(); save(); render(); }));
  root.querySelectorAll('[data-pr-chair]').forEach(button => button.addEventListener('click', () => { state.chair = Number(button.dataset.prChair); preview = null; clearFeedback(); save(); render(); }));
  root.querySelectorAll('[data-pr-carbon]').forEach(button => button.addEventListener('click', () => { state.carbon = Number(button.dataset.prCarbon); preview = null; save(); render(); }));
  root.querySelectorAll('[data-pr-direction]').forEach(button => button.addEventListener('click', () => { const bond = bondAt(state.carbon, button.dataset.prDirection); putBond(state.carbon, bond); }));
  root.querySelectorAll('[data-pr-rotate]').forEach(button => button.addEventListener('click', () => rotate(Number(button.dataset.prRotate))));
  $('#pr-commit').addEventListener('click', () => putBond(state.carbon, preview || chosen()[state.carbon] || { dx: 0, dy: -60 }));
  $('#pr-guides').addEventListener('change', event => { state.guides = event.target.checked; render(); });
  $('#pr-erase').addEventListener('click', () => { delete chosen()[state.carbon]; preview = null; clearFeedback(); save(); render(); });
  $('#pr-reset').addEventListener('click', () => { state.attempts[state.isomer][state.chair] = {}; preview = null; clearFeedback(); save(); render(); status('This drawing has been reset. Other chairs and cases are unchanged.'); });
  $('#pr-check').addEventListener('click', check);
  $('#pr-reveal').addEventListener('click', reveal);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(render).observe(svg);
  render();
})();
