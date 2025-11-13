// API URL configuration - uses environment variable or falls back to relative URLs for dev proxy
export const API_URL = import.meta.env.VITE_API_URL || '';

// Helper function to build API URLs
export const apiUrl = (path: string) => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${cleanPath}`;
};

// Helper function for authenticated fetch
export const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(apiUrl(path), {
    ...options,
    headers,
  });
};
