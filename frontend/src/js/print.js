// src/js/print.js — Exportar mapa
export function initPrint(ctx) {
  const { root, map } = ctx || {};
  if (!root) return;
  const host = root.querySelector('#printRoot'); if (!host) return;

  host.innerHTML = `
    <div class="form-group">
      <label>Título</label>
      <input id="printTitle" class="form-input" type="text" value="GeoVisor Santander — Vista actual">
    </div>
    <div class="form-group">
      <label>Nota (opcional)</label>
      <input id="printNote" class="form-input" type="text" placeholder="Ej.: Solo para consulta. No documento oficial.">
    </div>
    <button id="btnPrintPreview" class="btn btn-primary">
      <i class="fas fa-print"></i> Previsualizar e imprimir
    </button>`;

  injectPrintStyles(root);

  host.querySelector('#btnPrintPreview').addEventListener('click', async () => {
    if (!map) { alert('No se detectó el mapa.'); return; }
    const btn = host.querySelector('#btnPrintPreview');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando…';
    try {
      await new Promise(resolve => { let done = false; const finish = () => { if (!done) { done = true; resolve(); } }; try { map.renderSync?.(); } catch {} map.once('rendercomplete', finish); setTimeout(finish, 900); });
      const dataUrl = captureMap(map); if (!dataUrl) { alert('No se pudo capturar el mapa.'); return; }
      const title = (host.querySelector('#printTitle')?.value || '').trim() || 'Vista actual';
      const note  = (host.querySelector('#printNote')?.value  || '').trim();
      const scale = root.querySelector('#coordScale')?.textContent?.trim() || '';
      const iso   = new Date().toISOString().replace('T',' ').slice(0,19);
      showPrint(root, { title, note, scale, iso, dataUrl });
    } catch (e) { alert('Error: ' + e.message); }
    finally { btn.disabled = false; btn.innerHTML = '<i class="fas fa-print"></i> Previsualizar e imprimir'; }
  });
  console.log('[print] listo.');
}

function captureMap(map) {
  const vp = map.getViewport?.(); if (!vp) return null;
  const cvs = vp.querySelectorAll('canvas'); if (!cvs.length) return null;
  const size = map.getSize?.(); if (!size) return null;
  const out = document.createElement('canvas'); out.width = size[0]; out.height = size[1];
  const c = out.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, out.width, out.height);
  cvs.forEach(cv => {
    if (!cv.width || !cv.height) return;
    const opacity = Number(cv.style.opacity || 1); c.globalAlpha = Number.isFinite(opacity) ? opacity : 1;
    const t = cv.style.transform;
    if (t?.startsWith('matrix(')) { const v = t.replace('matrix(','').replace(')','').split(',').map(Number); if (v.length===6&&v.every(Number.isFinite)) c.setTransform(...v); else c.setTransform(1,0,0,1,0,0); } else c.setTransform(1,0,0,1,0,0);
    try { c.drawImage(cv, 0, 0); } catch {}
  });
  c.setTransform(1,0,0,1,0,0); c.globalAlpha = 1;
  try { return out.toDataURL('image/png'); } catch { return null; }
}

const esc = s => String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function showPrint(root, { title, note, scale, iso, dataUrl }) {
  root.getElementById('printOverlay')?.remove(); root.getElementById('printSheet')?.remove();
  const sheet = root.createElement('div'); sheet.id = 'printSheet'; sheet.className = 'print-sheet';
  sheet.innerHTML = `<div class="sheet-header"><div><div class="sheet-title">${esc(title)}</div>${note?`<div class="sheet-note">${esc(note)}</div>`:''}</div><div class="sheet-meta"><div><b>Fecha:</b> ${esc(iso)}</div>${scale?`<div><b>Escala:</b> ${esc(scale)}</div>`:''}</div></div><div class="sheet-map"><img src="${dataUrl}" alt="Mapa"/></div><div class="sheet-footer"><div>GeoVisor Santander — Gestor Catastral | CTGlobal CP-001</div></div>`;
  root.body.appendChild(sheet);
  const overlay = root.createElement('div'); overlay.id = 'printOverlay'; overlay.className = 'print-overlay';
  overlay.innerHTML = `<div class="print-modal"><div class="print-modal-header"><div><div class="pm-h1">${esc(title)}</div>${note?`<div class="pm-note">${esc(note)}</div>`:''}</div><div class="pm-meta">${esc(iso)}${scale?' · '+esc(scale):''}</div></div><div class="print-map-wrap"><img src="${dataUrl}" alt="Mapa"/></div><div class="print-modal-actions"><button class="btn btn-primary" id="btnDoPrint"><i class="fas fa-print"></i> Imprimir / PDF</button><button class="btn btn-ghost" id="btnClosePrint"><i class="fas fa-times"></i> Cerrar</button></div></div>`;
  root.body.appendChild(overlay);
  overlay.querySelector('#btnClosePrint')?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#btnDoPrint')?.addEventListener('click', () => { void sheet.offsetHeight; window.print(); });
}

function injectPrintStyles(root) {
  if (root.getElementById('_prtSnt')) return;
  const st = root.createElement('style'); st.id = '_prtSnt';
  st.textContent = '.print-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:14px}.print-modal{width:min(960px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.35);padding:14px}.print-modal-header{display:flex;justify-content:space-between;gap:14px;padding-bottom:10px;border-bottom:1px solid #e5e7eb}.pm-h1{font-weight:900;color:#111827;font-size:14px}.pm-note{color:#6b7280;font-size:12px;margin-top:4px}.pm-meta{color:#6b7280;font-size:12px;text-align:right}.print-map-wrap{margin-top:12px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}.print-map-wrap img{width:100%;height:auto;display:block}.print-modal-actions{display:flex;gap:.5rem;flex-wrap:wrap;justify-content:flex-end;margin-top:12px;padding-top:10px;border-top:1px solid #e5e7eb}.print-sheet{display:none}.sheet-header{display:flex;justify-content:space-between;gap:14px;padding-bottom:10px;border-bottom:1px solid #e5e7eb}.sheet-title{font-size:14px;font-weight:800}.sheet-note{font-size:12px;color:#6b7280;margin-top:4px}.sheet-meta{font-size:12px;color:#6b7280;text-align:right}.sheet-map{margin-top:12px;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden}.sheet-map img{width:100%;height:auto;display:block}.sheet-footer{margin-top:10px;font-size:11px;color:#6b7280;display:flex;justify-content:space-between}@media print{@page{size:A4 landscape;margin:10mm}body *{display:none!important}#printSheet,#printSheet *{display:block!important}#printSheet{position:relative!important;width:100%!important}.sheet-map img{max-height:155mm!important;object-fit:contain!important}}';
  root.head.appendChild(st);
}
