import api from './axios';

export async function getUsers() {
  const { data } = await api.get('/admin/users');
  return data;
}

export async function createUser(payload) {
  const { data } = await api.post('/admin/users', payload);
  return data;
}

export async function updateUser(id, payload) {
  const { data } = await api.patch(`/admin/users/${id}`, payload);
  return data;
}

export async function resetUserPassword(id, payload) {
  const { data } = await api.patch(`/admin/users/${id}/password`, payload);
  return data;
}

export async function getCarsPending() {
  const { data } = await api.get('/admin/cars/pending');
  return data;
}

export async function carApprove(id) {
  await api.patch(`/admin/cars/${id}/approve`);
}

export async function carReject(id) {
  await api.patch(`/admin/cars/${id}/reject`);
}
