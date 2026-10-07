// src/js/identify.js — GetFeatureInfo WMS
export async function initIdentify(ctx) {
  const { map, root, eventBus } = ctx;
  if (!map) return;
  const btnToggle = root.querySelector('#btnIdentifyToggle');
  const btnClear  = root.querySelector('#btnIdentifyClear');
  const modeSel   = root.querySelector('#identifyMode');
  const resultsEl = root.querySelector('#identifyResults');
  if (!btnToggle || !btnClear || !modeSel || !resultsEl) return;

  const hlSrc = new ol.source.Vector();
  const hlLyr = new ol.layer.Vector({
    source: hlSrc,
    style: new ol.style.Style({
      fill:   new ol.style.Fill({ color: 'rgba(234,179,8,0.20)' }),
      stroke: new ol.style.Stroke({ color: '#f59e0b', width: 3 }),
      image:  new ol.style.Circle({ radius: 5, fill: new ol.style.Fill({ color: '#f59e0b' }) }),
    }),
  });
  hlLyr.setZIndex(1000); map.addLayer(hlLyr);

  let running = false, clickKey = null, helpOv = null, helpEl = null;

  function showHelp(coord, text) {
    if (!helpOv) {
      helpEl = document.createElement('div'); helpEl.className = 'ol-tooltip ol-tooltip-help';
      helpOv = new ol.Overlay({ element: helpEl, offset: [10, 0], positioning: 'center-left' });
      map.addOverlay(helpOv);
    }
    helpEl.textContent = text; helpEl.style.display = 'block'; helpOv.setPosition(coord);
  }
  function hideHelp() { if (helpEl) helpEl.style.display = 'none'; }

  function setBtn(on) {
    running = on; const tgt = map.getTargetElement();
    if (on) {
      btnToggle.innerHTML = '<i class="fas fa-stop"></i> Detener';
      btnToggle.classList.add('btn-danger'); btnToggle.classList.remove('btn-primary');
      if (tgt) tgt.style.cursor = 'crosshair';
    } else {
      btnToggle.innerHTML = '<i class="fas fa-play"></i> Iniciar';
      btnToggle.classList.remove('btn-danger'); btnToggle.classList.add('btn-primary');
      if (tgt) tgt.style.cursor = ''; hideHelp();
    }
  }
  setBtn(false);

  const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  function getWmsLayers() {
    return map.getLayers().getArray()
      .filter(l => l instanceof ol.layer.Tile && l.getSource() instanceof ol.source.TileWMS && l.getVisible() && !l.get('isBasemap'))
      .sort((a, b) => (b.getZIndex() || 0) - (a.getZIndex() || 0));
  }

  async function doIdentify(coord) {
    const res = map.getView().getResolution(), proj = map.getView().getProjection();
    const lyrs = getWmsLayers(); if (!lyrs.length) return;
    const mode = modeSel.value; let seq = Date.now();
    for (const lyr of (mode === 'top' ? [lyrs[0]] : lyrs)) {
      const src = lyr.getSource();
      const url = src.getFeatureInfoUrl(coord, res, proj, { INFO_FORMAT: 'application/json', FEATURE_COUNT: 10, QUERY_LAYERS: src.getParams().LAYERS });
      if (!url) continue;
      try {
        const rsp = await fetch(url, { mode: 'cors' }); if (!rsp.ok) continue;
        const js  = await rsp.json(); if (!js.features?.length) continue;
        const feats = new ol.format.GeoJSON().readFeatures(js, { featureProjection: proj });
        feats.forEach(f => {
          const props = { ...f.getProperties() }; delete props.geometry;
          const entries = Object.entries(props).filter(([, v]) => v != null && v !== '');
          const div = document.createElement('div'); div.className = 'id-item'; div.dataset.fid = String(++seq);
          div.innerHTML = `<div class="id-head"><span class="title"><i class="fas fa-layer-group"></i> ${esc(lyr.get('title')||src.getParams().LAYERS)}</span><span class="actions"><button class="mbtn" data-action="zoom">Zoom</button><button class="mbtn" data-action="del">🗑</button></span></div><table class="id-table"><tbody>${entries.map(([k,v])=>`<tr><th>${esc(k)}</th><td>${esc(String(v))}</td></tr>`).join('')}</tbody></table>`;
          const fc = f.clone(); fc.set('idSeq', seq); hlSrc.addFeature(fc);
          resultsEl.prepend(div);
        });
        if (mode === 'top') break;
      } catch {}
    }
  }

  resultsEl.addEventListener('click', e => {
    const btn = e.target.closest('button.mbtn'); if (!btn) return;
    const card = e.target.closest('.id-item'); if (!card) return;
    const fid = Number(card.dataset.fid);
    if (btn.dataset.action === 'del') { hlSrc.getFeatures().forEach(f => { if (f.get('idSeq') === fid) hlSrc.removeFeature(f); }); card.remove(); }
    if (btn.dataset.action === 'zoom') { const feat = hlSrc.getFeatures().find(f => f.get('idSeq') === fid); if (feat) map.getView().fit(feat.getGeometry().getExtent(), { maxZoom: 18, duration: 300, padding: [30,30,30,30] }); }
  });

  map.on('pointermove', evt => { if (!running || evt.dragging) return; showHelp(evt.coordinate, 'Clic en el mapa para consultar'); });

  btnToggle.addEventListener('click', () => {
    if (running) { if (clickKey) { ol.Observable.unByKey(clickKey); clickKey = null; } setBtn(false); }
    else { clickKey = map.on('singleclick', evt => { showHelp(evt.coordinate, 'Consultando…'); doIdentify(evt.coordinate).finally(hideHelp); }); setBtn(true); }
  });
  btnClear.addEventListener('click', () => { resultsEl.innerHTML = ''; hlSrc.clear(); });
  eventBus.on('identify:clear', () => { resultsEl.innerHTML = ''; hlSrc.clear(); });
  console.log('[identify] listo.');
}
