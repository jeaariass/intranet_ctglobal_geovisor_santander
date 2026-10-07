// src/js/street360.js — Visor panorámico 360° (Pannellum)
// Requiere Pannellum cargado por CDN en index.html
export async function initStreet360(ctx) {
  const { map, root } = ctx;
  if (!map || !root) return;

  const btnToggle = root.querySelector('#btnStreet360Toggle');
  const btnClose  = root.querySelector('#btnStreet360Close');
  const panel     = root.getElementById('street360-panel');
  const viewerEl  = root.getElementById('s360-viewer');
  if (!btnToggle || !panel || !viewerEl) { console.warn('[street360] Elementos no encontrados'); return; }

  let active = false, clickKey = null, viewer = null;

  function open() {
    panel.classList.remove('hidden');
    active = true;
    btnToggle.innerHTML = '<i class="fas fa-stop"></i> Desactivar';
    btnToggle.classList.add('btn-danger');
    map.getTargetElement().style.cursor = 'crosshair';
    clickKey = map.on('singleclick', evt => {
      const [lon, lat] = ol.proj.toLonLat(evt.coordinate);
      loadPannellum(lat, lon);
    });
  }

  function close() {
    active = false;
    panel.classList.add('hidden');
    if (clickKey) { ol.Observable.unByKey(clickKey); clickKey = null; }
    map.getTargetElement().style.cursor = '';
    btnToggle.innerHTML = '<i class="fas fa-play"></i> Activar';
    btnToggle.classList.remove('btn-danger');
    if (viewer) { try { viewer.destroy?.(); } catch {} viewer = null; }
    viewerEl.innerHTML = '';
  }

  function loadPannellum(lat, lon) {
    if (typeof pannellum === 'undefined') {
      viewerEl.innerHTML = '<div style="color:#fff;padding:1rem;font-size:.85rem">Pannellum no está cargado.<br>Agrega una imagen 360° de este punto.</div>';
      return;
    }
    viewerEl.innerHTML = '';
    // Personalizar con imágenes reales del municipio
    viewer = pannellum.viewer(viewerEl, {
      type:       'equirectangular',
      panorama:   'brand/panorama-placeholder.jpg', // ← reemplazar con imagen real
      autoLoad:   true,
      showControls: true,
      title:      `Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}`,
    });
  }

  btnToggle.addEventListener('click', () => active ? close() : open());
  btnClose.addEventListener('click', close);
  console.log('[street360] listo.');
}
