// src/js/docRepo.js — Repositorio documental UI
import { gvApi } from '../services/api.js';
import { puedeUsar } from '../utils/permissions.js';

const GV_API = import.meta.env.VITE_API_URL; // /api/gv/santander
const DOCS_BASE = GV_API.replace('/api/gv/santander', '') + '/gv-santander-docs/docs/';

export async function initDocRepo(ctx) {
  const { root, eventBus } = ctx;
  const listEl    = root.querySelector('#docRepoList');
  const loadingEl = root.querySelector('#docRepoLoading');
  const emptyEl   = root.querySelector('#docRepoEmpty');
  if (!listEl) return;

  const esc = s => String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const ICONS  = { pdf: 'fa-file-pdf', image: 'fa-file-image', office: 'fa-file-word' };
  const COLORS = { pdf: '#ef4444', image: '#8b5cf6', office: '#3b82f6' };
  function guessType(f) { const e=f.split('.').pop().toLowerCase(); if(e==='pdf')return'pdf'; if(['jpg','jpeg','png','webp'].includes(e))return'image'; return'office'; }

  async function load() {
    loadingEl?.removeAttribute('hidden'); listEl.innerHTML = '';
    try {
      const manifest = await gvApi.getManifest();
      loadingEl?.setAttribute('hidden','');
      const hasFiles = Object.values(manifest).some(v => Array.isArray(v) ? v.length > 0 : Object.values(v).some(a=>a.length>0));
      if (!hasFiles) { emptyEl?.removeAttribute('hidden'); return; }
      emptyEl?.setAttribute('hidden','');

      const cats = Array.isArray(manifest) ? manifest : Object.entries(manifest).map(([k,v])=>({key:k,name:k,files:Array.isArray(v)?v:Object.entries(v).flatMap(([,a])=>a)}));
      cats.forEach(cat => {
        const files = Array.isArray(cat.files) ? cat.files : [];
        if (!files.length) return;
        const section = document.createElement('div'); section.className = 'doc-category';
        section.innerHTML = `<div class="doc-category__header"><i class="fas fa-folder-open"></i> ${esc(cat.name||cat.key)} <span class="badge badge-blue">${files.length}</span></div>`;
        const filesEl = document.createElement('div'); filesEl.className = 'doc-category__files';
        files.forEach(fname => {
          const name  = typeof fname === 'string' ? fname : fname.nombre || fname;
          const type  = guessType(name);
          const icon  = ICONS[type] || 'fa-file';
          const color = COLORS[type] || '#6b7280';
          const catKey = cat.key || cat.nombre;
          const docUrl = DOCS_BASE + catKey + '/' + encodeURIComponent(name);
          const canDel = puedeUsar('subirDocumentos');
          const item = document.createElement('div'); item.className = 'doc-item';
          item.innerHTML = `<div class="doc-item__icon" style="color:${color}"><i class="fas ${icon}"></i></div><div class="doc-item__info"><span class="doc-item__title">${esc(name.replace(/\.[^.]+$/,''))}</span><span class="doc-item__type">${type.toUpperCase()}</span></div><div class="doc-item__actions"><a href="${docUrl}" target="_blank" rel="noopener" class="btn-icon" title="Abrir"><i class="fas fa-external-link-alt"></i></a>${canDel?`<button class="btn-icon btn-del-doc" data-cat="${esc(catKey)}" data-file="${esc(name)}" title="Eliminar" style="color:#f87171"><i class="fas fa-trash"></i></button>`:''}</div>`;
          filesEl.appendChild(item);
        });
        section.appendChild(filesEl); listEl.appendChild(section);
      });

      listEl.addEventListener('click', async e => {
        const btn = e.target.closest('.btn-del-doc'); if (!btn) return;
        if (!confirm('¿Eliminar este archivo?')) return;
        try { await gvApi.deleteDoc(btn.dataset.cat, btn.dataset.file); load(); }
        catch (err) { alert('Error: ' + err.message); }
      });
    } catch (e) {
      loadingEl?.setAttribute('hidden','');
      listEl.innerHTML = `<div style="color:#f87171;font-size:.8rem;padding:.5rem">Error cargando documentos: ${esc(e.message)}</div>`;
    }
  }

  eventBus.on('docs:uploaded', () => load());
  await load();
  console.log('[docRepo] listo.');
}
