// backend/src/server.js — GeoVisor Santander CP-001
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// OBLIGATORIO para HTTPS + Nginx (según convención CTGlobal)
app.set('trust proxy', 1);

const PORT = process.env.PORT || 4005;

const allowedOrigins = [
  'https://intranet.ctglobal.com.co',
  'https://geo.ctglobal.com.co',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) =>
    (!origin || allowedOrigins.includes(origin))
      ? cb(null, true)
      : cb(new Error('CORS bloqueado: ' + origin)),
  credentials: true,
}));

app.use(express.json());

// Archivos estáticos (accesibles sin auth)
app.use('/pdf',  express.static(path.join(__dirname, '../public/pdf')));
app.use('/docs', express.static(path.join(__dirname, '../public/docs')));

// Health check (sin auth) — para verificación en VPS
app.get('/health', (_, res) => res.json({
  ok: true,
  geovisor: 'santander',
  port: PORT,
  uptime: process.uptime(),
}));

// Rutas protegidas con JWT
const auth = require('./middleware/auth');
app.use('/api/verify', require('./routes/verify'));
app.use('/api/layers', auth, require('./routes/layers'));
app.use('/api/files',  auth, require('./routes/files'));
app.use('/api/docs',   auth, require('./routes/docs'));

// 404 fallback
app.use((req, res) => res.status(404).json({
  error: 'Ruta no encontrada: ' + req.originalUrl,
}));

app.listen(PORT, () => {
  console.log('\n\u{1F5FA}  GeoVisor Backend [santander] \u2192 http://localhost:' + PORT);
  console.log('   Intranet URL : ' + (process.env.INTRANET_URL || '\u26A0 no definida'));
  console.log('   GeoServer    : ' + process.env.GEOSERVER_URL + '/' + (process.env.GEOSERVER_WORKSPACE || ''));
  console.log('   CORS origins : ' + allowedOrigins.join(', ') + '\n');
});
