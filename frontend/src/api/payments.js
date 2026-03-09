import api from './axios';

/**
 * Initialize Chapa payment for a booking. Returns { checkout_url, tx_ref }.
 * See https://developer.chapa.co/integrations/accept-payments
 */
export async function initializeChapa(bookingId) {
  const { data } = await api.post(`/bookings/${bookingId}/payments/initialize-chapa`);
  return data;
}

export async function verifyChapa(txRef, refId = null) {
  const { data } = await api.post('/payments/verify-chapa', {
    tx_ref: txRef,
    ref_id: refId,
  });
  return data;
}
