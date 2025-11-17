const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in production - you can restrict this
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MySQL Connection Pool (better handling of connections)
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'transport_vendor_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection and create table
db.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to MySQL:', err.message);
    console.error('⚠️  Database connection failed. Please ensure MySQL is running.');
    console.error('   API endpoints will return database errors until MySQL is connected.');
    connection && connection.release();
    return;
  }
  console.log('✓ Connected to MySQL database');
  connection.release();
  
  // Create table if it doesn't exist
  createTable();
});

// Create vendors table
function createTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS vendors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      transport_name VARCHAR(255) NOT NULL,
      visiting_card VARCHAR(255),
      owner_broker VARCHAR(255),
      vendor_state VARCHAR(255),
      vendor_city VARCHAR(255),
      whatsapp_number VARCHAR(20),
      alternate_number VARCHAR(20),
      vehicle_type VARCHAR(255),
      main_service_state VARCHAR(255),
      main_service_city VARCHAR(255),
      return_service ENUM('Y', 'N') DEFAULT 'N',
      any_association ENUM('Y', 'N') DEFAULT 'N',
      association_name VARCHAR(255),
      verification VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  db.query(createTableQuery, (err, results) => {
    if (err) {
      console.error('Error creating table:', err.message);
    } else {
      console.log('✓ Vendors table ready');
    }
  });
}

// API Routes

// Get all vendors
app.get('/api/vendors', (req, res) => {
  const query = 'SELECT * FROM vendors ORDER BY created_at DESC';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching vendors:', err.message);
      return res.status(500).json({ 
        error: 'Error fetching vendors',
        details: err.code === 'ECONNREFUSED' ? 'Database connection refused. Please ensure MySQL is running.' : err.message
      });
    }
    res.json(results);
  });
});

// Get single vendor by ID
app.get('/api/vendors/:id', (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM vendors WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error fetching vendor:', err.message);
      return res.status(500).json({ 
        error: 'Error fetching vendor',
        details: err.code === 'ECONNREFUSED' ? 'Database connection refused. Please ensure MySQL is running.' : err.message
      });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json(results[0]);
  });
});

// Create new vendor
app.post('/api/vendors', (req, res) => {
  const {
    name,
    transport_name,
    visiting_card,
    owner_broker,
    vendor_state,
    vendor_city,
    whatsapp_number,
    alternate_number,
    vehicle_type,
    main_service_state,
    main_service_city,
    return_service,
    any_association,
    association_name,
    verification
  } = req.body;

  const query = `
    INSERT INTO vendors (
      name, transport_name, visiting_card, owner_broker, vendor_state, vendor_city,
      whatsapp_number, alternate_number, vehicle_type, main_service_state,
      main_service_city, return_service, any_association, association_name, verification
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    name,
    transport_name,
    visiting_card || null,
    owner_broker || null,
    vendor_state || null,
    vendor_city || null,
    whatsapp_number || null,
    alternate_number || null,
    vehicle_type || null,
    main_service_state || null,
    main_service_city || null,
    return_service || 'N',
    any_association || 'N',
    association_name || null,
    verification || null
  ];

  db.query(query, values, (err, results) => {
    if (err) {
      console.error('Error creating vendor:', err.message);
      return res.status(500).json({ 
        error: 'Error creating vendor', 
        details: err.code === 'ECONNREFUSED' ? 'Database connection refused. Please ensure MySQL is running.' : err.message
      });
    }
    res.status(201).json({
      message: 'Vendor created successfully',
      id: results.insertId
    });
  });
});

// Update vendor
app.put('/api/vendors/:id', (req, res) => {
  const { id } = req.params;
  const {
    name,
    transport_name,
    visiting_card,
    owner_broker,
    vendor_state,
    vendor_city,
    whatsapp_number,
    alternate_number,
    vehicle_type,
    main_service_state,
    main_service_city,
    return_service,
    any_association,
    association_name,
    verification
  } = req.body;

  const query = `
    UPDATE vendors SET
      name = ?, transport_name = ?, visiting_card = ?, owner_broker = ?,
      vendor_state = ?, vendor_city = ?, whatsapp_number = ?, alternate_number = ?,
      vehicle_type = ?, main_service_state = ?, main_service_city = ?,
      return_service = ?, any_association = ?, association_name = ?, verification = ?
    WHERE id = ?
  `;

  const values = [
    name,
    transport_name,
    visiting_card || null,
    owner_broker || null,
    vendor_state || null,
    vendor_city || null,
    whatsapp_number || null,
    alternate_number || null,
    vehicle_type || null,
    main_service_state || null,
    main_service_city || null,
    return_service || 'N',
    any_association || 'N',
    association_name || null,
    verification || null,
    id
  ];

  db.query(query, values, (err, results) => {
    if (err) {
      console.error('Error updating vendor:', err.message);
      return res.status(500).json({ 
        error: 'Error updating vendor', 
        details: err.code === 'ECONNREFUSED' ? 'Database connection refused. Please ensure MySQL is running.' : err.message
      });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json({ message: 'Vendor updated successfully' });
  });
});

// Delete vendor
app.delete('/api/vendors/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM vendors WHERE id = ?';
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error deleting vendor:', err.message);
      return res.status(500).json({ 
        error: 'Error deleting vendor',
        details: err.code === 'ECONNREFUSED' ? 'Database connection refused. Please ensure MySQL is running.' : err.message
      });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json({ message: 'Vendor deleted successfully' });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

