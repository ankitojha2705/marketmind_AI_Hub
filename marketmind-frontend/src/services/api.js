import axios from 'axios';

/**
 * VITE_API_URL may be the server origin (http://localhost:5001) or the API prefix
 * (http://localhost:5001/api). Axios paths are relative to /api (e.g. /brands → /api/brands).
 */
function resolveAuthApiBase() {
  const raw = (import.meta.env.VITE_API_URL || 'http://localhost:5001').replace(/\/$/, '');
  return raw.endsWith('/api') ? raw : `${raw}/api`;
}

export const API_URL = resolveAuthApiBase();
const CONTENT_API_URL = import.meta.env.VITE_CONTENT_API_URL || 'http://localhost:8002';
const AGENTS_API_URL = import.meta.env.VITE_AGENTS_API_URL || 'http://localhost:8001';
const RAG_API_URL = import.meta.env.VITE_RAG_API_URL || 'http://localhost:8003';

/** Server origin without `/api` — for static files like `/uploads/...` (and future CDN/S3 you may swap the base). */
export function authPublicOrigin() {
  return API_URL.replace(/\/api\/?$/, '');
}

/**
 * @param {string | null | undefined} logoUrl — relative path from auth service or absolute https (e.g. S3)
 * @returns {string | null}
 */
export function brandLogoSrc(logoUrl) {
  if (!logoUrl || !String(logoUrl).trim()) return null;
  const u = String(logoUrl).trim();
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('blob:')) return u;
  const origin = authPublicOrigin();
  return `${origin}${u.startsWith('/') ? u : `/${u}`}`;
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type`': 'application/json',
  },
});

const contentApi = axios.create({
  baseURL: CONTENT_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const agentsApi = axios.create({
  baseURL: AGENTS_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const ragApi = axios.create({
  baseURL: RAG_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const attachAuth = (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
};

api.interceptors.request.use(attachAuth);
contentApi.interceptors.request.use(attachAuth);
agentsApi.interceptors.request.use(attachAuth);
ragApi.interceptors.request.use(attachAuth);

export const register = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const getCurrentUser = async () => {
  try {
    const response = await api.get('/auth/me');
    return response.data.user || response.data;
  } catch (error) {
    console.error('Error fetching current user:', error);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem('token');
};

/** @returns {{ success: boolean, brands: Array }} */
export const fetchMyBrands = async () => {
  const { data } = await api.get('/brands');
  return data;
};

/** @param {{ name: string, city: string, country: string, businessType: string, description?: string }} payload */
export const createBrand = async (payload) => {
  const { data } = await api.post('/brands', payload);
  return data;
};

/** @param {string} brandId */
export const fetchBrand = async (brandId) => {
  const { data } = await api.get(`/brands/${brandId}`);
  return data;
};

/** @param {string} brandId @param {{ name?: string, city?: string, country?: string, businessType: string, description?: string }} payload */
export const updateBrand = async (brandId, payload) => {
  const { data } = await api.patch(`/brands/${brandId}`, payload);
  return data;
};

/** @param {string} brandId @param {File} file — PNG, JPEG, WebP, or GIF, max 2MB */
export const uploadBrandLogo = async (brandId, file) => {
  const form = new FormData();
  form.append('logo', file);
  const { data } = await api.post(`/brands/${brandId}/logo`, form);
  return data;
};

/** @param {string} brandId @param {string} email */
export const addBrandMember = async (brandId, email) => {
  const { data } = await api.post(`/brands/${brandId}/members`, { email });
  return data;
};

/** @param {string} brandId @param {string} userId */
export const removeBrandMember = async (brandId, userId) => {
  const { data } = await api.delete(`/brands/${brandId}/members/${userId}`);
  return data;
};

/** @param {string} brandId @param {{ includeArchived?: boolean }} [opts] */
export const fetchBrandCampaigns = async (brandId, opts = {}) => {
  const { includeArchived = false } = opts;
  const { data } = await contentApi.get(`/api/brands/${brandId}/campaigns`, {
    params: { include_archived: includeArchived },
  });
  return data;
};

/**
 * @param {string} brandId
 * @param {object} payload — Content API CampaignCreate (camelCase)
 */
export const createContentCampaign = async (brandId, payload) => {
  const { data } = await contentApi.post(`/api/brands/${brandId}/campaigns`, payload);
  return data;
};

/** @param {string} brandId @param {string} campaignId */
export const fetchContentCampaign = async (brandId, campaignId) => {
  const { data } = await contentApi.get(`/api/brands/${brandId}/campaigns/${campaignId}`);
  return data;
};

/** @param {string} brandId @param {string} campaignId @param {object} payload */
export const updateContentCampaign = async (brandId, campaignId, payload) => {
  const { data } = await contentApi.patch(`/api/brands/${brandId}/campaigns/${campaignId}`, payload);
  return data;
};

/** @param {string} brandId @param {string} campaignId */
export const deleteContentCampaign = async (brandId, campaignId) => {
  await contentApi.delete(`/api/brands/${brandId}/campaigns/${campaignId}`);
};

/** @param {string} brandId @param {string} campaignId */
export const fetchCampaignPosts = async (brandId, campaignId) => {
  const { data } = await contentApi.get(`/api/brands/${brandId}/campaigns/${campaignId}/posts`);
  return data;
};

/** @param {string} brandId @param {{ status?: string }} [opts] */
export const fetchBrandPosts = async (brandId, opts = {}) => {
  const { status } = opts;
  const { data } = await contentApi.get(`/api/brands/${brandId}/posts`, {
    params: status ? { status } : undefined,
  });
  return data;
};

/** @param {string} brandId @param {string} campaignId @param {object} payload */
export const createCampaignPost = async (brandId, campaignId, payload) => {
  const { data } = await contentApi.post(`/api/brands/${brandId}/campaigns/${campaignId}/posts`, payload);
  return data;
};

/** @param {string} brandId @param {string} campaignId @param {string} postId @param {object} payload */
export const updateCampaignPost = async (brandId, campaignId, postId, payload) => {
  const { data } = await contentApi.patch(`/api/brands/${brandId}/campaigns/${campaignId}/posts/${postId}`, payload);
  return data;
};

/** @param {object} payload */
export const runCampaignAnalysis = async (payload) => {
  const { data } = await agentsApi.post('/api/step2/analyze', payload);
  return data;
};

/** @param {object} payload */
export const runCampaignGeneration = async (payload) => {
  const { data } = await agentsApi.post('/api/step3/generate', payload);
  return data;
};

// RAG Service API Functions
export const uploadBrandDocument = async (brandId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const { data } = await ragApi.post(`/api/brands/${brandId}/knowledge/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

export const getBrandDocuments = async (brandId) => {
  const { data } = await ragApi.get(`/api/brands/${brandId}/knowledge/documents`);
  return data;
};

export const deleteBrandDocument = async (brandId, documentId) => {
  const { data } = await ragApi.delete(`/api/brands/${brandId}/knowledge/documents/${documentId}`);
  return data;
};

export const getKnowledgeStats = async (brandId) => {
  const { data } = await ragApi.get(`/api/brands/${brandId}/knowledge/stats`);
  return data;
};

export const chatWithAssistant = async (brandId, message, sessionId = null, maxChunks = 5) => {
  const { data } = await ragApi.post(`/api/brands/${brandId}/assistant/chat`, {
    message,
    session_id: sessionId,
    max_chunks: maxChunks,
  });
  return data;
};

export const getChatHistory = async (brandId, sessionId = null) => {
  const { data } = await ragApi.get(`/api/brands/${brandId}/assistant/history`, {
    params: { session_id: sessionId },
  });
  return data;
};

export const validateContent = async (brandId, content) => {
  const { data } = await ragApi.post(`/api/brands/${brandId}/assistant/validate`, {
    content,
  });
  return data;
};

export const getContentSuggestions = async (brandId, context = null) => {
  const { data } = await ragApi.get(`/api/brands/${brandId}/assistant/suggestions`, {
    params: { context },
  });
  return data;
};
