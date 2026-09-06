import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { saveLocalUserProfile, getLocalUserProfile, syncDataToServer } from '../services/persistence';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('pulsechat_token'));
  const [user, setUser] = useState(() => {
    try {
      const persisted = getLocalUserProfile();
      if (persisted) return persisted;
      const savedUser = localStorage.getItem('pulsechat_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(!user && !!token);

  // Helper to persist user state & localStorage together
  const persistUser = (userData) => {
    if (userData) {
      setUser(prev => {
        const merged = { ...prev, ...userData };
        localStorage.setItem('pulsechat_user', JSON.stringify(merged));
        saveLocalUserProfile(merged);
        return merged;
      });
    } else {
      setUser(null);
      localStorage.removeItem('pulsechat_user');
      localStorage.removeItem('pulsechat_persisted_profile');
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
        persistUser({ id: decoded.id, username: decoded.username, avatar_url: null, status_text: 'Available', bio: '' });
      }

      try {
        const data = await apiRequest('/auth/me');
        if (data && data.user) {
          // Merge safely so server restart stubs don't overwrite saved local avatar/bio
          setUser(prev => {
            const merged = {
              ...prev,
              ...data.user,
              avatar_url: data.user.avatar_url || prev?.avatar_url || null,
              bio: data.user.bio || prev?.bio || '',
              status_text: data.user.status_text || prev?.status_text || 'Available'
            };
            localStorage.setItem('pulsechat_user', JSON.stringify(merged));
            saveLocalUserProfile(merged);
            return merged;
          });
          // Auto-sync profile to server in case server DB was restarted
          syncDataToServer();
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

    const handleSessionExpired = () => {
      logout();
    };
    window.addEventListener('pulse_session_expired', handleSessionExpired);
    return () => window.removeEventListener('pulse_session_expired', handleSessionExpired);
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
