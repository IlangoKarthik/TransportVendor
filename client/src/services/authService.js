import api from './api';

export const signup = async (email, userId, password, confirmPassword) => {
  const response = await api.post('/auth/signup', { email, userId, password, confirmPassword });
  return response.data;
};

export const verifySignupOtp = async (email, userId, password, otp) => {
  const response = await api.post('/auth/verify-signup-otp', { email, userId, password, otp });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response.data;
};

export const login = async (emailOrUserId, password) => {
  const response = await api.post('/auth/login', { emailOrUserId, password });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (email, otp, newPassword, confirmPassword) => {
  const response = await api.post('/auth/reset-password', { email, otp, newPassword, confirmPassword });
  return response.data;
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};
