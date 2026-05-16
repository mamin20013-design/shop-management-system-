// ─── API Helper ────────────────────────────────────────────
const API = {
  _token() { return localStorage.getItem(CONFIG.TOKEN_KEY); },

  async _request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this._token();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${CONFIG.API_BASE}${path}`, opts);
    const data = await res.json();

    if (!res.ok) {
      // 401 = token expired, redirect to login
      if (res.status === 401) { Auth.logout(); return; }
      const err = new Error(data.message || 'Request failed');
      err.status = res.status;
      err.code = data.code;
      err.data = data;
      throw err;
    }
    return data;
  },

  get:    (path)       => API._request('GET',    path),
  post:   (path, body) => API._request('POST',   path, body),
  patch:  (path, body) => API._request('PATCH',  path, body),
  delete: (path)       => API._request('DELETE', path),

  // ── Auth ────────────────────────────────
  auth: {
    login:                (body)                    => API.post('/auth/login', body),
    register:             (body)                    => API.post('/auth/register', body),
    me:                   ()                        => API.get('/auth/me'),
    changePassword:       (body)                    => API.patch('/auth/change-password', body),
    verifyEmail:          (body)                    => API.post('/auth/verify-email', body),
    verifyStatus:         (token)                   => API.get(`/auth/verify-status/${token}`),
    resendVerification:   (body)                    => API.post('/auth/resend-verification', body)
  },

  // ── Users (Admin) ───────────────────────
  users: {
    list:   ()         => API.get('/users'),
    create: (body)     => API.post('/users', body),
    update: (id, body) => API.patch(`/users/${id}`, body),
    delete: (id)       => API.delete(`/users/${id}`)
  },

  // ── Products ────────────────────────────
  products: {
    list:   (params = {}) => API.get('/products?' + new URLSearchParams(params)),
    get:    (id)           => API.get(`/products/${id}`),
    create: (body)         => API.post('/products', body),
    update: (id, body)     => API.patch(`/products/${id}`, body),
    delete: (id)           => API.delete(`/products/${id}`)
  },

  // ── Customers ───────────────────────────
  customers: {
    list:   (params = {}) => API.get('/customers?' + new URLSearchParams(params)),
    get:    (id)           => API.get(`/customers/${id}`),
    create: (body)         => API.post('/customers', body),
    update: (id, body)     => API.patch(`/customers/${id}`, body),
    delete: (id)           => API.delete(`/customers/${id}`)
  },

  // ── Orders ──────────────────────────────
  orders: {
    list:         (params = {}) => API.get('/orders?' + new URLSearchParams(params)),
    get:          (id)           => API.get(`/orders/${id}`),
    create:       (body)         => API.post('/orders', body),
    updateStatus: (id, status)   => API.patch(`/orders/${id}/status`, { status }),
    delete:       (id)           => API.delete(`/orders/${id}`)
  },

  // ── Deliveries ──────────────────────────
  deliveries: {
    list:   (params = {}) => API.get('/deliveries?' + new URLSearchParams(params)),
    create: (body)         => API.post('/deliveries', body),
    update: (id, body)     => API.patch(`/deliveries/${id}`, body),
    delete: (id)           => API.delete(`/deliveries/${id}`)
  },

  // ── Reports ─────────────────────────────
  reports: {
    summary: (params = {}) => API.get('/reports/summary?' + new URLSearchParams(params)),
    daily:   ()             => API.get('/reports/daily')
  },

  // ── Settings ────────────────────────────
  settings: {
    get:    ()     => API.get('/settings'),
    update: (body) => API.patch('/settings', body)
  }
};
