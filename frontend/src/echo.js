import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const REVERB_KEY = import.meta.env.VITE_REVERB_APP_KEY || 'nhk-key';
const REVERB_HOST = import.meta.env.VITE_REVERB_HOST || 'localhost';
const REVERB_PORT = import.meta.env.VITE_REVERB_PORT || '8080';
const REVERB_SCHEME = import.meta.env.VITE_REVERB_SCHEME || 'http';

window.Pusher = Pusher;

let echoInstance = null;

export function getEcho() {
  if (echoInstance) return echoInstance;
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    echoInstance = new Echo({
      broadcaster: 'pusher',
      key: REVERB_KEY,
      wsHost: REVERB_HOST,
      wsPort: REVERB_PORT,
      wssPort: REVERB_PORT,
      forceTLS: REVERB_SCHEME === 'https',
      disableStats: true,
      enabledTransports: ['ws', 'wss'],
      authEndpoint: `${API_BASE}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    });
    return echoInstance;
  } catch (_) {
    return null;
  }
}

export function disconnectEcho() {
  if (echoInstance) {
    try { echoInstance.disconnect(); } catch (_) {}
    echoInstance = null;
  }
}
