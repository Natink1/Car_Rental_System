import api from './axios';

export async function getAdmin() {
  const { data } = await api.get('/dashboard/admin');
  return data;
}

export async function getCustomer() {
  const { data } = await api.get('/dashboard/customer');
  return data;
}

export async function getOwner() {
  const { data } = await api.get('/dashboard/owner');
  return data;
}
