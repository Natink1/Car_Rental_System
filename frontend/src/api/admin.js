import api from './axios';

export async function getUsers() {
  const { data } = await api.get('/admin/users');
  return data;
}

export async function createUser(payload) {
  const { data } = await api.post('/admin/users', payload);
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
