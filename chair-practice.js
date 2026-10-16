(() => {
  'use strict';
  const core = window.ChairCore;
  const root = document.getElementById('chair-practice');
  if (!core || !root) return;
  const $ = selector => root.querySelector(selector);
  const svgs = [$('#chair-0'), $('#chair-1')];
  const inlineEditor = $('#bond-label-editor'), inlineLeader = $('#bond-label-leader');
  const NS = 'http://www.w3.org/2000/svg';
  const KEY = 'chem1082:chair-drawing:v1';
  const LENGTH = 60;
  const mobileLayout = window.matchMedia('(max-width: 680px)');
  const emptyBonds = () => [Array.from({length: 6}, () => []), Array.from({length: 6}, () => [])];
  const state = {bonds: emptyBonds(), chair: 0, carbon: 0, selected: '', checked: [false, false], solution: false};
  let nextId = 1, armed = null, drag = null, history = [], preview = null, dismissedBond = '';
  const letter = i => i === 0 ? 'A' : 'B';
  const name = text => text ? text[0].toUpperCase() + text.slice(1) : '';
  const currentBonds = () => state.bonds[state.chair][state.carbon];
  const selectedBond = () => currentBonds().find(b => b.id === state.selected);
  const setText = (node, text) => { if (node.textContent !== text) node.textContent = text; };
  const svgEl = (tag, attrs = {}, text) => {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const line = (p, b, attrs = {}) => svgEl('line', {x1: p.x, y1: p.y, x2: p.x + b.dx, y2: p.y + b.dy, ...attrs});
  const announce = text => setText($('#drawing-status'), text);
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({version: 1, bonds: state.bonds, chair: state.chair, carbon: state.carbon, nextId})); } catch (_) { /* Drawing remains usable when storage is unavailable. */ }
  }
  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved?.version !== 1 || !Array.isArray(saved.bonds) || saved.bonds.length !== 2) return;
      const restored = emptyBonds();
      for (let chair = 0; chair < 2; chair++) {
        if (!Array.isArray(saved.bonds[chair]) || saved.bonds[chair].length !== 6) return;
        for (let carbon = 0; carbon < 6; carbon++) {
          const bonds = saved.bonds[chair][carbon];
          if (!Array.isArray(bonds)) return;
          for (const b of bonds.slice(0, 2)) {
            if (!b || !Number.isFinite(b.dx) || !Number.isFinite(b.dy) || Math.hypot(b.dx, b.dy) < 1) continue;
            restored[chair][carbon].push({id: `b${nextId++}`, ...core.normalizeVector(b.dx, b.dy, LENGTH), type: ['axial', 'equatorial'].includes(b.type) ? b.type : '', face: ['up', 'down'].includes(b.face) ? b.face : ''});
          }
        }
      }
      state.bonds = restored;
      state.chair = saved.chair === 1 ? 1 : 0;
      state.carbon = Number.isInteger(saved.carbon) && saved.carbon >= 0 && saved.carbon < 6 ? saved.carbon : 0;
      state.selected = currentBonds()[0]?.id || '';
      if (state.bonds.flat(2).length) announce('Your saved drawings have been restored. Select a bond to continue.');
    } catch (_) { /* Ignore malformed or unavailable local storage. */ }
  }
  function remember() {
    history.push(JSON.stringify({bonds: state.bonds, chair: state.chair, carbon: state.carbon, selected: state.selected}));
    if (history.length > 70) history.shift();
  }
  function choose(chair, carbon, bondId = '') {
    state.chair = chair; state.carbon = carbon; state.selected = bondId;
    armed = null; dismissedBond = '';
    render();
  }
  function addBond(chair, carbon, dx, dy) {
    if (Math.hypot(dx, dy) < 14) { announce('Choose an endpoint farther from the carbon.'); return false; }
    if (state.bonds[chair][carbon].length >= 2) { announce(`Chair ${chair + 1}, C${carbon + 1} already has two bonds. Select a bond to label or delete it.`); return false; }
    remember();
    const b = {id: `b${nextId++}`, ...core.normalizeVector(dx, dy, LENGTH), type: '', face: ''};
    state.bonds[chair][carbon].push(b);
    state.chair = chair; state.carbon = carbon; state.selected = b.id; armed = null; dismissedBond = '';
    save(); render();
    announce(`Bond ${letter(currentBonds().length - 1)} added at Chair ${chair + 1}, C${carbon + 1}. Choose its orientation and ring face in the dropdowns beside the bond.`);
    return true;
  }
  function grade(chair, carbon) { return core.gradeCarbon(chair, carbon, state.bonds[chair][carbon]); }
  function bondResult(chair, carbon, index) { return state.checked[chair] ? grade(chair, carbon).results[index] : null; }
  function resultClass(result) { return result ? result.correct ? 'correct' : 'needs-work' : ''; }
  function resultMessage(result) {
    if (!result) return 'Choose an orientation and a ring face, then check your answers.';
    if (result.correct) return 'Direction, orientation, and ring face all match.';
    return [result.geometryCorrect ? 'Direction: correct.' : 'Direction: adjust your drawing.', result.labelCorrect ? 'Orientation: correct.' : `Orientation: this bond should be ${result.expectedType}.`, result.faceCorrect ? 'Ring face: correct.' : `Ring face: this bond should be ${result.expectedFace}.`].join(' ');
  }
  function placeLabel(scene, p, b, text, klass, reserved) {
    const mobile = mobileLayout.matches;
    const v = core.normalizeVector(b.dx, b.dy, 1);
    const endpoint = {x: p.x + b.dx, y: p.y + b.dy};
    const width = Math.max(40, text.length * (mobile ? 11 : 6.5));
    const desired = {x: endpoint.x + v.dx * (mobile ? 27 : 16), y: endpoint.y + v.dy * (mobile ? 29 : 19)};
    const offsets = mobile ? [[0, 0], [0, -32], [0, 32], [40, 0], [-40, 0], [56, -28], [-56, 28], [0, -64], [0, 64], [56, 32], [-56, -32]] : [[0, 0], [0, -20], [0, 20], [25, 0], [-25, 0], [40, -16], [-40, 16], [0, -40], [0, 40]];
    let best, cost = Infinity;
    for (const [ox, oy] of offsets) {
      const q = {x: Math.max(width / 2 + 8, Math.min(592 - width / 2, desired.x + ox)), y: Math.max(mobile ? 24 : 18, Math.min(mobile ? 398 : 404, desired.y + oy)), width};
      let score = Math.hypot(ox, oy);
      for (const r of reserved) if (Math.abs(q.x - r.x) < (q.width + r.width) / 2 + 4 && Math.abs(q.y - r.y) < (mobile ? 33 : 19)) score += 1000;
      if (score < cost) { cost = score; best = q; }
    }
    reserved.push(best);
    scene.append(svgEl('text', {x: best.x, y: best.y + 4, class: `svg-label ${klass}`}, text));
  }
  function draw(chair) {
    const svg = svgs[chair], scene = svg.querySelector('.drawing');
    const model = core.chairs[chair];
    const mobile = mobileLayout.matches;
    const focusKey = svg.contains(document.activeElement) ? document.activeElement.getAttribute('data-focus-key') : null;
    scene.replaceChildren();
    const selectedLabels = [], solutionLabels = [];
    if (state.solution) for (const b of model.bonds) {
      const p = model.carbons[b.carbon], vector = core.normalizeVector(b.dx, b.dy, LENGTH);
      scene.append(line(p, vector, {class: `solution-bond ${b.type}`}));
      if (b.carbon === state.carbon) solutionLabels.push({p, b: vector, text: `${name(b.type)} ${b.face === 'up' ? '↑' : '↓'}`, klass: `solution-label ${b.type}`});
    }
    model.carbons.forEach((p, i) => scene.append(svgEl('line', {x1: p.x, y1: p.y, x2: model.carbons[(i + 1) % 6].x, y2: model.carbons[(i + 1) % 6].y, class: 'ring-bond'})));
    state.bonds[chair].forEach((bonds, carbon) => bonds.forEach((b, i) => {
      const p = model.carbons[carbon], selected = state.chair === chair && state.selected === b.id;
      const result = bondResult(chair, carbon, i), status = resultClass(result);
      const g = svgEl('g', {'data-bond': b.id, 'data-carbon-index': carbon, 'data-focus-key': b.id, tabindex: 0, role: 'button', 'aria-label': `Chair ${chair + 1}, C${carbon + 1}, bond ${letter(i)}: ${b.type || 'orientation unlabeled'}, ${b.face || 'face unlabeled'}${result ? result.correct ? ', correct' : ', needs work' : ''}`, 'aria-pressed': selected});
      if (selected) g.append(line(p, b, {class: 'selected-halo'}));
      g.append(line(p, b, {class: `student-bond ${selected ? 'selected' : ''} ${status}`}));
      g.append(line(p, b, {class: 'bond-hit'}));
      if (mobile) g.append(svgEl('circle', {cx: p.x + b.dx, cy: p.y + b.dy, r: 25, fill: 'transparent'}));
      g.append(svgEl('circle', {cx: p.x + b.dx, cy: p.y + b.dy, r: mobile ? 14 : 9, class: `bond-end ${selected ? 'selected' : ''} ${status}`}));
      g.append(svgEl('text', {x: p.x + b.dx, y: p.y + b.dy, class: 'bond-letter'}, letter(i)));
      scene.append(g);
      if (carbon === state.carbon && !state.solution && (b.type || b.face)) selectedLabels.push({p, b, text: `${b.type ? name(b.type) : '?'} ${b.face === 'up' ? '↑' : b.face === 'down' ? '↓' : '?'}`, klass: ''});
    }));
    if (preview && preview.chair === chair) scene.append(line(model.carbons[preview.carbon], preview, {class: 'preview-bond'}));
    model.carbons.forEach((p, carbon) => {
      const matched = carbon === state.carbon, active = matched && chair === state.chair;
      const g = svgEl('g', {'data-carbon': carbon, 'data-focus-key': `c${carbon}`, tabindex: 0, role: 'button', 'aria-label': `Chair ${chair + 1}, C${carbon + 1}, ${state.bonds[chair][carbon].length} of 2 bonds drawn. Select to draw.`, 'aria-pressed': active});
      g.append(svgEl('circle', {cx: p.x, cy: p.y, r: mobile ? 39 : 21, fill: 'transparent'}));
      g.append(svgEl('circle', {cx: p.x, cy: p.y, r: mobile ? 22 : 14, class: `carbon-circle${matched ? ' matched' : ''}${active ? ' active' : ''}`}));
      g.append(svgEl('text', {x: p.x, y: p.y, class: `carbon-label${active ? ' active' : ''}`}, `C${carbon + 1}`));
      scene.append(g);
    });
    const reserved = model.carbons.map(p => ({...p, width: mobile ? 52 : 33}));
    for (const labels of [selectedLabels, solutionLabels]) for (const item of labels) placeLabel(scene, item.p, item.b, item.text, item.klass, reserved);
    svg.classList.toggle('armed', armed?.chair === chair);
    if (focusKey) scene.querySelector(`[data-focus-key="${focusKey}"]`)?.focus({preventScroll: true});
  }
  function renderControls() {
    const bonds = currentBonds(), b = selectedBond();
    $('#delete-bond').disabled = !b;
    const selection = `Chair ${state.chair + 1} · C${state.carbon + 1}${b ? ` · bond ${letter(bonds.indexOf(b))}` : ''}`;
    setText($('#selected-description'), selection);
    const result = b ? bondResult(state.chair, state.carbon, bonds.indexOf(b)) : null;
    $('#bond-feedback').className = `bond-feedback ${resultClass(result)}`;
    $('#bond-result-label').hidden = !result;
    setText($('#bond-result-label'), result ? result.correct ? '✓ Correct' : '✕ Incorrect' : '');
    setText($('#bond-feedback-message'), b ? resultMessage(result) : bonds.length ? 'Select bond A or B in the drawing to label it.' : 'Draw a bond, then choose both labels.');
    $('#undo').disabled = !history.length;
    $('#reset').disabled = !state.bonds.flat(2).length;
    $('#show-solution').checked = state.solution; $('#solution-note').hidden = !state.solution;
    const showComparison = state.solution || (state.checked.every(Boolean) && grade(0, state.carbon).complete && grade(1, state.carbon).complete && [0, 1].every(chair => grade(chair, state.carbon).results.every(r => r.correct)));
    $('#flip-comparison').hidden = !showComparison;
    if (showComparison) {
      const types = core.chairs.map(chair => chair.bonds.find(bond => bond.carbon === state.carbon && bond.face === 'up').type);
      setText($('#flip-comparison'), `Follow the up bond at C${state.carbon + 1}: ${types[0]} in Chair 1 → ${types[1]} in Chair 2. It stays up through the flip. The down bond swaps orientation too.`);
    }
  }
  function positionInlineEditor() {
    const b = selectedBond();
    if (inlineEditor.hidden || !b) return;
    const svg = svgs[state.chair], stage = svg.parentElement, matrix = svg.getScreenCTM();
    if (!matrix || !stage.clientWidth) return;
    const bounds = stage.getBoundingClientRect(), model = core.chairs[state.chair];
    const toStage = p => {
      const point = svg.createSVGPoint(); point.x = p.x; point.y = p.y;
      const screen = point.matrixTransform(matrix);
      return {x: screen.x - bounds.left, y: screen.y - bounds.top};
    };
    const carbon = model.carbons[state.carbon], endpoint = toStage({x: carbon.x + b.dx, y: carbon.y + b.dy});
    const width = inlineEditor.offsetWidth, height = inlineEditor.offsetHeight, margin = 8, gap = 22;
    const maxX = Math.max(margin, stage.clientWidth - width - margin), maxY = Math.max(margin, stage.clientHeight - height - margin);
    // Keep the active carbon and endpoint visible, then prefer nearby open space.
    const obstacles = model.carbons.map((p, i) => ({...toStage(p), radius: mobileLayout.matches ? 18 : 17, weight: i === state.carbon ? 100000 : 10000}));
    model.carbons.forEach((p, i) => {
      const next = model.carbons[(i + 1) % 6];
      for (const t of [.25, .5, .75]) obstacles.push({...toStage({x: p.x + (next.x - p.x) * t, y: p.y + (next.y - p.y) * t}), radius: 5, weight: 1500});
    });
    state.bonds[state.chair].forEach((bonds, i) => bonds.forEach(bond => {
      const p = model.carbons[i];
      obstacles.push({...toStage({x: p.x + bond.dx, y: p.y + bond.dy}), radius: 15, weight: bond.id === b.id ? 100000 : 2000});
      if (bond.id === b.id) for (const t of [.25, .5, .75]) obstacles.push({...toStage({x: p.x + bond.dx * t, y: p.y + bond.dy * t}), radius: 7, weight: 100000});
    }));
    const candidates = [];
    const xs = [endpoint.x - width / 2, endpoint.x + gap, endpoint.x - width - gap, margin, maxX];
    for (const x of xs) for (const y of [endpoint.y - height - gap, endpoint.y + gap, margin, maxY]) candidates.push({x, y});
    for (const x of [endpoint.x + gap, endpoint.x - width - gap]) candidates.push({x, y: endpoint.y - height / 2});
    let best = null, bestScore = Infinity;
    for (const candidate of candidates) {
      const x = Math.max(margin, Math.min(maxX, candidate.x)), y = Math.max(margin, Math.min(maxY, candidate.y));
      const distance = Math.hypot(Math.max(x - endpoint.x, 0, endpoint.x - x - width), Math.max(y - endpoint.y, 0, endpoint.y - y - height));
      let score = distance;
      for (const obstacle of obstacles) {
        const dx = Math.max(x - obstacle.x, 0, obstacle.x - x - width), dy = Math.max(y - obstacle.y, 0, obstacle.y - y - height);
        if (Math.hypot(dx, dy) < obstacle.radius) score += obstacle.weight;
      }
      if (score < bestScore) { bestScore = score; best = {x, y}; }
    }
    inlineEditor.style.left = `${Math.round(best.x)}px`; inlineEditor.style.top = `${Math.round(best.y)}px`;
    const edge = {x: Math.max(best.x, Math.min(best.x + width, endpoint.x)), y: Math.max(best.y, Math.min(best.y + height, endpoint.y))};
    const distance = Math.hypot(edge.x - endpoint.x, edge.y - endpoint.y);
    inlineLeader.hidden = distance < 18;
    const connector = inlineLeader.querySelector('line'), offset = distance ? 14 / distance : 0;
    for (const [key, value] of Object.entries({x1: endpoint.x + (edge.x - endpoint.x) * offset, y1: endpoint.y + (edge.y - endpoint.y) * offset, x2: edge.x, y2: edge.y})) connector.setAttribute(key, value);
  }
  function renderInlineEditor() {
    const b = selectedBond(), visible = Boolean(b && dismissedBond !== b.id);
    inlineEditor.hidden = !visible; inlineLeader.hidden = !visible;
    if (!visible) return;
    const stage = svgs[state.chair].parentElement;
    // Persistent native selects retain focus while a label change redraws the SVG.
    if (inlineEditor.parentElement !== stage) stage.append(inlineLeader, inlineEditor);
    setText($('#bond-label-heading'), `C${state.carbon + 1} · bond ${letter(currentBonds().indexOf(b))}`);
    $('#inline-type-select').value = b.type; $('#inline-face-select').value = b.face;
    inlineEditor.setAttribute('aria-label', `Chair ${state.chair + 1}, C${state.carbon + 1}, bond ${letter(currentBonds().indexOf(b))} labels`);
    positionInlineEditor();
  }
  function renderProgress() {
    const all = state.bonds.flat(2), labeled = all.filter(b => b.type && b.face).length;
    setText($('#overall-progress'), `${labeled} of 24 bonds labeled`); setText($('#drawn-progress'), `${all.length} drawn`); $('#completion-progress').value = labeled;
    for (let chair = 0; chair < 2; chair++) {
      const bonds = state.bonds[chair].flat(), count = bonds.filter(b => b.type && b.face).length;
      setText($(`#chair-${chair}-progress`), `${bonds.length} / 12 bonds`);
      const correct = state.bonds[chair].reduce((n, _, carbon) => n + grade(chair, carbon).results.filter(r => r.correct).length, 0);
      setText($(`#chair-${chair}-feedback`), state.checked[chair] ? `${correct} / 12 fully correct${bonds.length < 12 ? ` · ${12 - bonds.length} still to draw` : correct === 12 ? ' — chair complete!' : ' · select a bond for feedback'}` : `${count} / 12 labeled · ${12 - bonds.length} still to draw`);
    }
  }
  function renderReview() {
    $('#review-section').hidden = !state.checked.some(Boolean);
    if (!state.checked.some(Boolean)) return;
    const container = $('#review-grid');
    const focused = container.contains(document.activeElement) ? document.activeElement.dataset.review : null;
    container.replaceChildren(); let correct = 0, possible = 0;
    state.checked.forEach((checked, chair) => {
      if (!checked) return;
      possible += 12;
      const group = document.createElement('div'); group.className = 'review-chair';
      const heading = document.createElement('h3'); heading.textContent = `Chair ${chair + 1}`; group.append(heading);
      for (let carbon = 0; carbon < 6; carbon++) {
        const g = grade(chair, carbon), count = g.results.filter(r => r.correct).length, bonds = state.bonds[chair][carbon]; correct += count;
        const button = document.createElement('button'); button.type = 'button'; button.dataset.review = `${chair}-${carbon}`;
        const full = bonds.length === 2 && count === 2;
        button.className = `${full ? 'correct' : bonds.length ? 'needs-work' : ''}${state.chair === chair && state.carbon === carbon ? ' selected' : ''}`;
        const text = document.createElement('strong'); text.textContent = `C${carbon + 1} ${full ? '✓' : ''}`;
        const detail = document.createElement('span'); detail.textContent = bonds.length < 2 ? `${bonds.length}/2 drawn · ${count}/2 correct` : `${count}/2 correct`;
        button.append(text, detail); button.addEventListener('click', () => { choose(chair, carbon, bonds.find((_, i) => !g.results[i]?.correct)?.id || bonds[0]?.id || ''); announce(`Inspecting Chair ${chair + 1}, C${carbon + 1}.`); }); group.append(button);
      }
      container.append(group);
    });
    setText($('#review-summary'), `${correct} of ${possible} checked bonds fully correct`);
    if (focused) container.querySelector(`[data-review="${focused}"]`)?.focus({preventScroll: true});
  }
  function render() { svgs.forEach((_, chair) => draw(chair)); renderControls(); renderInlineEditor(); renderProgress(); renderReview(); }
  function check(chairs) {
    chairs.forEach(chair => { state.checked[chair] = true; });
    render();
    const total = chairs.reduce((n, chair) => n + state.bonds[chair].reduce((sum, _, carbon) => sum + grade(chair, carbon).results.filter(r => r.correct).length, 0), 0);
    announce(`${chairs.length === 2 ? 'Both chairs' : `Chair ${chairs[0] + 1}`} checked: ${total} of ${chairs.length * 12} bonds fully correct. Select any bond for detailed feedback.`);
  }
  function svgPoint(svg, event) {
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    return point.matrixTransform(svg.getScreenCTM().inverse());
  }
  svgs.forEach((svg, chair) => {
    svg.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !event.isPrimary) return;
      const carbonTarget = event.target.closest('[data-carbon]'), bondTarget = event.target.closest('[data-bond]');
      if (carbonTarget) {
        event.preventDefault();
        const carbon = Number(carbonTarget.dataset.carbon);
        choose(chair, carbon);
        armed = {chair, carbon};
        drag = {chair, carbon, pointerId: event.pointerId, moved: false};
        svg.setPointerCapture(event.pointerId); svg.classList.add('armed');
        announce(`Chair ${chair + 1}, C${carbon + 1} selected. Drag outward, or tap an endpoint to draw a bond.`);
      } else if (bondTarget) {
        event.preventDefault(); choose(chair, Number(bondTarget.dataset.carbonIndex), bondTarget.dataset.bond);
        announce(`Selected Chair ${chair + 1}, C${state.carbon + 1}, bond ${letter(currentBonds().findIndex(b => b.id === state.selected))}. Choose its labels in the dropdowns beside the bond.`);
      } else if (armed?.chair === chair) {
        event.preventDefault(); const p = svgPoint(svg, event), c = core.chairs[chair].carbons[armed.carbon];
        addBond(chair, armed.carbon, p.x - c.x, p.y - c.y);
      }
    });
    svg.addEventListener('pointermove', event => {
      if (!drag || drag.chair !== chair || event.pointerId !== drag.pointerId) return;
      const p = svgPoint(svg, event), c = core.chairs[chair].carbons[drag.carbon];
      if (Math.hypot(p.x - c.x, p.y - c.y) > 17) drag.moved = true;
      if (drag.moved) { preview = {chair, carbon: drag.carbon, ...core.normalizeVector(p.x - c.x, p.y - c.y, LENGTH)}; draw(chair); }
    });
    svg.addEventListener('pointerup', event => {
      if (!drag || drag.chair !== chair || event.pointerId !== drag.pointerId) return;
      const old = drag; drag = null; preview = null;
      if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
      if (old.moved) { const p = svgPoint(svg, event), c = core.chairs[chair].carbons[old.carbon]; addBond(chair, old.carbon, p.x - c.x, p.y - c.y); }
      draw(chair);
    });
    svg.addEventListener('pointercancel', () => { drag = null; preview = null; armed = null; render(); });
    svg.addEventListener('keydown', event => {
      if (event.key === 'Escape') { armed = null; drag = null; preview = null; render(); announce('Drawing canceled.'); return; }
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const target = event.target.closest('[data-carbon], [data-bond]');
      if (!target) return; event.preventDefault();
      if (target.hasAttribute('data-carbon')) {
        choose(chair, Number(target.dataset.carbon));
        armed = {chair, carbon: state.carbon}; svg.classList.add('armed');
        announce(`Chair ${chair + 1}, C${state.carbon + 1} selected. Choose an endpoint in the drawing to add a bond.`);
      } else { choose(chair, Number(target.dataset.carbonIndex), target.dataset.bond); $('#inline-type-select').focus({preventScroll: true}); }
    });
  });
  for (const [id, prop] of [['inline-type-select', 'type'], ['inline-face-select', 'face']]) $(`#${id}`).addEventListener('change', event => {
    const b = selectedBond(); if (!b) return; remember(); b[prop] = event.target.value; save(); render();
  });
  function closeInlineEditor() {
    dismissedBond = state.selected; render();
    svgs[state.chair].querySelector(`[data-bond="${state.selected}"]`)?.focus({preventScroll: true});
  }
  $('#close-bond-labels').addEventListener('click', closeInlineEditor);
  inlineEditor.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); closeInlineEditor(); } });
  $('#delete-bond').addEventListener('click', () => {
    const b = selectedBond(); if (!b) return; remember();
    state.bonds[state.chair][state.carbon] = currentBonds().filter(bond => bond.id !== b.id);
    state.selected = currentBonds()[0]?.id || ''; dismissedBond = ''; save(); render();
    if (!state.selected) svgs[state.chair].querySelector(`[data-carbon="${state.carbon}"]`)?.focus({preventScroll: true});
    announce(`Bond deleted from Chair ${state.chair + 1}, C${state.carbon + 1}.`);
  });
  $('#undo').addEventListener('click', () => {
    if (!history.length) return; Object.assign(state, JSON.parse(history.pop())); armed = null; preview = null; save(); render(); announce('Last edit undone.');
  });
  $('#reset').addEventListener('click', () => {
    remember(); state.bonds = emptyBonds(); state.checked = [false, false]; state.selected = ''; armed = null; preview = null; state.solution = false; save(); render(); announce('Both drawings cleared. Use Undo to restore them.');
  });
  $('#check-both').addEventListener('click', () => check([0, 1]));
  root.querySelectorAll('[data-check]').forEach(button => button.addEventListener('click', () => check([Number(button.dataset.check)])));
  $('#show-solution').addEventListener('change', event => { state.solution = event.target.checked; render(); announce(state.solution ? 'Solution overlay shown. Select a carbon to inspect its answer labels in both chairs.' : 'Solution overlay hidden. Your drawings are unchanged.'); });
  mobileLayout.addEventListener('change', render);
  if ('ResizeObserver' in window) {
    const editorResizeObserver = new ResizeObserver(positionInlineEditor);
    svgs.forEach(svg => editorResizeObserver.observe(svg.parentElement));
    editorResizeObserver.observe(inlineEditor);
  } else window.addEventListener('resize', positionInlineEditor);
  restore(); render();
})();
