import api from './axios';

export async function list() {
  const { data } = await api.get('/conversations');
  return data;
}

export async function getMessages(id) {
  const { data } = await api.get(`/conversations/${id}/messages`);
  return data;
}

export async function markRead(id) {
  await api.patch(`/conversations/${id}/mark-read`);
}

export async function create(body) {
  const { data } = await api.post('/conversations', body);
  return data;
}

export async function sendMessage(id, body) {
  const { data } = await api.post(`/conversations/${id}/messages`, body);
  return data;
}
