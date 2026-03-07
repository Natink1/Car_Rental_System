import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { setAuthToken } from '../api/axios';
import * as authApi from '../api/auth';
import { disconnectEcho } from '../echo';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await authApi.getMe();
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
    } catch {
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const handleLogout = () => {
      setUser(null);
    };
    window.addEventListener('auth-logout', handleLogout);
    return () => window.removeEventListener('auth-logout', handleLogout);
  }, []);

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    setAuthToken(data.token);
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  };

  const register = async (name, email, password, password_confirmation, role, idImageFile = null, phone = '') => {
    let payload;
    if (idImageFile) {
      payload = new FormData();
      payload.append('name', name);
      payload.append('email', email);
      payload.append('password', password);
      payload.append('password_confirmation', password_confirmation);
      payload.append('role', role || 'customer');
      payload.append('id_image', idImageFile);
      if (phone) payload.append('phone', phone);
    } else {
      payload = {
        name,
        email,
        password,
        password_confirmation,
        role: role || 'customer',
        ...(phone && { phone }),
      };
    }
    const data = await authApi.register(payload);
    setAuthToken(data.token);
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (_) {}
    disconnectEcho();
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('user');
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isOwner: user?.role === 'owner',
    isCustomer: user?.role === 'customer',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
