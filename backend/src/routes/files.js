// routes/files.js — Listado de PDFs en public/pdf/
const router = require('express').Router();
const path   = require('path');
const fs     = require('fs');

const PDF_DIR = path.join(__dirname, '../../public/pdf');

router.get('/pdfs', (req, res) => {
  try {
    if (!fs.existsSync(PDF_DIR)) return res.json({ pdfs: [] });
    const pdfs = fs.readdirSync(PDF_DIR)
      .filter(f => f.toLowerCase().endsWith('.pdf'))
      .map(f => ({ nombre: f, url: '/pdf/' + f }));
    res.json({ pdfs });
  } catch (e) {
    res.status(500).json({ error: 'Error leyendo directorio PDF', detail: e.message });
  }
});

module.exports = router;
