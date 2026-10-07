// routes/docs.js — Repositorio documental GeoVisor Santander
const router  = require('express').Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const DOCS_BASE = path.join(__dirname, '../../public/docs');

// Categorías del repositorio documental (adaptar según municipio)
const CATEGORIAS = {
  normativa:    { nombre: 'Normativa',     capas: ['limite_municipal', 'division_veredal'] },
  diagnosticos: { nombre: 'Diagnósticos',  capas: ['predio_urbano', 'predio_rural'] },
  cartografia:  { nombre: 'Cartografía',   capas: ['manzana', 'hidrografia', 'via'] },
};

// Crear directorios si no existen
Object.keys(CATEGORIAS).forEach(cat => {
  const dir = path.join(DOCS_BASE, cat);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const ALLOWED_EXT  = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.xlsx', '.docx'];
const ALLOWED_MIME = [
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function guessType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return 'image';
  return 'office';
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const cat = (req.body.categoria || req.query.categoria || 'normativa').toLowerCase();
    cb(null, path.join(DOCS_BASE, CATEGORIAS[cat] ? cat : 'normativa'));
  },
  filename(req, file, cb) {
    const safe = path.basename(
      Buffer.from(file.originalname, 'latin1').toString('utf8')
    ).replace(/[<>:"/\\|?*]/g, '_');
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    (ALLOWED_EXT.includes(ext) || ALLOWED_MIME.includes(file.mimetype))
      ? cb(null, true)
      : cb(new Error('Tipo no permitido: ' + ext));
  },
});

// GET /api/docs/manifest — catalogo completo
router.get('/manifest', (req, res) => {
  try {
    const manifest = Object.entries(CATEGORIAS).map(([key, meta]) => {
      const dir   = path.join(DOCS_BASE, key);
      let files   = [];
      if (fs.existsSync(dir)) {
        files = fs.readdirSync(dir)
          .filter(f => {
            const ext = path.extname(f).toLowerCase();
            return ALLOWED_EXT.includes(ext) && !f.startsWith('.');
          })
          .map(f => ({
            id:    key + '_' + f.replace(/\W/g, '_'),
            title: path.basename(f, path.extname(f)),
            file:  'docs/' + key + '/' + f,
            type:  guessType(f),
          }));
      }
      return { key, name: meta.nombre, layers: meta.capas, files };
    });
    res.json(manifest);
  } catch (e) {
    res.status(500).json({ error: 'Error generando catálogo', detail: e.message });
  }
});

// POST /api/docs/upload — subir archivos
router.post('/upload', upload.array('files', 20), (req, res) => {
  try {
    if (!req.files?.length)
      return res.status(400).json({ error: 'No se recibieron archivos' });
    const cat     = (req.body.categoria || 'normativa').toLowerCase();
    const catInfo = CATEGORIAS[cat] || CATEGORIAS.normativa;
    const subidos = req.files.map(f => ({
      nombre:           f.filename,
      categoria:        cat,
      nombre_categoria: catInfo.nombre,
      tipo:             guessType(f.filename),
      tamano_kb:        Math.round(f.size / 1024),
      ruta:             'docs/' + cat + '/' + f.filename,
    }));
    res.json({
      success: true,
      mensaje: subidos.length + ' archivo(s) subido(s) a "' + catInfo.nombre + '"',
      archivos: subidos,
    });
  } catch (e) {
    res.status(500).json({ error: 'Error al subir archivos', detail: e.message });
  }
});

// GET /api/docs/file/:categoria/:nombre — descarga con auth
router.get('/file/:categoria/:nombre', (req, res) => {
  const { categoria, nombre } = req.params;
  if (!CATEGORIAS[categoria])
    return res.status(400).json({ error: 'Categoría inválida' });
  const filePath = path.join(DOCS_BASE, categoria, path.basename(nombre));
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: 'Archivo no encontrado' });
  res.sendFile(filePath);
});

// DELETE /api/docs/file/:categoria/:nombre — solo EDITOR
router.delete('/file/:categoria/:nombre', (req, res) => {
  if (req.user?.rol !== 'EDITOR')
    return res.status(403).json({ error: 'Solo EDITOR puede eliminar archivos' });
  const { categoria, nombre } = req.params;
  if (!CATEGORIAS[categoria])
    return res.status(400).json({ error: 'Categoría inválida' });
  const filePath = path.join(DOCS_BASE, categoria, path.basename(nombre));
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: 'Archivo no encontrado' });
  fs.unlinkSync(filePath);
  res.json({ success: true, mensaje: '"' + path.basename(nombre) + '" eliminado de ' + categoria });
});

// GET /api/docs/categorias — lista de categorías
router.get('/categorias', (req, res) => {
  res.json(Object.entries(CATEGORIAS).map(([key, v]) => ({
    key, nombre: v.nombre, capas: v.capas,
  })));
});

module.exports = router;
