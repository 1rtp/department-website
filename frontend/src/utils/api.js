import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const hadToken = !!localStorage.getItem('auth_token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      if (hadToken) {
        const publicPaths = ['/', '/login', '/news', '/staff', '/education', '/research'];
        const isPublic = publicPaths.some(p =>
          window.location.pathname === p ||
          window.location.pathname.startsWith(p + '/')
        );
        if (!isPublic) {
          window.location.href = '/';
        } else {
          window.location.reload();
        }
      }
    }
    return Promise.reject(error);
  }
);

api.interceptors.request.use((config) => {
  const lang = localStorage.getItem('app_lang') || 'ua';
  config.params = { ...config.params, lang };
  return config;
});

const checkSessionValidity = async () => {
  const token = localStorage.getItem('auth_token');
  if (!token) return;

  try {
    await api.get('/auth/me', { params: { token } });
  } catch (err) {
    if (err.response?.status === 401) {}
  }
};

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    checkSessionValidity();
  }
});

window.addEventListener('focus', checkSessionValidity);

const getToken = () => localStorage.getItem('auth_token') || '';

export const staffApi = {
  getAll: (params = {}) => api.get('/staff', { params }),
  getById: (id) => api.get(`/staff/${id}`),
};

export const newsApi = {
  getAll: (params = {}) => api.get('/news', { params }),
  getById: (id) => api.get(`/news/${id}`),
  getRelated: (id) => api.get(`/news/${id}/related`),
};

export const specialtiesApi = {
  getAll: () => api.get('/specialties'),
  getById: (id) => api.get(`/specialties/${id}`),
};

export const departmentApi = {
  getInfo: () => api.get('/department-info'),
};

export const laboratoriesApi = {
  getAll: () => api.get('/laboratories'),
  getById: (id) => api.get(`/laboratories/${id}`),
  getProjects: (id, params = {}) => api.get(`/laboratories/${id}/projects`, { params }),
};

export const labProjectsApi = {
  getById: (id) => api.get(`/lab-projects/${id}`),
};

export const seedApi = {
  seed: () => api.post('/seed'),
  // clearAll: () => api.post('/clear-all', {}, { params: { token: localStorage.getItem('auth_token') || '' } }),
  clearAll: () => api.post('/clear-all'),
};

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  // Refresh current user data from server
  me: () => api.get('/auth/me', { params: { token: localStorage.getItem('auth_token') || '' } }),
  logout: () => api.post('/auth/logout', {}, { params: { token: localStorage.getItem('auth_token') || '' } }),
};

export const groupsApi = {
  getByCourse: (course) => api.get('/groups', { params: { course } }),
};

export const studentApi = {
  getMe: () => api.get('/student/me', { params: { token: getToken() } }),
  updateContacts: (data) => api.put('/student/contacts', data, { params: { token: getToken() } }),
  changePassword: (data) => api.put('/student/password', data, { params: { token: getToken() } }),
  getSchedule: (groupId) => api.get(`/student/schedule/${groupId}`),
  getAnnouncements: (groupId, userId) => api.get('/announcements', {
    params: {
      ...(groupId ? { group_id: groupId } : {}),
      ...(userId ? { user_id: userId } : {}),
      role: 'students',
    }
  }),
  submitElectives: (data) => api.post('/student/electives', data, { params: { token: getToken() } }),
  getElectives: () => api.get('/student/electives', { params: { token: getToken() } }),
  getEducationSchedule: () => api.get('/student/education-schedule'),
  updatePhoto: (data) => api.post('/student/photo', data, { params: { token: getToken() } }),
  getExamSchedule: () => api.get('/student/exam-schedule', { params: { token: getToken() } }),
};

export const staffProfileApi = {
  getMe: () => api.get('/staff-profile/me', { params: { token: getToken() } }),
  updateContacts: (data) => api.put('/staff-profile/contacts', data, { params: { token: getToken() } }),
  changePassword: (data) => api.put('/staff-profile/password', data, { params: { token: getToken() } }),
  getAnnouncements: (userId) => api.get('/announcements', {
    params: {
      role: 'staff',
      ...(userId ? { user_id: userId } : {}),
    }
  }),
  addPublication: (data) => api.post('/staff-profile/publications', data, { params: { token: getToken() } }),
  updatePublication: (pubId, data) => api.put(`/staff-profile/publications/${pubId}`, data, { params: { token: getToken() } }),
  deletePublication: (pubId) => api.delete(`/staff-profile/publications/${pubId}`, { params: { token: getToken() } }),
  addCertificate: (data) => api.post('/staff-profile/certificates', data, { params: { token: getToken() } }),
  updateCertificate: (certId, data) => api.put(`/staff-profile/certificates/${certId}`, data, { params: { token: getToken() } }),
  deleteCertificate: (certId) => api.delete(`/staff-profile/certificates/${certId}`, { params: { token: getToken() } }),
  updatePhoto: (data) => api.post('/staff-profile/photo', data, { params: { token: getToken() } }),
  getProjects: (staffId) => api.get(`/staff/${staffId}/projects`),
  downloadFile: (fileId) => api.get(`/staff-profile/file/${fileId}`, { params: { token: getToken() }, responseType: 'blob'}),
};

export const adminApi = {
  // Registration
  getPendingUsers: () => api.get('/admin/pending-users', { params: { token: getToken() } }),
  approveUser: (userId) => api.post(`/admin/approve-user/${userId}`, {}, { params: { token: getToken() } }),
  rejectUser: (userId) => api.post(`/admin/reject-user/${userId}`, {}, { params: { token: getToken() } }),

  // Notifications
  sendNotification: (data) => api.post('/admin/notifications', data, { params: { token: getToken() } }),
  getNotifications: (params = {}) => api.get('/admin/notifications', { params: { ...params, token: getToken() } }),
  updateNotification: (id, data) => api.put(`/admin/notifications/${id}`, data, { params: { token: getToken() } }),
  deleteNotification: (id) => api.delete(`/admin/notifications/${id}`, { params: { token: getToken() } }),

  // Electives
  getElectiveSelections: (params = {}) => api.get('/admin/elective-selections', { params: { ...params, token: getToken() } }),
  updateStudentSelection: (userId, data) => api.put(`/admin/elective-selections/${userId}`, data, { params: { token: getToken() } }),
  sendElectiveReminder: (userId) => api.post(`/admin/elective-reminder/${userId}`, {}, { params: { token: getToken() } }),
  sendElectiveReminderAll: (groupId) => api.post('/admin/elective-reminder-all', { group_id: groupId }, { params: { token: getToken() } }),

  // Schedule - sends base64 file_data
  uploadSchedule: (data) => api.post('/admin/schedule', data, { params: { token: getToken() } }),
  getSchedule: () => api.get('/admin/schedule', { params: { token: getToken() } }),
  publishSchedule: () => api.post('/admin/schedule/publish', {}, { params: { token: getToken() } }),

  // Staff activity
  getStaffPublications: (params = {}) => api.get('/admin/staff-publications', { params: { ...params, token: getToken() } }),
  getStaffCertificates: (params = {}) => api.get('/admin/staff-certificates', { params: { ...params, token: getToken() } }),
  deleteStaffDoc: (staffId, docId, type) => api.delete(`/admin/staff-docs/${staffId}/${type}/${docId}`, { params: { token: getToken() } }),
};

export default api;