const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Import routes
const authRoutes = require('./routes/auth');
const vendorRoutes = require('./routes/vendors');

const app = express();
const PORT = process.env.PORT || 5003;

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL 
    : ['http://localhost:3000', 'http://localhost:5003'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../data')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vendors', vendorRoutes);

// Flask Service Proxies (forward to local Flask services)
// DB Search Service (port 5002)
app.use('/flask/db-search', createProxyMiddleware({
  target: 'http://localhost:5002',
  changeOrigin: true,
  pathRewrite: {
    '^/flask/db-search': ''
  },
  onError: (err, req, res) => {
    console.error('DB Search proxy error:', err.message);
    res.status(503).json({ error: 'DB Search service unavailable' });
  }
}));

// Document Search Service (port 5001)
app.use('/flask/doc-search', createProxyMiddleware({
  target: 'http://localhost:5001',
  changeOrigin: true,
  pathRewrite: {
    '^/flask/doc-search': ''
  },
  onError: (err, req, res) => {
    console.error('Document Search proxy error:', err.message);
    res.status(503).json({ error: 'Document Search service unavailable' });
  }
}));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Flask health check endpoints
app.get('/api/health/flask/db-search', async (req, res) => {
  try {
    const response = await fetch('http://localhost:5002/health');
    const data = await response.json();
    res.status(200).json({ service: 'db-search', healthy: true, ...data });
  } catch (err) {
    res.status(503).json({ service: 'db-search', healthy: false, error: err.message });
  }
});

app.get('/api/health/flask/doc-search', async (req, res) => {
  try {
    const response = await fetch('http://localhost:5001/health');
    const data = await response.json();
    res.status(200).json({ service: 'doc-search', healthy: true, ...data });
  } catch (err) {
    res.status(503).json({ service: 'doc-search', healthy: false, error: err.message });
  }
});

// Serve static files from React build (production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  // All other routes should serve the React app (SPA fallback)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV}`);
  console.log(`✓ Client URL: ${process.env.CLIENT_URL}`);
  console.log(`${'='.repeat(50)}\n`);
});

module.exports = app;
