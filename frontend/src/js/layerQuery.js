// src/js/layerQuery.js — Consultas WFS por atributos
import { GEOSERVER_PATH } from './config.js';
const WS = 'santander_catastro';
const QUERY_LAYERS = [
  { name: 'Predios Urbanos',   workspace: WS, layer: 'predio_urbano' },
  { name: 'Predios Rurales',   workspace: WS, layer: 'predio_rural'  },
  { name: 'Manzanas',          workspace: WS, layer: 'manzana'       },
  { name: 'Barrios',           workspace: WS, layer: 'barrio'        },
  { name: 'Veredas',           workspace: WS, layer: 'vereda'        },
  { name: 'Construcciones',    workspace: WS, layer: 'construccion'  },
  { name: 'Hidrografía',       workspace: WS, layer: 'hidrografia'   },
  { name: 'Vías',              workspace: WS, layer: 'via'           },
  { name: 'Límite Municipal',  workspace: WS, layer: 'limite_municipal' },
];
const valCache = new Map();
const esc  = s => String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const escA = s => String(s??'').replace(/"/g,'&quot;');

async function fetchUnique(ws, layer, attr) {
  const key = `${ws}:${layer}:${attr}`; if (valCache.has(key)) return valCache.get(key);
  try {
    const rsp = await fetch(`${GEOSERVER_PATH}/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=${ws}:${layer}&propertyName=${attr}&outputFormat=application/json&maxFeatures=500`);
    if (!rsp.ok) throw new Error();
    const js  = await rsp.json();
    const vals = new Set((js.features||[]).map(f=>f.properties?.[attr]).filter(v=>v!=null&&String(v).trim()!=='').map(v=>String(v).trim()));
    valCache.set(key, vals); return vals;
  } catch { return new Set(); }
}

export function initLayerQueryUI(map) {
  const layerSel   = document.getElementById('queryLayerSelect');
  const attrCont   = document.getElementById('attributesContainer');
  const attrSel    = document.getElementById('attributeSelect');
  const filterCont = document.getElementById('filterContainer');
  const filterInp  = document.getElementById('filterValue');
  const execBtn    = document.getElementById('executeQuery');
  const clearBtn   = document.getElementById('clearQueryResults');
  const resultsDiv = document.getElementById('queryResults');
  const resultsSel = document.getElementById('queryResultsSelect');
  const selWrap    = document.getElementById('resultsSelectWrap');
  if (!layerSel || !attrSel || !filterInp || !execBtn) return null;

  layerSel.innerHTML = '<option value="">Seleccione una capa</option>';
  QUERY_LAYERS.forEach(l => { const o = document.createElement('option'); o.value = JSON.stringify(l); o.textContent = l.name; layerSel.appendChild(o); });
  attrCont.style.display = 'none'; filterCont.style.display = 'none'; execBtn.style.display = 'none';

  const hlSrc = new ol.source.Vector();
  const hlLyr = new ol.layer.Vector({ source: hlSrc, zIndex: 900, style: feat => { const sel=feat.get('selected'),c=sel?'#3b82f6':'#ef4444',w=sel?3:2,gt=feat.getGeometry().getType(); if(/Point/.test(gt)) return new ol.style.Style({image:new ol.style.Circle({radius:sel?6:5,fill:new ol.style.Fill({color:c}),stroke:new ol.style.Stroke({color:c,width:w})})}); return new ol.style.Style({fill:new ol.style.Fill({color:sel?'rgba(59,130,246,0.15)':'rgba(239,68,68,0.12)'}),stroke:new ol.style.Stroke({color:c,width:w})}); } });
  map.addLayer(hlLyr);

  let allVals = new Set();
  const suggest = document.createElement('div');
  suggest.style.cssText = 'position:absolute;left:0;right:0;top:100%;z-index:9000;background:#1e293b;border:1.5px solid #3b82f6;border-top:none;border-radius:0 0 8px 8px;max-height:180px;overflow-y:auto;';
  filterCont.style.position = 'relative'; filterCont.appendChild(suggest);

  function showSuggest(q) {
    const term = q.toLowerCase();
    const hits = term.length === 0 ? [...allVals].slice(0,40) : [...allVals].filter(v=>v.toLowerCase().includes(term)).slice(0,40);
    if (!hits.length) { suggest.style.display = 'none'; return; }
    suggest.innerHTML = hits.map(v=>`<div style="padding:.35rem .65rem;cursor:pointer;font-size:.78rem;color:rgba(255,255,255,.75);border-bottom:1px solid rgba(255,255,255,.06)" data-val="${escA(v)}">${esc(v)}</div>`).join('');
    suggest.querySelectorAll('div').forEach(el => { el.addEventListener('mouseenter',()=>el.style.background='rgba(59,130,246,.2)'); el.addEventListener('mouseleave',()=>el.style.background=''); el.addEventListener('mousedown',e=>{e.preventDefault();filterInp.value=el.dataset.val;suggest.style.display='none';}); });
    suggest.style.display = 'block';
  }
  filterInp.addEventListener('input', () => showSuggest(filterInp.value));
  filterInp.addEventListener('focus', () => { if (allVals.size) showSuggest(filterInp.value); });
  filterInp.addEventListener('blur',  () => setTimeout(()=>{suggest.style.display='none';}, 180));

  layerSel.addEventListener('change', async () => {
    attrSel.innerHTML='<option value="">Seleccione un atributo</option>'; resultsDiv.innerHTML=''; hlSrc.clear(); filterInp.value=''; allVals=new Set(); suggest.style.display='none';
    if (!layerSel.value) { attrCont.style.display='none'; filterCont.style.display='none'; execBtn.style.display='none'; return; }
    attrCont.style.display='block'; filterCont.style.display='block'; execBtn.style.display='inline-flex';
    const {workspace,layer} = JSON.parse(layerSel.value);
    try {
      const rsp = await fetch(`${GEOSERVER_PATH}/wfs?service=WFS&version=1.1.0&request=DescribeFeatureType&typeName=${workspace}:${layer}`);
      const xml = await rsp.text(), doc = new DOMParser().parseFromString(xml,'application/xml');
      Array.from(doc.getElementsByTagNameNS('*','element')).map(el=>el.getAttribute('name')).filter(n=>n&&!n.toLowerCase().includes('geom')).forEach(name=>{const o=document.createElement('option');o.value=name;o.textContent=name;attrSel.appendChild(o);});
    } catch {}
  });

  attrSel.addEventListener('change', async () => {
    filterInp.value=''; allVals=new Set(); suggest.style.display='none';
    if (!layerSel.value||!attrSel.value) return;
    const {workspace,layer}=JSON.parse(layerSel.value);
    filterInp.disabled=true; filterInp.placeholder='Cargando sugerencias…';
    allVals=await fetchUnique(workspace,layer,attrSel.value);
    filterInp.disabled=false; filterInp.placeholder=allVals.size>0?`Escribe o elige entre ${allVals.size} valores…`:'Escribe el valor a buscar';
    filterInp.focus();
  });

  execBtn.addEventListener('click', async () => {
    resultsDiv.innerHTML='<p style="color:rgba(255,255,255,.35);font-size:.78rem">Buscando…</p>'; hlSrc.clear(); suggest.style.display='none';
    if (!layerSel.value||!attrSel.value||!filterInp.value.trim()) { resultsDiv.innerHTML='<p style="color:#f87171;font-size:.78rem">Complete todos los campos.</p>'; return; }
    const {workspace,layer}=JSON.parse(layerSel.value), attr=attrSel.value.trim(), raw=filterInp.value.trim(), mapCrs=map.getView().getProjection().getCode();
    const isNum=s=>/^[+-]?\d+(?:[.,]\d+)?$/.test(s), toNum=s=>Number(s.replace(',','.')), escQ=s=>s.replace(/'/g,"''");
    async function runCQL(cql){try{const r=await fetch(`${GEOSERVER_PATH}/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=${workspace}:${layer}&outputFormat=application/json&srsName=${encodeURIComponent(mapCrs)}&CQL_FILTER=${encodeURIComponent(cql)}`);if(!r.ok)throw new Error();const j=await r.json();return Array.isArray(j.features)?j.features:[];}catch{return[];}}
    let features=[];
    for (const a of (isNum(raw)?[{cql:`${attr} = ${toNum(raw)}`},{cql:`${attr} ILIKE '%${escQ(raw)}%'`}]:[{cql:`${attr} ILIKE '%${escQ(raw)}%'`}])) { features=await runCQL(a.cql); if(features.length) break; }
    if (!features.length) { resultsDiv.innerHTML='<p style="color:rgba(255,255,255,.35);font-size:.78rem">Sin resultados.</p>'; return; }
    const feats=new ol.format.GeoJSON().readFeatures({type:'FeatureCollection',features},{dataProjection:mapCrs,featureProjection:mapCrs});
    hlSrc.addFeatures(feats); resultsDiv.innerHTML='';
    if (selWrap) { selWrap.style.display='block'; if(resultsSel) {resultsSel.innerHTML='<option value="">Seleccione resultado</option>'; feats.forEach((_,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`Resultado #${i+1}`;resultsSel.appendChild(o);}); } }
    const container=document.createElement('div');
    feats.forEach((f,idx)=>{const props={...f.getProperties()};delete props.geometry;const item=document.createElement('div');item.className='query-result-item';item.innerHTML=`<div style="font-size:.75rem;font-weight:700;color:#60a5fa;margin-bottom:.25rem">Resultado #${idx+1}</div>${Object.entries(props).map(([k,v])=>`<div><strong style="color:rgba(255,255,255,.5)">${esc(k)}:</strong> ${esc(String(v))}</div>`).join('')}<div style="margin-top:.35rem;display:flex;gap:.3rem"><button class="mbtn btn-zoom" data-idx="${idx}">Zoom</button><button class="mbtn btn-del" data-idx="${idx}">🗑</button></div>`;container.appendChild(item);});
    resultsDiv.appendChild(container);
    function selectOne(idx){feats.forEach(ft=>ft.set('selected',false));feats[idx].set('selected',true);hlLyr.changed();map.getView().fit(feats[idx].getGeometry().getExtent(),{duration:500,maxZoom:18,padding:[40,40,40,40]});}
    container.addEventListener('click',e=>{const z=e.target.closest('.btn-zoom'),d=e.target.closest('.btn-del');if(z)selectOne(Number(z.dataset.idx));if(d){hlSrc.removeFeature(feats[Number(d.dataset.idx)]);feats.splice(Number(d.dataset.idx),1);d.closest('.query-result-item')?.remove();}});
    resultsSel?.addEventListener('change',()=>{const idx=Number(resultsSel.value);if(!isNaN(idx)&&feats[idx])selectOne(idx);});
  });

  clearBtn?.addEventListener('click',()=>{resultsDiv.innerHTML='';hlSrc.clear();filterInp.value='';suggest.style.display='none';if(selWrap)selWrap.style.display='none';});
  return hlLyr;
}
