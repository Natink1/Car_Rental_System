import api from './axios';

export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
}

export async function register(payload) {
  const { data } = await api.post('/auth/register', payload);
  return data;
}

export async function logout() {
  await api.post('/auth/logout');
}

export async function changePassword(body) {
  await api.patch('/auth/password', body);
}
