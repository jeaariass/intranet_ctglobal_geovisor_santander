// src/utils/token.js — GeoVisor Santander
export function getToken() {
  return localStorage.getItem('ctg_token');
}
export function getUser() {
  try { return JSON.parse(localStorage.getItem('ctg_user') || '{}'); }
  catch { return {}; }
}
export function getProject() {
  try { return JSON.parse(localStorage.getItem('ctg_project') || '{}'); }
  catch { return {}; }
}
export function getSession() {
  return localStorage.getItem('ctg_session');
}
export function authHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
