// src/js/docUpload.js — Panel de subida de documentos (solo EDITOR)
import { gvApi } from '../services/api.js';
import { puedeUsar } from '../utils/permissions.js';

export async function initDocUpload(ctx) {
  const { root, eventBus } = ctx;
  if (!puedeUsar('subirDocumentos')) return;

  const panel = root.querySelector('#docUploadPanel');
  if (!panel) return;
  panel.removeAttribute('hidden');

  const dropzone   = root.querySelector('#docDropzone');
  const fileInput  = root.querySelector('#docFileInput');
  const catSelect  = root.querySelector('#docCategorySelect');
  const progressEl = root.querySelector('#docUploadProgress');
  const progressBar= root.querySelector('#docUploadBar');
  const statusEl   = root.querySelector('#docUploadStatus');
  if (!dropzone || !fileInput || !catSelect) return;

  // Cargar categorías
  try {
    const cats = await gvApi.getCategorias();
    const list = Array.isArray(cats) ? cats : Object.keys(cats);
    catSelect.innerHTML = list.map(c => {
      const key  = typeof c === 'string' ? c : c.key;
      const name = typeof c === 'string' ? c : (c.nombre || c.key);
      return `<option value="${key}">${name}</option>`;
    }).join('');
  } catch { catSelect.innerHTML = '<option value="normativa">Normativa</option><option value="diagnosticos">Diagnósticos</option><option value="cartografia">Cartografía</option>'; }

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.style.borderColor = '#3b82f6'; });
  dropzone.addEventListener('dragleave', () => { dropzone.style.borderColor = ''; });
  dropzone.addEventListener('drop', e => { e.preventDefault(); dropzone.style.borderColor = ''; handleFiles(Array.from(e.dataTransfer.files)); });
  fileInput.addEventListener('change', e => { handleFiles(Array.from(e.target.files)); fileInput.value = ''; });

  async function handleFiles(files) {
    if (!files.length) return;
    const categoria = catSelect.value || 'normativa';
    progressEl?.removeAttribute('hidden');
    if (statusEl) statusEl.textContent = `Subiendo ${files.length} archivo(s)…`;
    if (progressBar) { progressBar.style.width = '0%'; }
    try {
      const result = await gvApi.uploadDocs(categoria, files, pct => {
        if (progressBar) progressBar.style.width = pct + '%';
      });
      if (statusEl) statusEl.textContent = '✓ ' + (result.mensaje || `${files.length} archivo(s) subido(s)`);
      if (progressBar) progressBar.style.width = '100%';
      eventBus.emit('docs:uploaded', { archivos: result.archivos });
      setTimeout(() => { progressEl?.setAttribute('hidden',''); if (statusEl) statusEl.textContent = ''; }, 2500);
    } catch (e) {
      if (statusEl) statusEl.textContent = '✗ Error: ' + e.message;
      setTimeout(() => { progressEl?.setAttribute('hidden',''); }, 3000);
    }
  }
  console.log('[docUpload] listo.');
}
