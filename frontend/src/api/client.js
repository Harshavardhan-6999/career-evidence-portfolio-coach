/**
 * Unified API Client for Express Backend
 * Handles credentials (cookies) and standardized error handling.
 */

const BASE_URL = '/api';

export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // If a JWT token was stored explicitly in localStorage, attach as Bearer
  const token = localStorage.getItem('auth_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Ensure frontend allows enough time for backend response (default 75s for 60s backend AI)
  const timeoutMs = options.timeoutMs || 75000;
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  const config = {
    ...options,
    headers,
    credentials: 'include', // Sends HttpOnly session cookies automatically
    signal: options.signal || controller.signal
  };

  try {
    const res = await fetch(url, config);
    clearTimeout(timer);
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errorMsg = data?.error?.message || data?.message || `HTTP error ${res.status}`;
      const err = new Error(errorMsg);
      err.status = res.status;
      err.code = data?.error?.code || 'API_ERROR';
      err.details = data?.error?.details || null;
      throw err;
    }

    return data;
  } catch (err) {
    clearTimeout(timer);
    if (controller.signal.aborted) {
      const timeoutErr = new Error(`Request timed out after ${timeoutMs}ms limit. The AI model or server is taking longer than expected. Please retry.`);
      timeoutErr.code = 'CLIENT_TIMEOUT';
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------
export const authApi = {
  getMe: () => apiRequest('/auth/me'),
  login: (email, password) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  register: (userData) =>
    apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
  logout: () =>
    apiRequest('/auth/logout', {
      method: 'POST'
    })
};

// -------------------------------------------------------------
// Catalogs
// -------------------------------------------------------------
export const catalogApi = {
  getRoles: () => apiRequest('/roles'),
  getSkills: () => apiRequest('/skills')
};

// -------------------------------------------------------------
// User Profile Endpoints
// -------------------------------------------------------------
export const userApi = {
  getProfile: (userId) => apiRequest(`/users/${userId}`),
  updateProfile: (userId, updates) =>
    apiRequest(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    })
};

// -------------------------------------------------------------
// Evidence Endpoints
// -------------------------------------------------------------
export const evidenceApi = {
  list: (userId) => apiRequest(`/users/${userId}/evidence`),
  create: (userId, data) =>
    apiRequest(`/users/${userId}/evidence`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  update: (userId, evidenceId, data) =>
    apiRequest(`/users/${userId}/evidence/${evidenceId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
  delete: (userId, evidenceId) =>
    apiRequest(`/users/${userId}/evidence/${evidenceId}`, {
      method: 'DELETE'
    }),
  analyzeSkills: (userId, evidenceId) =>
    apiRequest(`/users/${userId}/evidence/${evidenceId}/analyze`, {
      method: 'POST'
    })
};

// -------------------------------------------------------------
// Skills & Skill Mappings Endpoints
// -------------------------------------------------------------
export const skillApi = {
  getUserSkills: (userId) => apiRequest(`/users/${userId}/skills`),
  createMapping: (userId, skillId, evidenceId) =>
    apiRequest(`/users/${userId}/skill-mappings`, {
      method: 'POST',
      body: JSON.stringify({ skillId, evidenceId })
    }),
  deleteMapping: (userId, mappingId) =>
    apiRequest(`/users/${userId}/skill-mappings/${mappingId}`, {
      method: 'DELETE'
    })
};

// -------------------------------------------------------------
// Role Gap Analysis
// -------------------------------------------------------------
export const roleGapApi = {
  getRoleGap: (userId) => apiRequest(`/users/${userId}/role-gap`)
};

// -------------------------------------------------------------
// Portfolio Endpoints
// -------------------------------------------------------------
export const portfolioApi = {
  get: (userId) => apiRequest(`/users/${userId}/portfolio`),
  upsert: (userId, title, selectedEvidenceIds) =>
    apiRequest(`/users/${userId}/portfolio`, {
      method: 'PUT',
      body: JSON.stringify({ title, selectedEvidenceIds })
    })
};

// -------------------------------------------------------------
// Coaching & Roadmap Endpoints
// -------------------------------------------------------------
export const coachingApi = {
  getLatest: (userId) => apiRequest(`/users/${userId}/coaching/latest`),
  generate: (userId) =>
    apiRequest(`/users/${userId}/coaching`, {
      method: 'POST'
    }),
  updateRoadmapTask: (userId, coachingId, taskId, status) =>
    apiRequest(`/users/${userId}/coaching/${coachingId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
};

// -------------------------------------------------------------
// Job Description Analysis Endpoints
// -------------------------------------------------------------
export const jobDescriptionApi = {
  list: (userId) => apiRequest(`/users/${userId}/job-descriptions`),
  analyze: (userId, rawText) =>
    apiRequest(`/users/${userId}/job-descriptions/analyze`, {
      method: 'POST',
      body: JSON.stringify({ rawText })
    })
};
