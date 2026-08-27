import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('pulsechat_token'));
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('pulsechat_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!user && !!token);

  // Helper to persist user state & localStorage together
  const persistUser = (userData) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('pulsechat_user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('pulsechat_user');
    }
  };

  // Decode user from JWT payload (no server needed)
  const decodeJwt = (t) => {
    try {
      const payload = t.split('.')[1];
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

      // Check token expiration locally
      const decoded = decodeJwt(token);
      if (decoded && decoded.exp && decoded.exp * 1000 < Date.now()) {
        // Token is truly expired — force logout
        logout();
        setLoading(false);
        return;
      }

      // If user info is not loaded in state yet, restore minimal from decoded JWT
      if (!user && decoded) {
        persistUser({ id: decoded.id, username: decoded.username, avatar_url: null, status_text: '' });
      }

      try {
        const data = await apiRequest('/auth/me');
        if (data && data.user) {
          persistUser(data.user);
        }
      } catch (err) {
        if (err.status === 401) {
          console.warn('Token invalid — logging out');
          logout();
        } else {
          console.warn('Server unreachable — keeping saved user session alive:', err.message);
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
    persistUser(data.user);
    return data;
  };

  const register = async (formData) => {
    const data = await apiRequest('/auth/register', 'POST', formData, true);
    localStorage.setItem('pulsechat_token', data.token);
    setToken(data.token);
    persistUser(data.user);
    return data;
  };

  const loginWithGoogle = async (googleData) => {
    const data = await apiRequest('/auth/google', 'POST', googleData);
    localStorage.setItem('pulsechat_token', data.token);
    setToken(data.token);
    persistUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('pulsechat_token');
    localStorage.removeItem('pulsechat_user');
    setToken(null);
    setUser(null);
  };

  const updateUserProfile = (updatedUser) => {
    persistUser(updatedUser);
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
