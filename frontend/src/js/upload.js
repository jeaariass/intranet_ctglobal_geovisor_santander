// src/js/upload.js — Importar GeoJSON / KML / GPX / ZIP
const STORAGE_KEY = 'snt_uploads_v1';

export function initUploadModule(ctx) {
  const { map, root } = ctx;
  if (!map || !root) return;
  const input      = root.querySelector('#uploadInput');
  const trigger    = root.querySelector('#uploadTrigger');
  const resultsDiv = root.querySelector('#uploadResults');
  const clearBtn   = root.querySelector('#clearUploads');
  if (!input || !resultsDiv) return;
  trigger?.addEventListener('click', () => input.click());
  // Drag-and-drop en el dropzone
  trigger?.addEventListener('dragover', e => { e.preventDefault(); trigger.style.borderColor = '#3b82f6'; });
  trigger?.addEventListener('dragleave', () => { trigger.style.borderColor = ''; });
  trigger?.addEventListener('drop', e => { e.preventDefault(); trigger.style.borderColor = ''; handleFiles(Array.from(e.dataTransfer.files)); });

  const live = new Map();
  const gj   = new ol.format.GeoJSON();
  const proj  = () => map.getView().getProjection().getCode();
  const ls    = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]'); } catch { return []; } };
  const ss    = arr => localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));

  function makeLayer(feats, title) {
    const lyr = new ol.layer.Vector({ source: new ol.source.Vector({ features: feats }), style: new ol.style.Style({ stroke: new ol.style.Stroke({ color: '#3b82f6', width: 2 }), fill: new ol.style.Fill({ color: 'rgba(59,130,246,0.10)' }), image: new ol.style.Circle({ radius: 5, fill: new ol.style.Fill({ color: '#3b82f6' }), stroke: new ol.style.Stroke({ color: '#fff', width: 1 }) }) }) });
    lyr.set('title', title); lyr.setZIndex(950); return lyr;
  }
  function appendUI(entry) {
    const row = document.createElement('div'); row.className = 'upload-item'; row.dataset.uid = String(entry.id);
    row.innerHTML = `<span title="${entry.name}">${entry.name}</span><button class="mbtn" data-action="zoom">Zoom</button><button class="mbtn" data-action="del">🗑</button>`;
    resultsDiv.appendChild(row);
  }

  ls().forEach(entry => {
    try { const feats = gj.readFeatures(entry.gj4326, { dataProjection: 'EPSG:4326', featureProjection: proj() }); const lyr = makeLayer(feats, 'Importado: '+entry.name); map.addLayer(lyr); live.set(entry.id, { lyr, name: entry.name }); appendUI(entry); }
    catch {}
  });

  async function handleFiles(files) {
    const persisted = ls();
    for (const file of files) {
      try {
        const lower = file.name.toLowerCase(); let feats = null;
        if (lower.endsWith('.geojson')||lower.endsWith('.json')) { const t=await file.text(); let crs='EPSG:4326'; try{const n=JSON.parse(t)?.crs?.properties?.name||'';if(/3857|900913/.test(n))crs='EPSG:3857';}catch{}; feats=gj.readFeatures(t,{dataProjection:crs,featureProjection:proj()}); }
        else if (lower.endsWith('.kml'))  { feats=new ol.format.KML().readFeatures(await file.text(),{dataProjection:'EPSG:4326',featureProjection:proj()}); }
        else if (lower.endsWith('.gpx'))  { feats=new ol.format.GPX().readFeatures(await file.text(),{dataProjection:'EPSG:4326',featureProjection:proj()}); }
        else if (lower.endsWith('.zip'))  { if(typeof shp!=='function'){alert('shpjs no cargado');continue;} feats=gj.readFeatures(await shp(await file.arrayBuffer()),{dataProjection:'EPSG:4326',featureProjection:proj()}); }
        else { alert('Formato no soportado: '+file.name); continue; }
        if (!feats?.length) { alert('Sin entidades: '+file.name); continue; }
        const lyr = makeLayer(feats, 'Importado: '+file.name); map.addLayer(lyr);
        const id = Date.now()+Math.floor(Math.random()*1000); live.set(id,{lyr,name:file.name}); appendUI({id,name:file.name});
        persisted.push({id,name:file.name,gj4326:gj.writeFeaturesObject(feats,{dataProjection:'EPSG:4326',featureProjection:proj(),decimals:7}),createdAt:Date.now()});
        ss(persisted);
        const ext=lyr.getSource().getExtent(); if(ext&&!isNaN(ext[0])) map.getView().fit(ext,{duration:600,padding:[40,40,40,40]});
      } catch (err) { console.error('[upload]',file.name,err); alert('Error: '+file.name+'\n'+err.message); }
    }
    input.value='';
  }

  input.addEventListener('change', e => handleFiles(Array.from(e.target.files||[])));
  resultsDiv.addEventListener('click', e => {
    const btn=e.target.closest('button.mbtn'); if(!btn) return;
    const item=e.target.closest('.upload-item'); if(!item) return;
    const id=Number(item.dataset.uid), rec=live.get(id); if(!rec) return;
    if (btn.dataset.action==='zoom') { const ext=rec.lyr.getSource().getExtent(); if(ext&&!isNaN(ext[0])) map.getView().fit(ext,{duration:500,padding:[40,40,40,40]}); }
    if (btn.dataset.action==='del')  { map.removeLayer(rec.lyr); live.delete(id); item.remove(); ss(ls().filter(x=>x.id!==id)); }
  });
  clearBtn?.addEventListener('click',()=>{ for(const{lyr}of live.values())map.removeLayer(lyr); live.clear(); resultsDiv.innerHTML=''; ss([]); });
  console.log('[upload] listo.');
}
