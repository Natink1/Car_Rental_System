import api from './axios';

export async function list() {
  const { data } = await api.get('/admins');
  return data;
}
