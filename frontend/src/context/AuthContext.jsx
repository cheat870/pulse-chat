import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('pulsechat_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await apiRequest('/auth/me');
        setUser(data.user);
      } catch (err) {
        console.error('Session restore error:', err);
        logout();
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
