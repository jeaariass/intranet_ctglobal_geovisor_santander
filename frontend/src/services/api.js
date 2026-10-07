// src/services/api.js — GeoVisor Santander
import { getToken } from '../utils/token.js';

const API_BASE      = import.meta.env.VITE_API_URL;      // /api/gv/santander
const INTRANET_BASE = import.meta.env.VITE_INTRANET_URL; // /api/intranet

async function apiFetch(baseUrl, path, options = {}) {
  const token = getToken();
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.json();
}

export const gvApi = {
  getLayers:   () => apiFetch(API_BASE, '/layers'),
  getManifest: () => apiFetch(API_BASE, '/docs/manifest'),
  getCategorias: () => apiFetch(API_BASE, '/docs/categorias'),
  getFiles:    () => apiFetch(API_BASE, '/files/pdfs'),
  deleteDoc:   (cat, nombre) => apiFetch(API_BASE, `/docs/file/${cat}/${encodeURIComponent(nombre)}`, { method: 'DELETE' }),
  uploadDocs(categoria, files, onProgress) {
    const token = getToken();
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append('categoria', categoria);
      files.forEach(f => fd.append('files', f));
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/docs/upload`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      if (onProgress) xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100));
      });
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          xhr.status < 300 ? resolve(data) : reject(new Error(data.error || 'Error ' + xhr.status));
        } catch { reject(new Error('Respuesta inválida')); }
      };
      xhr.onerror = () => reject(new Error('Error de red'));
      xhr.send(fd);
    });
  },
};

export const intranetApi = {
  verify: () => apiFetch(INTRANET_BASE, '/api/geoauth/verify'),
  sessionEnd() {
    const sessionId = localStorage.getItem('ctg_session');
    if (!sessionId) return;
    // sendBeacon funciona al cerrar pestaña (beforeunload)
    navigator.sendBeacon(
      `${INTRANET_BASE}/api/geoauth/session-end`,
      JSON.stringify({ sessionId })
    );
  },
  getUsers:    (proyId)      => apiFetch(INTRANET_BASE, `/api/geoprojects/${proyId}/users`),
  createUser:  (proyId, d)   => apiFetch(INTRANET_BASE, `/api/geoprojects/${proyId}/users`,              { method: 'POST',  body: JSON.stringify(d) }),
  updateUser:  (proyId, uid, d) => apiFetch(INTRANET_BASE, `/api/geoprojects/${proyId}/users/${uid}`,   { method: 'PUT',   body: JSON.stringify(d) }),
  toggleUser:  (proyId, uid) => apiFetch(INTRANET_BASE, `/api/geoprojects/${proyId}/users/${uid}/toggle`, { method: 'PATCH' }),
};
