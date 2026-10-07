// src/auth/guard.js — GeoVisor Santander
export function requireAuth() {
  const token = localStorage.getItem('ctg_token');
  if (!token) { window.location.href = 'login.html'; return null; }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp * 1000 < Date.now()) {
      localStorage.clear();
      window.location.href = 'login.html';
      return null;
    }
  } catch {
    localStorage.clear();
    window.location.href = 'login.html';
    return null;
  }
  return token;
}

export function logout() {
  localStorage.clear();
  window.location.href = 'login.html';
}

export function bindLogout() {
  document.querySelectorAll('[data-logout], #btnLogout').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm('¿Cerrar sesión?')) logout();
    });
  });
}
