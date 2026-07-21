// Lightweight API client. Token is kept in localStorage (this is a real served
// site, not a sandboxed artifact). Swap to httpOnly cookies for higher security.
const API = (() => {
  const TOKEN_KEY = 'creditplum_token';

  const getToken = () => localStorage.getItem(TOKEN_KEY);
  const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

  async function request(path, { method = 'GET', body } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  return {
    getToken,
    setToken,
    isLoggedIn: () => Boolean(getToken()),

    // auth
    register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
    login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
    me: () => request('/auth/me'),
    listFavorites: () => request('/auth/favorites'),
    addFavorite: (id) => request(`/auth/favorites/${id}`, { method: 'POST' }),
    removeFavorite: (id) => request(`/auth/favorites/${id}`, { method: 'DELETE' }),

    // catalog
    products: (params = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null));
      return request(`/products?${qs.toString()}`);
    },
    articles: () => request('/articles'),

    // chat
    chat: (messages, score) => request('/chat', { method: 'POST', body: { messages, score } }),
  };
})();
