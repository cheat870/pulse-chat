import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('pulsechat_token'));
  const [loading, setLoading] = useState(true);

  // Decode user from JWT payload (no server needed)
  const decodeJwt = (token) => {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  };

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }

      // First: decode token locally to restore session immediately (no network needed)
      const decoded = decodeJwt(token);
      if (decoded && decoded.exp * 1000 < Date.now()) {
        // Token is truly expired — force logout
        logout();
        setLoading(false);
        return;
      }

      try {
        const data = await apiRequest('/auth/me');
        setUser(data.user);
      } catch (err) {
        // Only logout on 401 Unauthorized (invalid/revoked token)
        // Keep session alive on network errors, 500, 503 (server waking up)
        if (err.status === 401) {
          console.warn('Token invalid — logging out');
          logout();
        } else {
          console.warn('Server unreachable — keeping session alive:', err.message);
          // Restore minimal user from JWT payload so app stays usable
          if (decoded) {
            setUser({ id: decoded.id, username: decoded.username, avatar_url: null, status_text: '' });
          }
        }
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = async (loginId, password) => {
    const data = await apiRequest('/auth/login', 'POST', { loginId, password });
    localStorage.setItem('pulsechat_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (formData) => {
    const data = await apiRequest('/auth/register', 'POST', formData, true);
    localStorage.setItem('pulsechat_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const loginWithGoogle = async (googleData) => {
    const data = await apiRequest('/auth/google', 'POST', googleData);
    localStorage.setItem('pulsechat_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('pulsechat_token');
    setToken(null);
    setUser(null);
  };

  const updateUserProfile = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, loginWithGoogle, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
