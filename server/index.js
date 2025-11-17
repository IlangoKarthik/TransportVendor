const express = require('express');
const { Pool } = require('pg');
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

// PostgreSQL Connection Pool
const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'transport_vendor_db',
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection and create table
db.connect()
  .then((client) => {
    console.log('✓ Connected to PostgreSQL database');
    client.release();
    // Create table if it doesn't exist
    createTable();
  })
  .catch((err) => {
    console.error('Error connecting to PostgreSQL:', err.message);
    console.error('⚠️  Database connection failed. Please ensure PostgreSQL is running.');
    console.error('   API endpoints will return database errors until PostgreSQL is connected.');
  });

// Create vendors table
async function createTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS vendors (
      id SERIAL PRIMARY KEY,
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
      return_service VARCHAR(1) DEFAULT 'N' CHECK (return_service IN ('Y', 'N')),
      any_association VARCHAR(1) DEFAULT 'N' CHECK (any_association IN ('Y', 'N')),
      association_name VARCHAR(255),
      verification VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // Create trigger for updated_at
  const createTriggerQuery = `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
    CREATE TRIGGER update_vendors_updated_at
      BEFORE UPDATE ON vendors
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `;

  try {
    await db.query(createTableQuery);
    await db.query(createTriggerQuery);
    console.log('✓ Vendors table ready');
  } catch (err) {
    console.error('Error creating table:', err.message);
  }
}

// API Routes

// Get all vendors
app.get('/api/vendors', async (req, res) => {
  try {
    const query = 'SELECT * FROM vendors ORDER BY created_at DESC';
    const results = await db.query(query);
    res.json(results.rows);
  } catch (err) {
    console.error('Error fetching vendors:', err.message);
    return res.status(500).json({ 
      error: 'Error fetching vendors',
      details: err.code === 'ECONNREFUSED' ? 'Database connection refused. Please ensure PostgreSQL is running.' : err.message
    });
  }
});

// Get single vendor by ID
app.get('/api/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM vendors WHERE id = $1';
    const results = await db.query(query, [id]);
    if (results.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json(results.rows[0]);
  } catch (err) {
    console.error('Error fetching vendor:', err.message);
    return res.status(500).json({ 
      error: 'Error fetching vendor',
      details: err.code === 'ECONNREFUSED' ? 'Database connection refused. Please ensure PostgreSQL is running.' : err.message
    });
  }
});

// Create new vendor
app.post('/api/vendors', async (req, res) => {
  try {
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
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

    const results = await db.query(query, values);
    res.status(201).json({
      message: 'Vendor created successfully',
      id: results.rows[0].id
    });
  } catch (err) {
    console.error('Error creating vendor:', err.message);
    return res.status(500).json({ 
      error: 'Error creating vendor', 
      details: err.code === 'ECONNREFUSED' ? 'Database connection refused. Please ensure PostgreSQL is running.' : err.message
    });
  }
});

// Update vendor
app.put('/api/vendors/:id', async (req, res) => {
  try {
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
        name = $1, transport_name = $2, visiting_card = $3, owner_broker = $4,
        vendor_state = $5, vendor_city = $6, whatsapp_number = $7, alternate_number = $8,
        vehicle_type = $9, main_service_state = $10, main_service_city = $11,
        return_service = $12, any_association = $13, association_name = $14, verification = $15
      WHERE id = $16
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

    const results = await db.query(query, values);
    if (results.rowCount === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json({ message: 'Vendor updated successfully' });
  } catch (err) {
    console.error('Error updating vendor:', err.message);
    return res.status(500).json({ 
      error: 'Error updating vendor', 
      details: err.code === 'ECONNREFUSED' ? 'Database connection refused. Please ensure PostgreSQL is running.' : err.message
    });
  }
});

// Delete vendor
app.delete('/api/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'DELETE FROM vendors WHERE id = $1';
    const results = await db.query(query, [id]);
    if (results.rowCount === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json({ message: 'Vendor deleted successfully' });
  } catch (err) {
    console.error('Error deleting vendor:', err.message);
    return res.status(500).json({ 
      error: 'Error deleting vendor',
      details: err.code === 'ECONNREFUSED' ? 'Database connection refused. Please ensure PostgreSQL is running.' : err.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


