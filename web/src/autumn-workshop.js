/* Scene placement and lighting for the standalone workshop. */
(function () {
  'use strict';
  const P = window.autumnPreview, A = window.AutumnAssets, T = window.THREE;
  if (!P) return;
  const $ = id => document.getElementById(id), KEY = 'autumn-workshop-v1';
  const root = new T.Group(); root.name = 'Placed garden'; P.scene.add(root);
  let items = [], selected = '', mode = '', firstPoint = null, serial = 0;
  let kit, supports = [], owned = [], lamps = [], restoring = false;
  const limit = { trellis: 24, yard: 8, string: 12 };
  const height = (x, z) => $('terrain').checked ? .08 * Math.sin(x * .6) * Math.cos(z * .55) : 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0));
  const status = text => { $('gardenStatus').textContent = text; if ($('placementText')) $('placementText').textContent = text; };
  const controls = document.createElement('section'); controls.id = 'gardenControls';
  controls.innerHTML = `
    <details open><summary>Build your garden</summary>
      <p class="subtle">Place multiple supports and lights. Tap the soil to place; select a saved object below to move or remove it.</p>
      <div class="actions"><button id="addTrellis">Place trellis</button><button id="addYard">Place yard light</button></div>
      <div class="actions"><button id="addString">String over patch</button><button id="trellisString">Light selected trellis</button></div>
      <button id="finishPlacement" class="wide">Done placing · orbit</button>
      <p id="gardenStatus" role="status" aria-live="polite"></p>
      <label for="gardenSelection">Placed objects</label><select id="gardenSelection"><option value="">No placed objects</option></select>
      <div id="objectTransform" hidden>
        <div class="row"><div><label for="objectX">Position X · m</label><input id="objectX" type="number" min="-60" max="60" step=".25"></div><div><label for="objectZ">Position Z · m</label><input id="objectZ" type="number" min="-60" max="60" step=".25"></div></div>
        <label for="objectYaw">Rotation <output id="objectYawOut"></output></label><input id="objectYaw" type="range" min="-180" max="180" step="5">
        <button id="applyTrellis" class="wide">Apply current trellis settings</button>
        <button id="removeObject" class="wide">Remove selected</button>
      </div>
      <div class="actions"><button id="undoPlacement">Undo last placement</button><button id="frameGarden">Frame garden</button></div>
      <p class="subtle">Objects and lighting save in this browser. Plant paint remains session-only. Export GLB includes visible placed objects; lighting presets stay in the workshop.</p>
    </details>
    <details><summary>Light & atmosphere</summary>
      <label for="lightPreset">Time of day</label><select id="lightPreset"><option value="day">Soft daylight</option><option value="overcast">Overcast</option><option value="golden">Golden hour</option><option value="dusk">Blue hour</option><option value="night">Moonlit night</option></select>
      <label for="exposure">Exposure <output id="exposureOut"></output></label><input id="exposure" type="range" min=".45" max="1.8" step=".05" value="1">
      <label for="lampPower">Lamp brightness <output id="lampPowerOut"></output></label><input id="lampPower" type="range" min="0" max="2" step=".1" value="1">
      <label for="stringHeight">String height · m</label><input id="stringHeight" type="range" min="1.8" max="4" step=".1" value="2.7">
      <label for="stringSag">String sag · m</label><input id="stringSag" type="range" min=".05" max=".65" step=".05" value=".25">
      <p class="subtle">String over patch: tap two points for the end posts. Trellis lights attach to the selected support and follow it when moved.</p>
    </details>
    <details><summary>Surface reference</summary><a href="assets/references/pumpkin-form-surface.png" target="_blank" rel="noopener"><img class="referenceThumb" src="assets/references/pumpkin-form-surface.png" alt="Generated photographic-style pumpkin shapes, rind, stems, leaves and vine reference board"></a><p class="subtle">Generated visual reference: six fruit forms and six close-up material studies. Open to inspect full size.</p></details>`;
  $('panel').insertBefore(controls, $('seed').parentElement.previousElementSibling);
  const banner = document.createElement('div'); banner.id = 'placementBanner'; banner.hidden = true;
  banner.innerHTML = '<span id="placementText"></span><button id="placementDone">Done</button>'; document.body.append(banner);
  const focus = document.createElement('div');
  focus.innerHTML = '<label for="fruitFocus">Pumpkin inspection</label><select id="fruitFocus"><option value="all">All seven forms</option><option value="0">Orange · round</option><option value="1">Orange · tall</option><option value="2">Russet · squat</option><option value="3">Flattened heirloom</option><option value="4">Ivory</option><option value="5">Green</option><option value="6">Warty</option></select>';
  $('panel').insertBefore(focus, controls);
  $('fruitFocus').onchange = () => { P.setView('pumpkin'); if ($('fruitFocus').value !== 'all') $('caption').innerHTML = '<strong>Look closer at the harvest.</strong><p>Inspect the rind, softened ribs and corky stem. Drag to orbit; scroll or pinch to move closer.</p>'; };

  function save() {
    if (restoring) return;
    try { localStorage.setItem(KEY, JSON.stringify({ items, serial, lighting: ['lightPreset', 'exposure', 'lampPower', 'stringHeight', 'stringSag'].map(id => [id, $(id).value]) })); }
    catch { status('Browser storage is unavailable. This layout will last for this session.'); }
  }
  function selection() { return items.find(i => i.id === selected); }
  function updateList() {
    const list = $('gardenSelection'); list.replaceChildren();
    if (!items.length) list.add(new Option('No placed objects', ''));
    for (const item of items) list.add(new Option(`${item.type === 'trellis' ? item.options.trellis + ' trellis' : item.type === 'yard' ? 'Yard light' : 'String lights'} · ${item.id}`, item.id));
    if (!items.some(i => i.id === selected)) selected = items.at(-1)?.id || '';
    list.value = selected;
    const item = selection(); $('objectTransform').hidden = !item;
    if (item) {
      $('objectX').value = item.x; $('objectZ').value = item.z;
      $('objectYaw').value = item.yaw; $('objectYawOut').textContent = item.yaw + '°';
      const attached = !!item.parent;
      for (const id of ['objectX', 'objectZ', 'objectYaw']) $(id).disabled = attached;
      $('applyTrellis').hidden = item.type !== 'trellis';
    }
    $('trellisString').disabled = item?.type !== 'trellis';
  }
  function track(g) { owned.push(g); return g; }
  function mesh(g, material, parent, position) {
    const m = new T.Mesh(track(g), material); if (position) m.position.copy(position);
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function tube(points, radius, material, parent) {
    return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points), Math.max(12, points.length * 2), radius, 6, false), material, parent);
  }
  function post(parent, x, z, h, material) {
    const y = height(x, z);
    mesh(new T.CylinderGeometry(.038, .048, h, 8), material, parent, new T.Vector3(x, y + h / 2, z));
    mesh(new T.CylinderGeometry(.13, .15, .09, 10), material, parent, new T.Vector3(x, y + .045, z));
  }
  function rebuild() {
    supports.forEach(p => p.dispose()); supports = [];
    owned.forEach(g => g.dispose()); owned = [];
    kit?.dispose(); root.clear(); lamps = [];
    kit = A.createKit(T, P.settings().tier, P.settings());
    const metal = kit.materials.metal;
    const bulb = new T.MeshStandardMaterial({ color: 0xffd79d, emissive: 0xffad49, emissiveIntensity: 3, roughness: .25 });
    // Let kit.dispose own this workshop-only material as well.
    kit.materials.bulb = bulb;
    for (const item of items.filter(i => i.type === 'trellis')) {
      const rad = item.yaw * Math.PI / 180, c = Math.cos(rad), s = Math.sin(rad);
      const patch = A.build(T, { ...item.options, tier: P.settings().tier, width: 1, length: 1, density: 0 }, { heightAt: (x, z) => height(item.x + x * c + z * s, item.z - x * s + z * c) }, kit);
      patch.root.position.set(item.x, 0, item.z); patch.root.rotation.y = rad;
      patch.root.name = item.id; root.add(patch.root); supports.push(patch);
    }
    for (const item of items.filter(i => i.type === 'yard')) {
      const g = new T.Group(); g.name = item.id; root.add(g);
      const y = height(item.x, item.z), h = 2.9, a = item.yaw * Math.PI / 180;
      post(g, item.x, item.z, h, metal);
      const tip = new T.Vector3(item.x + Math.cos(a) * .4, y + h - .08, item.z + Math.sin(a) * .4);
      tube([new T.Vector3(item.x, y + h - .3, item.z), new T.Vector3(item.x, y + h + .1, item.z), tip], .025, metal, g);
      mesh(new T.ConeGeometry(.23, .15, 20, 1, true), metal, g, tip);
      mesh(new T.SphereGeometry(.085, 12, 8), bulb, g, tip.clone().add(new T.Vector3(0, -.1, 0)));
      lamps.push({ position: tip.clone().add(new T.Vector3(0, -.16, 0)), strength: 2.8, distance: 9 });
    }
    for (const item of items.filter(i => i.type === 'string')) {
      const parent = items.find(p => p.id === item.parent), o = parent?.options;
      let start, end;
      if (parent) {
        const angle = parent.yaw * Math.PI / 180, rise = o.trellis === 'arch' ? Math.min(o.archRise, o.trellisHeight * .8) : 0;
        const transform = (x, z) => new T.Vector3(parent.x + x * Math.cos(angle) + z * Math.sin(angle), height(parent.x, parent.z) + o.trellisHeight - rise + .07, parent.z - x * Math.sin(angle) + z * Math.cos(angle));
        const z = o.trellis === 'arch' ? -o.trellisLength / 2 - .06 : -.08;
        start = transform(-o.trellisWidth / 2, z); end = transform(o.trellisWidth / 2, z);
      } else {
        const angle = item.yaw * Math.PI / 180, dx = Math.cos(angle) * item.span / 2, dz = Math.sin(angle) * item.span / 2;
        start = new T.Vector3(item.x - dx, height(item.x - dx, item.z - dz) + item.height, item.z - dz);
        end = new T.Vector3(item.x + dx, height(item.x + dx, item.z + dz) + item.height, item.z + dz);
      }
      const g = new T.Group(); g.name = item.id; root.add(g);
      if (!parent) { post(g, start.x, start.z, item.height, metal); post(g, end.x, end.z, item.height, metal); }
      const point = t => {
        if (parent && o.trellis === 'arch') {
          const angle = parent.yaw * Math.PI / 180, x = -Math.cos(Math.PI * t) * o.trellisWidth / 2, z = -o.trellisLength / 2 - .06;
          return new T.Vector3(parent.x + x * Math.cos(angle) + z * Math.sin(angle), height(parent.x, parent.z) + o.trellisHeight - Math.min(o.archRise, o.trellisHeight * .8) + Math.sin(Math.PI * t) * Math.min(o.archRise, o.trellisHeight * .8) + .07 - Math.sin(Math.PI * t * 8) ** 2 * item.sag * .2, parent.z - x * Math.sin(angle) + z * Math.cos(angle));
        }
        return start.clone().lerp(end, t).add(new T.Vector3(0, -Math.sin(Math.PI * t) * item.sag, 0));
      };
      tube(Array.from({ length: 25 }, (_, i) => point(i / 24)), .008, metal, g);
      const count = Math.max(4, Math.min(40, Math.round(start.distanceTo(end) / .45)));
      for (let i = 0; i <= count; i++) {
        const pos = point(i / count);
        mesh(new T.CylinderGeometry(.024, .024, .055, 6), metal, g, pos.clone().add(new T.Vector3(0, -.04, 0)));
        mesh(new T.SphereGeometry(.037, 8, 6), bulb, g, pos.clone().add(new T.Vector3(0, -.09, 0)));
      }
      lamps.push({ position: point(.5).add(new T.Vector3(0, -.2, 0)), strength: 1.7, distance: 7 });
    }
    // Four local light sources maximum; every bulb remains visibly emissive.
    for (const lamp of lamps.slice(0, 4)) {
      const light = new T.PointLight(0xffbd73, lamp.strength, lamp.distance, 2);
      light.position.copy(lamp.position); light.userData.strength = lamp.strength; root.add(light);
    }
    root.visible = P.view === 'field'; updateList(); applyLighting(); save();
  }
  const presets = {
    day: { sky: 0x98acb4, sun: 0xffecd5, power: 2.6, ambient: .65, env: .23, exposure: 1.02, position: [-8, 13, 7] },
    overcast: { sky: 0x929b9f, sun: 0xe0ebef, power: .85, ambient: 1.05, env: .18, exposure: 1.1, position: [-4, 16, 8] },
    golden: { sky: 0x9e9990, sun: 0xffb36c, power: 3.1, ambient: .4, env: .16, exposure: .95, position: [-14, 5, 8] },
    dusk: { sky: 0x34465e, sun: 0x96b4f6, power: .45, ambient: .28, env: .07, exposure: .92, position: [-8, 10, -10] },
    night: { sky: 0x0d1728, sun: 0x95b9f2, power: .14, ambient: .10, env: .018, exposure: .9, position: [-8, 13, -6] }
  };
  function applyLighting() {
    const p = presets[$('lightPreset').value] || presets.day;
    P.scene.background.setHex(p.sky); P.scene.fog.color.setHex(p.sky);
    P.sun.color.setHex(p.sun); P.sun.intensity = p.power;
    P.sun.position.copy(P.controls.target).add(new T.Vector3(...p.position)); P.sun.target.position.copy(P.controls.target);
    P.scene.children.filter(o => o.isHemisphereLight).forEach(o => { o.intensity = p.ambient; });
    const mats = new Set(); P.scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m)); });
    mats.forEach(m => { if ('envMapIntensity' in m) m.envMapIntensity = p.env * (m.metalness > .5 ? 2.8 : 1); });
    P.renderer.toneMappingExposure = p.exposure * Number($('exposure').value);
    const power = Number($('lampPower').value);
    root.traverse(o => { if (o.isPointLight) o.intensity = o.userData.strength * power; });
    if (kit) kit.materials.bulb.emissiveIntensity = 3 * power;
    $('exposureOut').textContent = Number($('exposure').value).toFixed(2) + '×';
    $('lampPowerOut').textContent = power.toFixed(1) + '×'; save();
  }
  function add(item) {
    if (items.filter(i => i.type === item.type).length >= limit[item.type]) { status(`Limit reached: ${limit[item.type]} ${item.type} objects.`); return false; }
    item.id = 'garden-' + (++serial); items.push(item); selected = item.id; rebuild(); return true;
  }
  function setMode(next) {
    $('orbit').click(); mode = next; firstPoint = null;
    if (next && P.view !== 'field') P.setView('field');
    P.controls.enabled = !next;
    banner.hidden = !next;
    if (next && innerWidth <= 720) togglePanel(false);
    $('view').style.cursor = next ? 'crosshair' : 'grab';
    for (const [id, value] of [['addTrellis', 'trellis'], ['addYard', 'yard'], ['addString', 'string']]) $(id).classList.toggle('active', next === value);
    status(next === 'string' ? 'Tap the first post position, then the second.' : next ? 'Tap the soil to place. Keep tapping to add more.' : 'Orbit camera. Your placed objects are saved.');
  }
  $('addTrellis').onclick = () => setMode('trellis'); $('addYard').onclick = () => setMode('yard'); $('addString').onclick = () => setMode('string'); $('finishPlacement').onclick = $('placementDone').onclick = () => setMode('');
  for (const id of ['orbit', 'place', 'paint']) $(id).addEventListener('click', () => { mode = ''; firstPoint = null; banner.hidden = true; $('view').style.cursor = ''; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMode(''); });
  $('view').addEventListener('pointerdown', e => {
    if (!mode || P.view !== 'field') return;
    const rect = $('view').getBoundingClientRect(), ray = new T.Raycaster();
    ray.setFromCamera(new T.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), P.camera);
    const hit = ray.intersectObject(P.ground)[0]; if (!hit) return;
    const x = Math.round(clamp(hit.point.x, -60, 60) * 4) / 4, z = Math.round(clamp(hit.point.z, -60, 60) * 4) / 4;
    if (mode === 'trellis') { const options = P.settings(); if (options.trellis === 'off') options.trellis = 'arch'; add({ type: 'trellis', x, z, yaw: 0, options }); }
    else if (mode === 'yard') add({ type: 'yard', x, z, yaw: 0 });
    else if (!firstPoint) { firstPoint = { x, z }; status('First post set. Tap the second post position.'); }
    else {
      const span = Math.hypot(x - firstPoint.x, z - firstPoint.z);
      if (span < .75 || span > 18) { status('Choose a second post 0.75–18 metres from the first.'); return; }
      add({ type: 'string', x: (x + firstPoint.x) / 2, z: (z + firstPoint.z) / 2, yaw: Math.atan2(z - firstPoint.z, x - firstPoint.x) * 180 / Math.PI, span, height: Number($('stringHeight').value), sag: Number($('stringSag').value) });
      firstPoint = null; status('String placed. Tap two points for another string, or choose Done placing.');
    }
  });
  $('gardenSelection').onchange = () => { selected = $('gardenSelection').value; updateList(); };
  for (const id of ['objectX', 'objectZ', 'objectYaw']) $(id)[id === 'objectYaw' ? 'oninput' : 'onchange'] = () => {
    const item = selection(); if (!item || item.parent) return;
    item.x = clamp($('objectX').value, -60, 60); item.z = clamp($('objectZ').value, -60, 60); item.yaw = clamp($('objectYaw').value, -180, 180); rebuild();
  };
  $('applyTrellis').onclick = () => { const item = selection(); if (item?.type !== 'trellis') return; const o = P.settings(); if (o.trellis === 'off') o.trellis = item.options.trellis; item.options = o; rebuild(); };
  function remove(id) { items = items.filter(i => i.id !== id && i.parent !== id); rebuild(); }
  $('removeObject').onclick = () => remove(selected); $('undoPlacement').onclick = () => { if (items.length) remove(items.at(-1).id); };
  $('trellisString').onclick = () => { const item = selection(); if (item?.type === 'trellis') add({ type: 'string', parent: item.id, x: item.x, z: item.z, yaw: 0, sag: Number($('stringSag').value) }); };
  $('frameGarden').onclick = () => { P.setView('field'); P.frameView(); applyLighting(); };
  $('reset').addEventListener('click', applyLighting);
  for (const id of ['lightPreset', 'exposure', 'lampPower']) $(id).oninput = applyLighting;
  for (const id of ['stringHeight', 'stringSag']) $(id).oninput = save;
  window.addEventListener('autumn:generated', () => { if (P.view !== 'field') { mode = ''; firstPoint = null; banner.hidden = true; $('view').style.cursor = ''; P.controls.enabled = true; } rebuild(); });
  window.autumnGarden = { root, get items() { return items; }, get mode() { return mode; }, add, remove, rebuild, setMode, applyLighting, update(time) { if (kit) kit.clock.value = time; } };

  // Recover only supported, bounded object data; ignore malformed saved layouts.
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || 'null'); restoring = true;
    if (data && Array.isArray(data.items)) {
      for (const raw of data.items.slice(0, 44)) {
        if (!raw || !limit[raw.type] || typeof raw.id !== 'string' || items.some(i => i.id === raw.id) || items.filter(i => i.type === raw.type).length >= limit[raw.type]) continue;
        if (![raw.x, raw.z, raw.yaw].every(Number.isFinite)) continue;
        const item = { id: raw.id.slice(0, 60), type: raw.type, x: clamp(raw.x, -60, 60), z: clamp(raw.z, -60, 60), yaw: clamp(raw.yaw, -180, 180) };
        if (item.type === 'trellis') { item.options = A.options(raw.options || {}); if (item.options.trellis === 'off') item.options.trellis = 'arch'; }
        if (item.type === 'string') { item.sag = clamp(raw.sag, .05, .65); if (raw.parent) item.parent = String(raw.parent); else { item.span = clamp(raw.span, .75, 18); item.height = clamp(raw.height, 1.8, 4); } }
        items.push(item);
      }
      items = items.filter(i => !i.parent || items.some(p => p.id === i.parent && p.type === 'trellis'));
      serial = Math.max(Number(data.serial) || 0, ...items.map(i => Number(i.id.replace('garden-', '')) || 0));
      if (Array.isArray(data.lighting)) for (const pair of data.lighting) if (Array.isArray(pair) && ['lightPreset', 'exposure', 'lampPower', 'stringHeight', 'stringSag'].includes(pair[0])) $(pair[0]).value = pair[1];
      if (!presets[$('lightPreset').value]) $('lightPreset').value = 'day';
    }
  } catch { status('Could not read the saved layout. Starting a fresh session.'); }
  restoring = false; rebuild();

  // Dockable, collapsible controls on desktop and a bottom sheet on phones.
  const bar = document.createElement('div'); bar.id = 'panelBar';
  bar.innerHTML = '<span>Workshop controls</span><button id="dockPanel" title="Move controls to the other side" aria-label="Move controls to the other side">↔</button><button id="hidePanel" aria-label="Minimize controls">−</button>';
  $('panel').prepend(bar);
  function togglePanel(open) { $('panel').classList.toggle('open', open); document.body.classList.toggle('controls-open', open); $('controlsToggle').textContent = open ? 'Minimize controls' : 'Controls'; $('controlsToggle').setAttribute('aria-expanded', String(open)); }
  $('controlsToggle').onclick = () => togglePanel(!$('panel').classList.contains('open')); $('hidePanel').onclick = () => togglePanel(false);
  $('dockPanel').onclick = () => document.body.classList.toggle('panel-left');
  togglePanel(innerWidth > 720);
})();
