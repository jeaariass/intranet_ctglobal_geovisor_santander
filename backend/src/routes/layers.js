// routes/layers.js — GeoVisor Santander (Gestor Catastral)
// Workspace GeoServer: santander_catastro
const router = require('express').Router();

// ↓↓↓ ADAPTAR: lista de capas WMS del municipio ↓↓↓
const WMS_LAYERS = [
  // ── LÍMITES ADMINISTRATIVOS ──────────────────────────────────
  { id: 'limite_municipal', name: 'Límite Municipal',  workspace: 'santander_catastro', grupo: 'Límites',          visible: true  },
  { id: 'division_veredal', name: 'División Veredal',  workspace: 'santander_catastro', grupo: 'Límites',          visible: false },
  // ── CATASTRO URBANO ──────────────────────────────────────────
  { id: 'manzana',          name: 'Manzanas',          workspace: 'santander_catastro', grupo: 'Catastro Urbano',  visible: false },
  { id: 'predio_urbano',    name: 'Predios Urbanos',   workspace: 'santander_catastro', grupo: 'Catastro Urbano',  visible: false },
  { id: 'construccion',     name: 'Construcciones',    workspace: 'santander_catastro', grupo: 'Catastro Urbano',  visible: false },
  { id: 'barrio',           name: 'Barrios',           workspace: 'santander_catastro', grupo: 'Catastro Urbano',  visible: false },
  // ── CATASTRO RURAL ───────────────────────────────────────────
  { id: 'predio_rural',     name: 'Predios Rurales',   workspace: 'santander_catastro', grupo: 'Catastro Rural',   visible: false },
  { id: 'vereda',           name: 'Veredas',           workspace: 'santander_catastro', grupo: 'Catastro Rural',   visible: false },
  // ── INFRAESTRUCTURA ──────────────────────────────────────────
  { id: 'hidrografia',      name: 'Hidrografía',       workspace: 'santander_catastro', grupo: 'Infraestructura',  visible: false },
  { id: 'via',              name: 'Vías',              workspace: 'santander_catastro', grupo: 'Infraestructura',  visible: false },
];
// ↑↑↑ ADAPTAR ↑↑↑

router.get('/', (req, res) => {
  res.json({
    geoserverUrl:       process.env.GEOSERVER_URL,
    geoserverWorkspace: process.env.GEOSERVER_WORKSPACE,
    center: { lon: -73.3668, lat: 6.8958, zoom: 14 },
    layers: WMS_LAYERS,
  });
});

module.exports = router;
