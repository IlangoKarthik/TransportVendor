// API Configuration
// In production, Flask services are proxied through the Node server
// In development, they run on separate ports

const isProduction = process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost';

export const API_CONFIG = {
  // Node API base (uses current host in production)
  NODE_API: isProduction ? '' : 'http://localhost:5003',
  
  // Flask services (proxied through Node in production)
  DB_SEARCH_API: isProduction ? '/flask/db-search' : 'http://localhost:5002',
  DOC_SEARCH_API: isProduction ? '/flask/doc-search' : 'http://localhost:5001',
};

export default API_CONFIG;
