// src/js/coordpicker.js — Captura de coordenadas
export function initCoordinatePicker(ctx) {
  const { map, root } = ctx;
  if (!map || !root) return;
  const btnToggle = root.querySelector('#btnCoordPickToggle');
  const btnClear  = root.querySelector('#btnCoordPickClear');
  const outEl     = root.querySelector('#coordPickDisplay');
  const mapsLink  = root.querySelector('#coordPickGoogle');
  const zoomBtn   = root.querySelector('#coordPickZoom');
  if (!btnToggle || !outEl) return;

  const src = new ol.source.Vector();
  const lyr = new ol.layer.Vector({ source: src, zIndex: 1200, style: new ol.style.Style({ image: new ol.style.Circle({ radius: 7, fill: new ol.style.Fill({ color: '#10b981' }), stroke: new ol.style.Stroke({ color: '#064e3b', width: 2 }) }) }) });
  map.addLayer(lyr);

  let running = false, clickKey = null, helpOv = null, helpEl = null;

  function showHelp(coord, text) {
    if (!helpOv) { helpEl = document.createElement('div'); helpEl.className = 'ol-tooltip ol-tooltip-help'; helpOv = new ol.Overlay({ element: helpEl, offset: [10, 0], positioning: 'center-left' }); map.addOverlay(helpOv); }
    helpEl.textContent = text; helpEl.style.display = 'block'; helpOv.setPosition(coord);
  }
  function hideHelp() { if (helpEl) helpEl.style.display = 'none'; }

  function writeOutput(mapCoord) {
    const proj = map.getView().getProjection();
    const [lon, lat] = ol.proj.toLonLat(mapCoord, proj);
    const f6 = n => Number(n).toFixed(6), f2 = n => Number(n).toFixed(2);
    if (outEl) outEl.innerHTML = `<div><strong>Geográficas (WGS84):</strong> lat ${f6(lat)}, lon ${f6(lon)}</div><div><strong>Mapa (${proj.getCode()}):</strong> X ${f2(mapCoord[0])}, Y ${f2(mapCoord[1])}</div>`;
    if (mapsLink) { mapsLink.href = `https://www.google.com/maps?q=${f6(lat)},${f6(lon)}`; mapsLink.target = '_blank'; mapsLink.rel = 'noopener'; }
  }

  function setBtn(on) {
    running = on; const tgt = map.getTargetElement();
    if (on)  { btnToggle.innerHTML = '<i class="fas fa-stop"></i> Detener'; btnToggle.classList.add('btn-danger'); btnToggle.classList.remove('btn-primary'); if(tgt) tgt.style.cursor='crosshair'; }
    else { btnToggle.innerHTML = '<i class="fas fa-play"></i> Iniciar';  btnToggle.classList.remove('btn-danger'); btnToggle.classList.add('btn-primary'); if(tgt) tgt.style.cursor=''; hideHelp(); }
  }
  setBtn(false);

  function stop()  { if (clickKey) { ol.Observable.unByKey(clickKey); clickKey = null; } running = false; setBtn(false); }
  function start() { stop(); clickKey = map.on('singleclick', evt => { src.clear(); src.addFeature(new ol.Feature(new ol.geom.Point(evt.coordinate))); writeOutput(evt.coordinate); stop(); }); running = true; setBtn(true); }

  map.on('pointermove', evt => { if (!running || evt.dragging) return; showHelp(evt.coordinate, 'Clic en el mapa para capturar coordenadas'); });

  btnToggle.addEventListener('click', () => running ? stop() : start());
  btnClear?.addEventListener('click', () => { src.clear(); if (outEl) outEl.innerHTML = '<em class="hint-text">Sin coordenadas capturadas.</em>'; hideHelp(); });
  zoomBtn?.addEventListener('click', () => { const f = src.getFeatures()[0]; if (f) map.getView().fit(f.getGeometry().getExtent(), { duration: 400, maxZoom: 18, padding: [40,40,40,40] }); });
  console.log('[coordpicker] listo.');
}
