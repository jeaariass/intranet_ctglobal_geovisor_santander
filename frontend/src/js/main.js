// src/js/main.js — Bootstrap GeoVisor Santander CP-001
import { requireAuth, bindLogout }       from '../auth/guard.js';
import { puedeUsar, aplicarVisibilidad } from '../utils/permissions.js';
import { intranetApi }                   from '../services/api.js';
import { getUser }                       from '../utils/token.js';

// ── 1. Verificar autenticación ───────────────────────────
const token = requireAuth();
if (!token) throw new Error('No autenticado'); // guard.js ya redirige

window.addEventListener('beforeunload', () => intranetApi.sessionEnd());

// ── 2. EventBus ──────────────────────────────────────────
class EventBus {
  constructor() { this._l = {}; }
  on(e, fn)  { (this._l[e] ??= []).push(fn); }
  emit(e, d) { (this._l[e] || []).forEach(fn => fn(d)); }
}

// ── 3. Bootstrap ─────────────────────────────────────────
async function bootstrap() {
  aplicarVisibilidad();
  bindLogout();

  // Datos del usuario en el header
  const user = getUser();
  if (user?.nombre) {
    document.querySelectorAll('[data-user-nombre]').forEach(el => { el.textContent = user.nombre; });
    document.querySelectorAll('[data-user-rol]').forEach(el => { el.textContent = user.rol; });
    const initials = document.getElementById('userInitials');
    if (initials) initials.textContent = user.nombre.charAt(0).toUpperCase();
  }

  const ctx = {
    eventBus: new EventBus(),
    mapEl:    document.getElementById('map'),
    root:     document,
    map:      null, // map.js lo asigna
  };

  // CRÍTICO: mapa y capas SIEMPRE primero
  const { initMap }    = await import('./map.js');
  await initMap(ctx);

  const { initLayers } = await import('./layers.js');
  await initLayers(ctx);

  // ── Herramientas condicionales por permiso ─────────────
  // NUNCA usar @vite-ignore — rompe el build en producción (Bug #1 CTGlobal)
  if (puedeUsar('identificarFeature')) {
    try { const { initIdentify }         = await import('./identify.js');       await initIdentify(ctx);        } catch(e) { console.warn('[GV] identify:', e.message); }
  }
  if (puedeUsar('medirArea')) {
    try { const { initMeasure }          = await import('./measure.js');        await initMeasure(ctx);         } catch(e) { console.warn('[GV] measure:', e.message); }
  }
  if (puedeUsar('verTablaAtributos')) {
    try { const { initLayerQueryUI }     = await import('./layerQuery.js');     await initLayerQueryUI(ctx.map); } catch(e) { console.warn('[GV] layerQuery:', e.message); }
  }
  if (puedeUsar('imprimirMapa')) {
    try { const { initPrint }            = await import('./print.js');          await initPrint(ctx);           } catch(e) { console.warn('[GV] print:', e.message); }
  }
  if (puedeUsar('subirArchivos')) {
    try { const { initUploadModule }     = await import('./upload.js');         await initUploadModule(ctx);    } catch(e) { console.warn('[GV] upload:', e.message); }
  }
  if (puedeUsar('capturaCoords')) {
    try { const { initCoordinatePicker } = await import('./coordpicker.js');    await initCoordinatePicker(ctx); } catch(e) { console.warn('[GV] coordpicker:', e.message); }
  }
  if (puedeUsar('verStreet360')) {
    try { const { initStreet360 }        = await import('./street360.js');      await initStreet360(ctx);       } catch(e) { console.warn('[GV] street360:', e.message); }
  }

  // Repositorio documental (todos los roles pueden ver, solo EDITOR sube)
  try {
    const { initDocRepo }   = await import('./docRepo.js');
    const { initDocUpload } = await import('./docUpload.js');
    await initDocRepo(ctx);
    await initDocUpload(ctx);
  } catch(e) { console.warn('[GV] docRepo:', e.message); }

  try {
    const { initPdfOverlay } = await import('./pdfOverlay.js');
    await initPdfOverlay(ctx);
  } catch(e) { console.warn('[GV] pdfOverlay:', e.message); }

  console.log('[GeoVisor] ✓ Santander — Gestor Catastral CP-001 listo.');
}

bootstrap().catch(err => console.error('[GeoVisor] Error fatal:', err));
