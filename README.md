# GeoVisor Santander — CTGlobal CP-001
**Gestor Catastral** | Santander, Tolima | Vite + OpenLayers + Node.js/Express

## Estructura del proyecto
```
gv-santander/
├── backend/                   ← Node.js/Express (puerto 4005)
│   ├── src/
│   │   ├── server.js
│   │   ├── middleware/auth.js
│   │   └── routes/
│   │       ├── verify.js      ← Proxy → intranet CTGlobal
│   │       ├── layers.js      ← Lista de capas WMS
│   │       ├── files.js       ← Listado de PDFs
│   │       └── docs.js        ← Repositorio documental (multer)
│   ├── public/
│   │   ├── pdf/               ← PDFs de planos
│   │   └── docs/              ← Repositorio documental
│   ├── .env                   ← Variables de entorno
│   └── package.json
├── frontend/                  ← Vite + OpenLayers
│   ├── index.html             ← Mapa principal
│   ├── login.html             ← Pantalla de acceso
│   ├── admin-users.html       ← Panel de administración
│   ├── src/
│   │   ├── auth/              ← login.js, guard.js, login.css
│   │   ├── utils/             ← token.js, permissions.js
│   │   ├── services/          ← api.js
│   │   ├── style.css          ← Estilos principales
│   │   └── js/                ← map, layers, identify, measure...
│   ├── vite.config.js         ← base=/SANTANDER/, outDir=SANTANDER
│   └── package.json
└── ecosystem.config.js        ← Configuración PM2
```

## Quickstart (desarrollo)
```bash
# Backend
cd backend
npm install
npm run dev          # → http://localhost:4005

# Frontend (nueva terminal)
cd frontend
npm install
npm run dev          # → http://localhost:5173/SANTANDER/login.html
```

## Credenciales de prueba
El login usa la **Intranet CTGlobal** (`http://localhost:4000`).
La API key del proyecto es: `ctg_live_cp001_santander`

## Build para producción
```bash
cd frontend
npm run build
# Genera: frontend/SANTANDER/
```

## Deploy en VPS (200.7.107.14)
```bash
# 1. Backend
scp -r backend/ root@200.7.107.14:/var/www/geovisores/santander/
cd /var/www/geovisores/santander/backend && npm install --production
pm2 start src/server.js --name gv-santander
pm2 save

# 2. Frontend (desde local)
scp -r frontend/SANTANDER/ root@200.7.107.14:/var/www/geovisores/santander/

# 3. Verificar
curl http://localhost:4005/health
```

## Nginx — 5 bloques a agregar en geo-ctglobal.conf
```nginx
# Bloque 1: Docs sin prefijo
location /gv-santander-docs/ {
    alias /var/www/geovisores/santander/backend/public/;
}
# Bloque 2: API sin prefijo (CRÍTICO para peticiones del frontend)
location /api/gv/santander/ {
    proxy_pass http://localhost:4005/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
# Bloque 3: Docs con prefijo
location /SANTANDER/gv-santander-docs/ {
    alias /var/www/geovisores/santander/backend/public/;
}
# Bloque 4: API con prefijo
location /SANTANDER/api/gv/santander/ {
    proxy_pass http://localhost:4005/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
# Bloque 5: SPA (CRÍTICO: usar 'root', NUNCA 'alias')
location /SANTANDER/ {
    root /var/www/geovisores/santander/;
    try_files $uri $uri/ /SANTANDER/index.html;
}
```

## Workspace GeoServer
`santander_catastro` — las capas se definen en:
- `backend/src/routes/layers.js` → API REST
- `frontend/src/js/layers.js`   → Panel de capas UI
- `frontend/src/js/layerQuery.js` → Consultas WFS

## Checklist antes del deploy
- [ ] `JWT_SECRET` idéntico al de la intranet CTGlobal
- [ ] API key `ctg_live_cp001_santander` registrada en la tabla `proyectos` de la intranet
- [ ] Workspace `santander_catastro` existe en GeoServer con capas publicadas
- [ ] `curl http://localhost:4005/health` responde `{ok:true}`
- [ ] Nginx: 5 bloques agregados, nginx -t pasa, reload ejecutado
- [ ] Build genera la carpeta `SANTANDER/` (no `dist/`)
