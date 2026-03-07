import api from './axios';

export async function list() {
  const { data } = await api.get('/bookings');
  return data;
}

export async function create(body) {
  const { data } = await api.post('/bookings', body);
  return data;
}

export async function approve(id) {
  await api.patch(`/bookings/${id}/approve`);
}

export async function reject(id) {
  await api.patch(`/bookings/${id}/reject`);
}
