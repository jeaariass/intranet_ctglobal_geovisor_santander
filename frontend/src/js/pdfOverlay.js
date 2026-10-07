// src/js/pdfOverlay.js — Capas WMS de planos georreferenciados
// Para agregar planos: agregar entradas a PDF_LAYERS
import { GEOSERVER_PATH } from './config.js';
const PDF_LAYERS = [
  // { id: 'plano_catastral', name: 'Plano Catastral 2024', workspace: 'santander_catastro', layer: 'plano_catastral' },
];

export async function initPdfOverlay(ctx) {
  const { map } = ctx;
  if (!map || !PDF_LAYERS.length) {
    console.log('[pdfOverlay] Sin capas PDF configuradas.');
    return;
  }
  for (const def of PDF_LAYERS) {
    try {
      const lyr = new ol.layer.Tile({
        title: def.name, visible: false,
        source: new ol.source.TileWMS({
          url: `${GEOSERVER_PATH}/${def.workspace}/wms`,
          params: { LAYERS: `${def.workspace}:${def.layer}`, VERSION: '1.1.1', FORMAT: 'image/png', TRANSPARENT: true, TILED: true },
          serverType: 'geoserver', crossOrigin: 'anonymous',
        }),
      });
      lyr.setZIndex(350); lyr.set('title', def.name); lyr.set('workspace', def.workspace); lyr.set('layerName', def.layer);
      map.addLayer(lyr);
      console.log('[pdfOverlay] Capa agregada:', def.name);
    } catch (e) { console.error('[pdfOverlay]', def.id, e); }
  }
}
