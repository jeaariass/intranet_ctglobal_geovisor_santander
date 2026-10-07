// src/auth/login.js — GeoVisor Santander
const API_KEY  = import.meta.env.VITE_PROJECT_API_KEY;
const INTRANET = import.meta.env.VITE_INTRANET_URL; // /api/intranet

document.addEventListener('DOMContentLoaded', () => {
  const form    = document.getElementById('loginForm');
  const btnLogin= document.getElementById('loginBtn');
  const btnText = document.getElementById('btnLoginText');
  const spinner = document.getElementById('btnLoginSpinner');
  const errEl   = document.getElementById('loginError');
  const errTxt  = document.getElementById('loginErrorText');
  const togglePwd = document.getElementById('togglePwd');
  const pwdInput  = document.getElementById('loginPassword');

  togglePwd?.addEventListener('click', () => {
    const show = pwdInput.type === 'password';
    pwdInput.type = show ? 'text' : 'password';
    togglePwd.querySelector('i').className = show ? 'fas fa-eye-slash' : 'fas fa-eye';
  });

  function showError(msg) {
    if (errTxt) errTxt.textContent = msg;
    errEl.hidden = false;
  }
  function setLoading(on) {
    btnLogin.disabled = on;
    if (btnText)  btnText.style.display   = on ? 'none' : '';
    if (spinner)  spinner.hidden = !on;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.hidden = true;

    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) return showError('Completa todos los campos.');

    setLoading(true);
    try {
      const res = await fetch(`${INTRANET}/api/geoauth/login`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key':    API_KEY,
        },
        body:        JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || `Error ${res.status}`);

      localStorage.setItem('ctg_token',   data.token);
      localStorage.setItem('ctg_session', data.sessionId || '');
      localStorage.setItem('ctg_user',    JSON.stringify(data.user));
      localStorage.setItem('ctg_project', JSON.stringify(data.project));

      window.location.href = 'index.html';
    } catch (err) {
      showError(err.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  });
});
