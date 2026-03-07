import api from './axios';

export async function list(params = {}) {
  const { data } = await api.get('/cars', { params });
  return data;
}

export async function getById(id) {
  const { data } = await api.get(`/cars/${id}`);
  return data;
}

export async function getReviews(id) {
  const { data } = await api.get(`/cars/${id}/reviews`);
  return data;
}

export async function createCar(formData) {
  const { data } = await api.post('/cars', formData);
  return data;
}

export async function updateCar(id, formData) {
  const { data } = await api.post(`/cars/${id}`, formData);
  return data;
}

export async function deleteCar(id) {
  await api.delete(`/cars/${id}`);
}

export async function reapply(id) {
  await api.patch(`/cars/${id}/reapply`);
}

export async function createReview(id, body) {
  const { data } = await api.post(`/cars/${id}/reviews`, body);
  return data;
}
