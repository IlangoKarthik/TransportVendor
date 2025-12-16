import api from './api';

export const getVendors = async () => {
  const response = await api.get('/vendors');
  return response.data;
};

export const getVendor = async (id) => {
  const response = await api.get(`/vendors/${id}`);
  return response.data;
};

export const createVendor = async (data) => {
  const response = await api.post('/vendors', data);
  
  // Refresh Flask cache after creating vendor
  try {
    const token = localStorage.getItem('token');
    await fetch(`http://localhost:5002/api/refresh?token=${encodeURIComponent(token)}`, {
      method: 'POST'
    });
  } catch (error) {
    console.warn('Failed to refresh Flask cache:', error);
  }
  
  return response.data;
};

export const updateVendor = async (id, data) => {
  const response = await api.put(`/vendors/${id}`, data);
  
  // Refresh Flask cache after updating vendor
  try {
    const token = localStorage.getItem('token');
    await fetch(`http://localhost:5002/api/refresh?token=${encodeURIComponent(token)}`, {
      method: 'POST'
    });
  } catch (error) {
    console.warn('Failed to refresh Flask cache:', error);
  }
  
  return response.data;
};

export const deleteVendor = async (id) => {
  const response = await api.delete(`/vendors/${id}`);
  
  // Refresh Flask cache after deleting vendor
  try {
    const token = localStorage.getItem('token');
    await fetch(`http://localhost:5002/api/refresh?token=${encodeURIComponent(token)}`, {
      method: 'POST'
    });
  } catch (error) {
    console.warn('Failed to refresh Flask cache:', error);
  }
  
  return response.data;
};

export const importVendors = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/vendors/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const exportVendors = (format = 'excel') => {
  const token = localStorage.getItem('token');
  const formatPath = format === 'csv' ? 'csv' : 'excel';
  const baseURL = api.defaults.baseURL.replace('/api', '');
  window.location.href = `${baseURL}/api/vendors/export/${formatPath}?token=${encodeURIComponent(token)}`;
};

export const generateEmbeddings = async () => {
  // Trigger Flask db_search to regenerate embeddings from MongoDB
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication token not found');
    }
    
    console.log('🚀 Calling Flask refresh endpoint...');
    console.log('📍 URL: http://localhost:5002/api/refresh');
    console.log('🔑 Token (first 30 chars):', token.substring(0, 30) + '...');
    
    const response = await fetch(`http://localhost:5002/api/refresh?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response OK:', response.ok);
    
    const data = await response.json();
    console.log('📦 Response data:', data);
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    if (!data.success) {
      throw new Error(data.error || 'Refresh failed');
    }
    
    return { success: true, message: data.message || 'Embeddings refreshed successfully' };
  } catch (error) {
    console.error('💥 Error in generateEmbeddings:', error);
    
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to Flask server. Make sure Flask is running on port 5002.');
    }
    
    throw error;
  }
};
