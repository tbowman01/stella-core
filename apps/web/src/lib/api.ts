import axios, { type AxiosError } from 'axios';
import type {
  User,
  Document,
  Workspace,
  AuditLog,
  ComplianceControl,
  QBOMEntry,
} from '@arcqubit/shared';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post('/api/auth/refresh', { refreshToken });
          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);

          // Retry original request
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${accessToken}`;
            return axios(error.config);
          }
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },

  logout: async () => {
    await api.post('/auth/logout');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  register: async (params: { email: string; password: string; name: string }) => {
    const { data } = await api.post('/auth/register', params);
    return data;
  },

  setupMFA: async () => {
    const { data } = await api.post('/auth/mfa/setup');
    return data;
  },

  verifyMFA: async (token: string) => {
    const { data } = await api.post('/auth/mfa/verify', { token });
    return data;
  },

  getCurrentUser: async (): Promise<User> => {
    const { data } = await api.get('/auth/me');
    return data;
  },
};

// Documents API
export const documentsApi = {
  list: async (params?: { workspaceId?: string; limit?: number; offset?: number }) => {
    const { data } = await api.get('/documents', { params });
    return data;
  },

  get: async (id: string): Promise<Document> => {
    const { data } = await api.get(`/documents/${id}`);
    return data;
  },

  upload: async (file: File, workspaceId: string, classification?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workspaceId', workspaceId);
    if (classification) formData.append('classification', classification);

    const { data } = await api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  download: async (id: string) => {
    const { data } = await api.get(`/documents/${id}/download`, {
      responseType: 'blob',
    });
    return data;
  },

  delete: async (id: string) => {
    await api.delete(`/documents/${id}`);
  },

  updateClassification: async (id: string, classification: string) => {
    const { data } = await api.patch(`/documents/${id}/classification`, { classification });
    return data;
  },
};

// Workspaces API
export const workspacesApi = {
  list: async (): Promise<Workspace[]> => {
    const { data } = await api.get('/workspaces');
    return data;
  },

  get: async (id: string): Promise<Workspace> => {
    const { data } = await api.get(`/workspaces/${id}`);
    return data;
  },

  create: async (params: { name: string; description?: string; parentId?: string }) => {
    const { data } = await api.post('/workspaces', params);
    return data;
  },

  update: async (id: string, params: { name?: string; description?: string }) => {
    const { data } = await api.patch(`/workspaces/${id}`, params);
    return data;
  },

  delete: async (id: string) => {
    await api.delete(`/workspaces/${id}`);
  },

  getHierarchy: async () => {
    const { data } = await api.get('/workspaces/hierarchy');
    return data;
  },
};

// Search API
export const searchApi = {
  search: async (params: {
    query: string;
    mode?: 'fulltext' | 'semantic' | 'hybrid';
    workspaceId?: string;
    classification?: string[];
    limit?: number;
  }) => {
    const { data } = await api.post('/search', params);
    return data;
  },

  getSuggestions: async (query: string) => {
    const { data } = await api.get('/search/suggestions', { params: { query } });
    return data;
  },

  getFacets: async (query: string) => {
    const { data } = await api.get('/search/facets', { params: { query } });
    return data;
  },
};

// AI API
export const aiApi = {
  query: async (params: { query: string; conversationId?: string; workspaceId?: string }) => {
    const { data } = await api.post('/ai/query', params);
    return data;
  },

  createConversation: async (title?: string) => {
    const { data } = await api.post('/ai/conversations', { title });
    return data;
  },

  listConversations: async () => {
    const { data } = await api.get('/ai/conversations');
    return data;
  },

  getConversation: async (id: string) => {
    const { data } = await api.get(`/ai/conversations/${id}`);
    return data;
  },

  summarizeDocument: async (documentId: string, options?: { length?: string; style?: string }) => {
    const { data } = await api.post(`/ai/documents/${documentId}/summarize`, options);
    return data;
  },
};

// Compliance API
export const complianceApi = {
  listControls: async (): Promise<ComplianceControl[]> => {
    const { data } = await api.get('/compliance/controls');
    return data;
  },

  getReport: async (framework?: string) => {
    const { data } = await api.get('/compliance/report', { params: { framework } });
    return data;
  },

  updateControl: async (id: string, params: { status?: string; notes?: string }) => {
    const { data } = await api.patch(`/compliance/controls/${id}`, params);
    return data;
  },
};

// PQC API
export const pqcApi = {
  getQBOM: async (): Promise<QBOMEntry[]> => {
    const { data } = await api.get('/pqc/qbom');
    return data;
  },

  getMigrationStatus: async () => {
    const { data } = await api.get('/pqc/migration-status');
    return data;
  },
};

// Audit API
export const auditApi = {
  list: async (params?: {
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<AuditLog[]> => {
    const { data } = await api.get('/audit', { params });
    return data;
  },

  export: async (format: 'json' | 'csv') => {
    const { data } = await api.get('/audit/export', {
      params: { format },
      responseType: 'blob',
    });
    return data;
  },
};

export default api;
