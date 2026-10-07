// src/js/admin-users.js — Panel de gestión de usuarios (solo EDITOR)
import { requireAuth, bindLogout, logout } from '../auth/guard.js';
import { aplicarVisibilidad, puedeUsar }   from '../utils/permissions.js';
import { intranetApi }                     from '../services/api.js';
import { getUser, getProject }             from '../utils/token.js';

const token = requireAuth();
if (!token) throw new Error('No autenticado');
if (!puedeUsar('verAdminPanel')) {
  alert('Acceso denegado: se requiere rol EDITOR.');
  window.location.href = 'index.html';
}

aplicarVisibilidad();
bindLogout();

const user    = getUser();
const project = getProject();
document.querySelectorAll('[data-user-nombre]').forEach(el => { el.textContent = user?.nombre || ''; });
document.querySelectorAll('[data-user-rol]').forEach(el => { el.textContent = user?.rol || ''; });

// ── DOM refs ──────────────────────────────────────────────
const tbody        = document.getElementById('usersTableBody');
const searchInput  = document.getElementById('searchInput');
const btnNewUser   = document.getElementById('btnNewUser');
const modal        = document.getElementById('userModal');
const modalTitle   = document.getElementById('modalTitle');
const userForm     = document.getElementById('userForm');
const btnModalClose= document.getElementById('btnModalClose');
const btnModalCancel=document.getElementById('btnModalCancel');
const btnModalSave = document.getElementById('btnModalSave');
const saveBtnText  = document.getElementById('saveBtnText');
const saveBtnSpinner=document.getElementById('saveBtnSpinner');
const modalError   = document.getElementById('modalError');
const pwdHint      = document.getElementById('pwdHint');

let allUsers = [];

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function rolBadge(rol) {
  const colors = { VIEWER: '#0ea5e9', FUNCIONARIO: '#10b981', EDITOR: '#f59e0b' };
  const c = colors[rol] || '#6b7280';
  return `<span style="background:${c}22;color:${c};padding:.2rem .55rem;border-radius:999px;font-size:.72rem;font-weight:700">${esc(rol)}</span>`;
}

function render(list) {
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="tbl-loading">Sin usuarios encontrados.</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(u => `
    <tr>
      <td>${esc(u.nombre)}</td>
      <td>${esc(u.email)}</td>
      <td>${rolBadge(u.rol)}</td>
      <td>
        <span style="color:${u.activo ? '#10b981' : '#dc2626'};font-size:.8rem;font-weight:700">
          ${u.activo ? '● Activo' : '● Inactivo'}
        </span>
      </td>
      <td style="font-size:.8rem;color:#6b7280">
        ${u.expires_at ? new Date(u.expires_at).toLocaleDateString('es-CO') : '—'}
      </td>
      <td>
        <button class="btn-sm btn-ghost" style="color:#374151"
                data-action="edit" data-id="${u.id}" title="Editar">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn-sm btn-ghost" style="color:${u.activo ? '#dc2626' : '#10b981'};margin-left:.25rem"
                data-action="toggle" data-id="${u.id}" title="${u.activo ? 'Desactivar' : 'Activar'}">
          <i class="fas ${u.activo ? 'fa-user-slash' : 'fa-user-check'}"></i>
        </button>
      </td>
    </tr>`).join('');

  // Contadores
  document.getElementById('countFuncionario').textContent = list.filter(u => u.rol === 'FUNCIONARIO').length;
  document.getElementById('countViewer').textContent      = list.filter(u => u.rol === 'VIEWER').length;
  document.getElementById('countEditor').textContent      = list.filter(u => u.rol === 'EDITOR').length;
  document.getElementById('countTotal').textContent       = list.length;
}

async function loadUsers() {
  tbody.innerHTML = `<tr><td colspan="6" class="tbl-loading"><i class="fas fa-spinner fa-spin"></i> Cargando…</td></tr>`;
  try {
    const data = await intranetApi.getUsers(project?.id);
    allUsers = Array.isArray(data) ? data : (data.users || []);
    render(allUsers);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="tbl-loading" style="color:#dc2626">Error: ${esc(e.message)}</td></tr>`;
  }
}

searchInput?.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase();
  render(q ? allUsers.filter(u => u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : allUsers);
});

// ── Modal ─────────────────────────────────────────────────
function openModal(mode, user = null) {
  modalTitle.textContent    = mode === 'create' ? 'Nuevo usuario' : 'Editar usuario';
  pwdHint.style.display     = mode === 'create' ? 'none' : '';
  document.getElementById('userId').value    = user?.id || '';
  document.getElementById('uNombre').value   = user?.nombre || '';
  document.getElementById('uEmail').value    = user?.email || '';
  document.getElementById('uRol').value      = user?.rol || 'VIEWER';
  document.getElementById('uPassword').value = '';
  document.getElementById('uExpiresAt').value= user?.expires_at ? user.expires_at.slice(0,10) : '';
  modalError.hidden = true;
  modal.hidden = false;
  document.getElementById('uNombre').focus();
}
function closeModal() { modal.hidden = true; }
btnModalClose?.addEventListener('click', closeModal);
btnModalCancel?.addEventListener('click', closeModal);
modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });

btnNewUser?.addEventListener('click', () => openModal('create'));

userForm?.addEventListener('submit', async e => {
  e.preventDefault();
  modalError.hidden = true;
  const id  = document.getElementById('userId').value;
  const dto = {
    nombre:     document.getElementById('uNombre').value.trim(),
    email:      document.getElementById('uEmail').value.trim(),
    rol:        document.getElementById('uRol').value,
    password:   document.getElementById('uPassword').value || undefined,
    expires_at: document.getElementById('uExpiresAt').value || undefined,
  };
  if (!dto.nombre || !dto.email) {
    modalError.textContent = 'Nombre y correo son requeridos.';
    modalError.hidden = false; return;
  }
  saveBtnText.style.display  = 'none';
  saveBtnSpinner.hidden      = false;
  btnModalSave.disabled      = true;
  try {
    if (id) await intranetApi.updateUser(project?.id, id, dto);
    else     await intranetApi.createUser(project?.id, dto);
    closeModal(); await loadUsers();
  } catch (err) {
    modalError.textContent = err.message; modalError.hidden = false;
  } finally {
    saveBtnText.style.display  = '';
    saveBtnSpinner.hidden      = true;
    btnModalSave.disabled      = false;
  }
});

tbody?.addEventListener('click', async e => {
  const btn = e.target.closest('[data-action]'); if (!btn) return;
  const id  = btn.dataset.id;
  if (btn.dataset.action === 'edit') {
    const u = allUsers.find(x => String(x.id) === String(id));
    if (u) openModal('edit', u);
  }
  if (btn.dataset.action === 'toggle') {
    btn.disabled = true;
    try { await intranetApi.toggleUser(project?.id, id); await loadUsers(); }
    catch (err) { alert('Error: ' + err.message); btn.disabled = false; }
  }
});

loadUsers();
