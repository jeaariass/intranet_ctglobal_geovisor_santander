// src/utils/permissions.js — GeoVisor Santander
const PERMISOS = {
  VIEWER: [
    'verCapas', 'identificarFeature', 'medirArea', 'verTablaAtributos',
  ],
  FUNCIONARIO: [
    'verCapas', 'identificarFeature', 'medirArea', 'verTablaAtributos',
    'imprimirMapa', 'capturaCoords', 'subirArchivos', 'verStreet360',
  ],
  EDITOR: [
    'verCapas', 'identificarFeature', 'medirArea', 'verTablaAtributos',
    'imprimirMapa', 'capturaCoords', 'subirArchivos', 'verStreet360',
    'subirDocumentos', 'verAdminPanel',
  ],
};

export function puedeUsar(permiso) {
  try {
    const user = JSON.parse(localStorage.getItem('ctg_user') || '{}');
    return (PERMISOS[user.rol] || []).includes(permiso);
  } catch { return false; }
}

export function aplicarVisibilidad() {
  document.querySelectorAll('[data-permiso]').forEach(el => {
    if (!puedeUsar(el.dataset.permiso)) el.style.display = 'none';
  });
}
