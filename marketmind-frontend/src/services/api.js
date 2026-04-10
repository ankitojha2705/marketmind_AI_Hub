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

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const contentApi = axios.create({
  baseURL: CONTENT_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const attachAuth = (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

api.interceptors.request.use(attachAuth);
contentApi.interceptors.request.use(attachAuth);

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
