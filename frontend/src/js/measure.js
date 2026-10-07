// src/js/measure.js — Área y Perímetro
export async function initMeasure(ctx) {
  const { map, root, eventBus } = ctx;
  if (!map) return;
  const typeSel = root.querySelector('#measurementTypeSelect');
  const btnStart= root.querySelector('#btnMeasureStart');
  const btnClear= root.querySelector('#btnMeasureClear');
  const listEl  = root.querySelector('#measureList');
  if (!typeSel || !btnStart || !btnClear || !listEl) return;

  const styleBase = new ol.style.Style({ fill: new ol.style.Fill({ color: 'rgba(59,130,246,0.15)' }), stroke: new ol.style.Stroke({ color: '#3b82f6', width: 2 }), image: new ol.style.Circle({ radius: 4, fill: new ol.style.Fill({ color: '#3b82f6' }) }) });
  const styleHL   = new ol.style.Style({ fill: new ol.style.Fill({ color: 'rgba(239,68,68,0.20)' }),  stroke: new ol.style.Stroke({ color: '#ef4444', width: 3 }), image: new ol.style.Circle({ radius: 5, fill: new ol.style.Fill({ color: '#ef4444' }) }) });

  const drawSrc = new ol.source.Vector();
  const drawLyr = new ol.layer.Vector({ source: drawSrc, style: f => f.get('hl') ? styleHL : styleBase });
  drawLyr.setZIndex(999); map.addLayer(drawLyr);

  let running = false, draw = null, sketch = null, geomKey = null;
  let helpOv = null, helpEl = null, dynOv = null, dynEl = null;
  const overlays = new Map(), featsById = new Map();
  let idSeq = 1;
  const view = map.getView();

  const createHelp = () => { helpEl = document.createElement('div'); helpEl.className = 'ol-tooltip ol-tooltip-help'; helpEl.style.display = 'none'; helpOv = new ol.Overlay({ element: helpEl, offset: [15, 0], positioning: 'center-left' }); map.addOverlay(helpOv); };
  const destroyHelp = () => { if (helpOv) map.removeOverlay(helpOv); helpOv = helpEl = null; };
  const createDyn = () => { dynEl = document.createElement('div'); dynEl.className = 'ol-tooltip ol-tooltip-measure'; dynOv = new ol.Overlay({ element: dynEl, offset: [0, -15], positioning: 'bottom-center' }); map.addOverlay(dynOv); };
  const destroyDyn = () => { if (dynOv) map.removeOverlay(dynOv); dynOv = dynEl = null; };

  const fmtLen  = g => { const l = ol.sphere.getLength(g, { projection: view.getProjection() }); return l >= 1000 ? (l/1000).toFixed(2)+' km' : l.toFixed(0)+' m'; };
  const fmtArea = g => { const a = ol.sphere.getArea(g, { projection: view.getProjection() }); return a >= 1e6 ? (a/1e6).toFixed(2)+' km²' : a >= 1e4 ? (a/1e4).toFixed(2)+' ha' : a.toFixed(0)+' m²'; };

  function addItem(id, text) {
    const li = document.createElement('li'); li.dataset.mid = id;
    li.innerHTML = `<span class="mlabel"><i class="fas fa-check-circle" style="color:#3b82f6"></i> ${text}</span><span><button class="mbtn" data-action="zoom">Zoom</button><button class="mbtn" data-action="del">🗑</button></span>`;
    listEl.appendChild(li);
  }
  listEl.addEventListener('click', e => {
    const btn = e.target.closest('button.mbtn'); if (!btn) return;
    const li  = e.target.closest('li[data-mid]'); if (!li) return;
    const id  = Number(li.dataset.mid);
    if (btn.dataset.action === 'del')  removeMeasure(id);
    if (btn.dataset.action === 'zoom') { const f = featsById.get(id); if (f) view.fit(f.getGeometry().getExtent(), { maxZoom: 18, duration: 300, padding: [30,30,30,30] }); }
  });

  function finalize(dt, geom) {
    const id = idSeq++, txt = dt === 'Polygon' ? fmtArea(geom) : fmtLen(geom);
    const el = document.createElement('div'); el.className = 'ol-tooltip ol-tooltip-static'; el.textContent = txt;
    const ov = new ol.Overlay({ element: el, offset: [0, -7], positioning: dt === 'Polygon' ? 'center-center' : 'bottom-center' });
    map.addOverlay(ov);
    ov.setPosition(dt === 'Polygon' ? geom.getInteriorPoint().getCoordinates() : geom.getLastCoordinate());
    overlays.set(id, { overlay: ov });
    const feat = new ol.Feature({ geometry: geom.clone() }); feat.set('measureId', id); feat.set('hl', false);
    drawSrc.addFeature(feat); featsById.set(id, feat);
    addItem(id, (dt === 'Polygon' ? 'Área: ' : 'Perím: ') + txt);
  }

  function removeMeasure(id) {
    const feat = featsById.get(id); if (feat) { drawSrc.removeFeature(feat); featsById.delete(id); }
    const rec  = overlays.get(id); if (rec) { map.removeOverlay(rec.overlay); overlays.delete(id); }
    listEl.querySelector(`li[data-mid="${id}"]`)?.remove();
  }

  function stop() {
    if (draw) { map.removeInteraction(draw); draw = null; }
    if (geomKey) { ol.Observable.unByKey(geomKey); geomKey = null; }
    if (stop._pm) { map.un('pointermove', stop._pm); stop._pm = null; }
    destroyDyn(); destroyHelp(); sketch = null; running = false;
  }

  function start(kind) {
    stop(); createHelp(); createDyn();
    const dt = kind === 'area' ? 'Polygon' : 'LineString';
    draw = new ol.interaction.Draw({ source: new ol.source.Vector(), type: dt, stopClick: false });
    map.addInteraction(draw);
    const pm = evt => { if (evt.dragging || !helpEl) return; helpEl.textContent = sketch ? 'Clic para continuar, doble clic para terminar' : 'Clic para comenzar'; helpEl.style.display = 'block'; helpOv.setPosition(evt.coordinate); };
    map.on('pointermove', pm); stop._pm = pm;
    draw.on('drawstart', evt => { sketch = evt.feature; geomKey = sketch.getGeometry().on('change', e => { const g = e.target; if (dynEl) dynEl.textContent = g.getType() === 'Polygon' ? fmtArea(g) : fmtLen(g); if (dynOv) dynOv.setPosition(g.getType() === 'Polygon' ? g.getInteriorPoint().getCoordinates() : g.getLastCoordinate()); }); });
    draw.on('drawend', evt => { finalize(dt, evt.feature.getGeometry()); if (geomKey) { ol.Observable.unByKey(geomKey); geomKey = null; } sketch = null; destroyDyn(); createDyn(); });
    running = true; setBtn(true);
  }

  function setBtn(on) {
    if (on) { btnStart.innerHTML = '<i class="fas fa-stop"></i> Detener'; btnStart.classList.add('btn-danger'); btnStart.classList.remove('btn-primary'); }
    else     { btnStart.innerHTML = '<i class="fas fa-play"></i> Iniciar';  btnStart.classList.remove('btn-danger'); btnStart.classList.add('btn-primary'); }
  }
  setBtn(false);

  btnStart.addEventListener('click', () => { if (running) { stop(); setBtn(false); } else { const k = (typeSel.value||'').toLowerCase(); if (k !== 'area' && k !== 'perimeter') return; start(k); } });
  typeSel.addEventListener('change', () => { if (running) { stop(); setBtn(false); } });
  btnClear.addEventListener('click',  () => { [...featsById.keys()].forEach(removeMeasure); stop(); setBtn(false); });
  root.addEventListener('keydown', ev => { if (ev.key === 'Escape' && running) { stop(); setBtn(false); } });
  console.log('[measure] listo.');
}
