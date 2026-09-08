/* Lightweight API client for the public site + admin.
   All requests are same-origin and send cookies for authenticated calls. */
(function (global) {
  'use strict';

  const BASE = '/api';

  async function request(path, { method = 'GET', body, headers = {}, isForm = false } = {}) {
    const opts = { method, credentials: 'same-origin', headers: { ...headers } };
    if (body !== undefined) {
      if (isForm) {
        opts.body = body; // FormData — let the browser set the boundary
      } else {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
    }
    let res;
    try {
      res = await fetch(BASE + path, opts);
    } catch (networkErr) {
      const e = new Error('Network error. Please check your connection and try again.');
      e.network = true;
      throw e;
    }

    let data = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      data = await res.json().catch(() => null);
    }

    if (!res.ok) {
      const err = new Error((data && data.error) || 'Request failed. Please try again.');
      err.status = res.status;
      err.fields = data && data.fields;
      throw err;
    }
    return data;
  }

  const API = {
    get: (p) => request(p),
    post: (p, body) => request(p, { method: 'POST', body }),
    put: (p, body) => request(p, { method: 'PUT', body }),
    patch: (p, body) => request(p, { method: 'PATCH', body }),
    del: (p) => request(p, { method: 'DELETE' }),
    postForm: (p, formData) => request(p, { method: 'POST', body: formData, isForm: true }),
    putForm: (p, formData) => request(p, { method: 'PUT', body: formData, isForm: true }),

    // Domain helpers
    products: (query = '') => request('/products' + (query ? '?' + query : '')),
    product: (id) => request('/products/' + id),
    settings: () => request('/settings'),
    submitAppointment: (fd) => request('/appointments', { method: 'POST', body: fd, isForm: true }),
    trackAppointment: (ref) => request('/appointments/track/' + encodeURIComponent(ref)),
    submitInquiry: (body) => request('/inquiries', { method: 'POST', body }),
    login: (body) => request('/auth/login', { method: 'POST', body }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    me: () => request('/auth/me'),
    setupStatus: () => request('/auth/setup-status'),
    setup: (body) => request('/auth/setup', { method: 'POST', body }),
  };

  global.API = API;
})(window);
