// src/js/layers.js — GeoVisor Santander — Panel de capas + z-order dock
import { GEOSERVER_PATH } from './config.js';

const WS = 'santander_catastro';

function mkWMS(layer, title, opts = {}) {
  const { visible = false, zIndex = 300, opacity = 1 } = opts;
  const lyr = new ol.layer.Tile({
    title, visible, opacity,
    source: new ol.source.TileWMS({
      url:        `${GEOSERVER_PATH}/${WS}/wms`,
      params:     { LAYERS: `${WS}:${layer}`, VERSION: '1.1.1', FORMAT: 'image/png', TRANSPARENT: true, TILED: true },
      serverType: 'geoserver', crossOrigin: 'anonymous',
    }),
  });
  lyr.setZIndex(zIndex);
  lyr.set('workspace', WS); lyr.set('layerName', layer); lyr.set('title', title);
  return lyr;
}

const GROUPS = [
  {
    key: 'limites', title: 'Límites Administrativos', icon: 'fa-border-all',
    layers: [
      { id: 'limite_municipal', title: 'Límite Municipal', lyr: () => mkWMS('limite_municipal', 'Límite Municipal', { visible: true,  zIndex: 310 }) },
      { id: 'division_veredal', title: 'División Veredal', lyr: () => mkWMS('division_veredal', 'División Veredal', { visible: false, zIndex: 310 }) },
    ],
  },
  {
    key: 'urbano', title: 'Catastro Urbano', icon: 'fa-city',
    layers: [
      { id: 'manzana',       title: 'Manzanas',        lyr: () => mkWMS('manzana',       'Manzanas',        { visible: false, zIndex: 320 }) },
      { id: 'predio_urbano', title: 'Predios Urbanos', lyr: () => mkWMS('predio_urbano', 'Predios Urbanos', { visible: false, zIndex: 320, opacity: 0.85 }) },
      { id: 'construccion',  title: 'Construcciones',  lyr: () => mkWMS('construccion',  'Construcciones',  { visible: false, zIndex: 320 }) },
      { id: 'barrio',        title: 'Barrios',         lyr: () => mkWMS('barrio',        'Barrios',         { visible: false, zIndex: 320 }) },
    ],
  },
  {
    key: 'rural', title: 'Catastro Rural', icon: 'fa-tree',
    layers: [
      { id: 'predio_rural', title: 'Predios Rurales', lyr: () => mkWMS('predio_rural', 'Predios Rurales', { visible: false, zIndex: 320, opacity: 0.85 }) },
      { id: 'vereda',       title: 'Veredas',         lyr: () => mkWMS('vereda',       'Veredas',         { visible: false, zIndex: 320 }) },
    ],
  },
  {
    key: 'infra', title: 'Infraestructura', icon: 'fa-road',
    layers: [
      { id: 'hidrografia', title: 'Hidrografía', lyr: () => mkWMS('hidrografia', 'Hidrografía', { visible: false, zIndex: 315 }) },
      { id: 'via',         title: 'Vías',        lyr: () => mkWMS('via',         'Vías',        { visible: false, zIndex: 325 }) },
    ],
  },
];

function renderPanel(panelEl, map, eventBus, olLayers) {
  panelEl.innerHTML = '';
  GROUPS.forEach(group => {
    const groupEl = document.createElement('div');
    groupEl.className = 'layer-group';
    groupEl.innerHTML = `
      <div class="layer-group__header">
        <i class="fas ${group.icon}"></i> ${group.title}
      </div>
      <div class="layer-group__body"></div>`;
    const bodyEl = groupEl.querySelector('.layer-group__body');

    group.layers.forEach(def => {
      const lyr     = olLayers.get(def.id); if (!lyr) return;
      const visible = lyr.getVisible();
      const opacity = lyr.getOpacity() ?? 1;
      const itemEl  = document.createElement('div');
      itemEl.className = 'layer-item' + (visible ? ' active' : '');

      itemEl.innerHTML = `
        <div class="layer-row">
          <span class="layer-title">${def.title}</span>
          <button class="layer-btn" title="Mostrar/Ocultar">
            <i class="fas ${visible ? 'fa-eye' : 'fa-eye-slash'}"></i>
          </button>
        </div>
        <div class="layer-controls">
          <i class="fas fa-adjust" style="font-size:.7rem"></i>
          <input class="opacity-slider" type="range" min="0" max="1" step="0.05" value="${opacity}">
        </div>`;

      const eyeBtn  = itemEl.querySelector('.layer-btn');
      const eyeIcon = eyeBtn.querySelector('i');

      function setVisible(v) {
        lyr.setVisible(v);
        itemEl.classList.toggle('active', v);
        eyeIcon.classList.toggle('fa-eye', v);
        eyeIcon.classList.toggle('fa-eye-slash', !v);
        eventBus.emit('layer:visibility', { title: def.title, visible: v });
      }
      eyeBtn.addEventListener('click', e => { e.stopPropagation(); setVisible(!lyr.getVisible()); });

      const slider = itemEl.querySelector('.opacity-slider');
      slider.addEventListener('input', () => {
        lyr.setOpacity(Number(slider.value));
        eventBus.emit('layer:opacity', { title: def.title, opacity: Number(slider.value) });
      });
      bodyEl.appendChild(itemEl);
    });
    panelEl.appendChild(groupEl);
  });
}

function initZDock(zList, map, olLayers, eventBus) {
  const order = [];
  const findLayer = title => { for (const [, l] of olLayers) if (l.get('title') === title) return l; return null; };

  const BASE_Z = 1000;
  function applyZ() { let z = BASE_Z; order.forEach(t => { const l = findLayer(t); l?.setZIndex?.(z); z -= 2; }); }

  function buildItem(title) {
    const lyr = findLayer(title);
    const opacity = lyr?.getOpacity() ?? 1;
    const div = document.createElement('li'); div.className = 'zDock__item'; div.dataset.title = title;
    div.innerHTML = `
      <div class="zDock__row">
        <span class="zDock__handle" draggable="true">☰</span>
        <span class="zDock__title">${title}</span>
      </div>
      <div class="zDock__opacity">
        <input class="zDock__slider" type="range" min="0" max="1" step="0.05" value="${opacity}">
        <span class="zDock__oval">${Math.round(opacity*100)}%</span>
      </div>`;

    const handle = div.querySelector('.zDock__handle');
    const slider = div.querySelector('.zDock__slider');
    const oval   = div.querySelector('.zDock__oval');

    handle.addEventListener('dragstart', ev => { ev.dataTransfer.setData('text/plain', title); div.classList.add('dragging'); });
    handle.addEventListener('dragend',   () => div.classList.remove('dragging'));
    ['pointerdown','touchstart','mousedown'].forEach(e => slider.addEventListener(e, ev => ev.stopPropagation(), { passive: true }));
    slider.addEventListener('input', () => {
      const v = Number(slider.value); oval.textContent = Math.round(v*100)+'%';
      lyr?.setOpacity?.(v); eventBus.emit('layer:opacity', { title, opacity: v });
    });
    return div;
  }

  function render() {
    zList.innerHTML = '';
    order.forEach(t => zList.appendChild(buildItem(t)));
  }

  zList.addEventListener('dragover', ev => {
    ev.preventDefault();
    const dr = zList.querySelector('.zDock__item.dragging'); if (!dr) return;
    const after = Array.from(zList.querySelectorAll('.zDock__item:not(.dragging)'))
      .find(el => ev.clientY <= el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2);
    if (after) zList.insertBefore(dr, after); else zList.appendChild(dr);
  });
  zList.addEventListener('drop', () => {
    order.length = 0;
    zList.querySelectorAll('.zDock__item').forEach(el => order.push(el.dataset.title));
    applyZ();
  });

  eventBus.on('layer:visibility', ({ title, visible }) => {
    if (visible && !order.includes(title)) { order.unshift(title); render(); applyZ(); }
    if (!visible) { const i = order.indexOf(title); if (i >= 0) { order.splice(i, 1); render(); } }
  });

  GROUPS.forEach(g => g.layers.forEach(d => {
    const l = olLayers.get(d.id); if (l?.getVisible()) order.push(d.title);
  }));
  render(); applyZ();
}

export async function initLayers(ctx) {
  const { map, root, eventBus } = ctx;
  if (!map) { console.error('[layers] ctx.map no existe'); return; }

  const olLayers = new Map();
  GROUPS.forEach(g => g.layers.forEach(def => {
    try {
      const lyr = def.lyr(ctx);
      if (lyr) { olLayers.set(def.id, lyr); map.addLayer(lyr); }
    } catch (e) { console.error('[layers]', def.id, e); }
  }));

  const panelEl = root.querySelector('#layersPanel');
  if (panelEl) renderPanel(panelEl, map, eventBus, olLayers);

  const zList = root.querySelector('#zOrderList');
  if (zList) initZDock(zList, map, olLayers, eventBus);

  console.log('[layers] Capas registradas:', [...olLayers.keys()]);
}
