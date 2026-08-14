const BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

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
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'API Request failed');
    }

    return data;
  } catch (err) {
    console.error(`API Error [${method} ${endpoint}]:`, err.message);
    throw err;
  }
}
