// src/js/config.js
// http://200.7.107.14:8080/geoserver → /geoserver (pasa por proxy Vite/Nginx)
export const GEOSERVER_PATH = (() => {
  try {
    const project = JSON.parse(localStorage.getItem('ctg_project') || '{}');
    if (project.geoserver_url)
      return project.geoserver_url.replace(/^https?:\/\/[^/]+/, '') || '/geoserver';
  } catch {}
  return '/geoserver';
})();
