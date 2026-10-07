// src/js/map.js — GeoVisor Santander CP-001
// OpenLayers cargado por CDN (variable global `ol`)

const fmtNum   = (n, d = 0) => Number(n).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtScale = n           => '1:' + Math.round(n).toLocaleString('es-CO');

export async function initMap(ctx) {
  const { eventBus, mapEl, root } = ctx;
  if (!mapEl) throw new Error('[map] No existe #map');

  // Registrar EPSG:9377 (MAGNA-SIRGAS)
  if (typeof proj4 !== 'undefined') {
    try {
      proj4.defs('EPSG:9377',
        '+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 ' +
        '+x_0=5000000 +y_0=2000000 +ellps=GRS80 ' +
        '+towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs'
      );
    } catch {}
  }

  // ── Centro: Santander, Tolima ───────────────────────────
  const HOME_LON    = -73.3668;
  const HOME_LAT    =   6.8958;
  const HOME_ZOOM   = 14;
  const HOME_CENTER = ol.proj.fromLonLat([HOME_LON, HOME_LAT]);

  // ── Mapas base ──────────────────────────────────────────
  const osmLayer = new ol.layer.Tile({
    source: new ol.source.OSM({ attributions: '© OpenStreetMap' }),
    visible: true,
  });
  osmLayer.set('isBasemap', true);

  const satLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attributions: 'Tiles © Esri', maxZoom: 19,
    }),
    visible: false,
  });
  satLayer.set('isBasemap', true);

  const terrainLayer = new ol.layer.Tile({
    source: new ol.source.XYZ({
      url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attributions: '© OpenTopoMap', maxZoom: 17,
    }),
    visible: false,
  });
  terrainLayer.set('isBasemap', true);

  const baseLayers = { osm: osmLayer, sat: satLayer, terrain: terrainLayer };

  const view = new ol.View({ center: HOME_CENTER, zoom: HOME_ZOOM, minZoom: 2, maxZoom: 20 });

  let controls;
  try {
    if (ol.control?.defaults?.defaults) controls = ol.control.defaults.defaults({ attribution: true, rotate: true, zoom: false });
    else if (typeof ol.control?.defaults === 'function') controls = ol.control.defaults({ attribution: true, rotate: true, zoom: false });
  } catch {}
  if (!controls) controls = new ol.Collection([new ol.control.Attribution(), new ol.control.Rotate()]);

  const map = new ol.Map({
    target: mapEl,
    layers: [osmLayer, satLayer, terrainLayer],
    view, controls,
  });
  setTimeout(() => map.updateSize(), 0);

  ctx.map       = map;
  ctx.flyToHome = (z = HOME_ZOOM) => view.animate({ center: HOME_CENTER, zoom: z, duration: 600 });

  // ── Escala ──────────────────────────────────────────────
  const scaleEl = root.querySelector('#coordScale');
  function updateScale() {
    if (!scaleEl) return;
    const res = view.getResolution(), center = view.getCenter();
    if (!res || !center) return;
    scaleEl.textContent = fmtScale(ol.proj.getPointResolution(view.getProjection(), res, center, 'm') * 96 * 39.37);
  }
  view.on('change:resolution', updateScale);
  map.on('moveend', updateScale);
  updateScale();

  // ── Coordenadas del puntero ─────────────────────────────
  const lonEl   = root.querySelector('#coordLon');
  const latEl   = root.querySelector('#coordLat');
  const fmtSel  = root.querySelector('#coordFormat');
  const lbl1    = root.querySelector('#coordLabel1');
  const lbl2    = root.querySelector('#coordLabel2');
  let mode      = fmtSel?.value || 'geo';
  let lastLL    = null;

  function setLabels() {
    if (!lbl1 || !lbl2) return;
    if (mode === 'geo')   { lbl1.textContent = 'Longitud:'; lbl2.textContent = 'Latitud:'; }
    if (mode === 'geod')  { lbl1.textContent = 'E (m):';    lbl2.textContent = 'N (m):'; }
    if (mode === 'plana') { lbl1.textContent = 'X (m):';    lbl2.textContent = 'Y (m):'; }
  }
  setLabels();

  function updateCoords(lon, lat) {
    if (!lonEl || !latEl) return;
    if (mode === 'geo') {
      lonEl.textContent = fmtNum(lon, 6); latEl.textContent = fmtNum(lat, 6);
    } else if (mode === 'plana') {
      const [x, y] = ol.proj.fromLonLat([lon, lat]);
      lonEl.textContent = fmtNum(x, 2); latEl.textContent = fmtNum(y, 2);
    } else {
      if (typeof proj4 !== 'undefined') {
        try {
          const [E, N] = proj4('EPSG:4326', 'EPSG:9377', [lon, lat]);
          lonEl.textContent = fmtNum(E, 2); latEl.textContent = fmtNum(N, 2);
        } catch { lonEl.textContent = '--'; latEl.textContent = '--'; }
      } else { lonEl.textContent = '--'; latEl.textContent = '--'; }
    }
  }

  map.on('pointermove', evt => {
    const [lon, lat] = ol.proj.toLonLat(evt.coordinate);
    lastLL = [lon, lat];
    updateCoords(lon, lat);
    eventBus.emit('map:coords', { lon, lat });
  });

  fmtSel?.addEventListener('change', () => {
    mode = fmtSel.value; setLabels();
    const src = lastLL || ol.proj.toLonLat(view.getCenter());
    updateCoords(src[0], src[1]);
  });

  // ── Botones ─────────────────────────────────────────────
  root.querySelector('#zoomInBtn')?.addEventListener('click',  () => view.animate({ zoom: (view.getZoom() ?? HOME_ZOOM) + 1, duration: 200 }));
  root.querySelector('#zoomOutBtn')?.addEventListener('click', () => view.animate({ zoom: (view.getZoom() ?? HOME_ZOOM) - 1, duration: 200 }));
  root.querySelector('#homeBtn')?.addEventListener('click',    () => view.animate({ center: HOME_CENTER, zoom: HOME_ZOOM, duration: 500 }));

  // ── Selector de mapa base ───────────────────────────────
  const basemapBtn   = root.querySelector('#basemapBtn');
  const basemapPanel = root.querySelector('#basemapPanel');
  basemapBtn?.addEventListener('click', ev => {
    ev.stopPropagation();
    if (basemapPanel?.hasAttribute('hidden')) basemapPanel.removeAttribute('hidden');
    else basemapPanel?.setAttribute('hidden', '');
  });
  document.addEventListener('click', ev => {
    if (!basemapBtn?.contains(ev.target) && !basemapPanel?.contains(ev.target))
      basemapPanel?.setAttribute('hidden', '');
  });
  basemapPanel?.addEventListener('click', e => {
    const card = e.target.closest('.bm-card'); if (!card) return;
    const key = card.getAttribute('data-key');
    Object.entries(baseLayers).forEach(([k, lyr]) => lyr.setVisible(k === key));
    basemapPanel.querySelectorAll('.bm-card').forEach(b => b.classList.remove('active'));
    card.classList.add('active');
  });

  console.log('[map] Listo. Centro Santander:', HOME_LON, HOME_LAT, 'zoom:', HOME_ZOOM);
}
