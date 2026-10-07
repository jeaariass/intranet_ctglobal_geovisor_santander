// routes/verify.js — Proxy de verificación token contra intranet CTGlobal
const router = require('express').Router();
const fetch  = require('node-fetch');
const auth   = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const response = await fetch(process.env.INTRANET_URL + '/api/geoauth/verify', {
      headers: { Authorization: req.headers.authorization || '' },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch {
    // Si la intranet no responde, devolver datos locales del JWT
    res.json({ valid: true, user: { nombre: req.user.nombre, rol: req.user.rol } });
  }
});

module.exports = router;
