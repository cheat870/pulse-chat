const getBackendUrl = () => {
  const customUrl = import.meta.env.VITE_API_URL;
  if (customUrl && customUrl.trim()) {
    return customUrl.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://pulse-chat-o97b.onrender.com';
  }
  return '';
};

const BASE_URL = getBackendUrl() ? `${getBackendUrl()}/api` : '/api';

export function getAuthToken() {
  return localStorage.getItem('pulsechat_token');
}

export async function apiRequest(endpoint, method = 'GET', body = null, isFormData = false) {
  const token = getAuthToken();
  const headers = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (body && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : null
  };

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, config);
    const text = await res.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      if (!res.ok) {
        throw new Error(res.status === 404 ? 'Endpoint not found' : 'Server is waking up on Render. Please try again in 10 seconds...');
      }
      data = { message: text };
    }

    if (!res.ok) {
      throw new Error(data.error || 'API Request failed');
    }

    return data;
  } catch (err) {
    console.error(`API Error [${method} ${endpoint}]:`, err.message);
    throw err;
  }
}
