const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
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

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) and CSV files are allowed.'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

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

// Download sample Excel template (must be before /:id route)
app.get('/api/vendors/export-template', (req, res) => {
  try {
    // Create sample data
    const sampleData = [
      {
        'Name': 'John Doe',
        'Transport Name': 'ABC Transport Services',
        'Visiting Card': 'Visiting Card Details',
        'Owner/Broker': 'John Doe',
        'Vendor State': 'Tamil Nadu',
        'Vendor City': 'Chennai',
        'WhatsApp Number': '9876543210',
        'Alternate Number': '9876543211',
        'Vehicle Type': 'Truck',
        'Main Service State': 'Tamil Nadu',
        'Main Service City': 'Chennai',
        'Return Service': 'Y',
        'Any Association': 'Y',
        'Association Name': 'Transport Association',
        'Verification': 'Verified'
      },
      {
        'Name': 'Jane Smith',
        'Transport Name': 'XYZ Logistics',
        'Visiting Card': '',
        'Owner/Broker': 'Jane Smith',
        'Vendor State': 'Karnataka',
        'Vendor City': 'Bangalore',
        'WhatsApp Number': '9876543220',
        'Alternate Number': '',
        'Vehicle Type': 'Container',
        'Main Service State': 'Karnataka',
        'Main Service City': 'Bangalore',
        'Return Service': 'N',
        'Any Association': 'N',
        'Association Name': '',
        'Verification': 'Pending'
      },
      {
        'Name': 'Raj Kumar',
        'Transport Name': 'Fast Track Transport',
        'Visiting Card': 'Card Info',
        'Owner/Broker': 'Raj Kumar',
        'Vendor State': 'Maharashtra',
        'Vendor City': 'Mumbai',
        'WhatsApp Number': '9876543230',
        'Alternate Number': '9876543231',
        'Vehicle Type': 'Truck',
        'Main Service State': 'Maharashtra',
        'Main Service City': 'Mumbai',
        'Return Service': 'Y',
        'Any Association': 'Y',
        'Association Name': 'Mumbai Transport Union',
        'Verification': 'Verified'
      }
    ];

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws, 'Vendors');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=vendors_import_template.xlsx');
    res.send(buffer);
  } catch (err) {
    console.error('Error generating template:', err.message);
    return res.status(500).json({ 
      error: 'Error generating template', 
      details: err.message
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

// Excel Import endpoint
app.post('/api/vendors/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty or has no data' });
    }

    // Validate and insert data
    const insertedVendors = [];
    const errors = [];
    const insertQuery = `
      INSERT INTO vendors (
        name, transport_name, visiting_card, owner_broker, vendor_state, vendor_city,
        whatsapp_number, alternate_number, vehicle_type, main_service_state,
        main_service_city, return_service, any_association, association_name, verification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // +2 because Excel rows start at 1 and header is row 1

      try {
        // Map Excel columns to database fields (case-insensitive)
        const vendorData = {
          name: row.Name || row.name || '',
          transport_name: row['Transport Name'] || row['transport_name'] || row['Transport Name'] || '',
          visiting_card: row['Visiting Card'] || row['visiting_card'] || row['Visiting Card'] || null,
          owner_broker: row['Owner/Broker'] || row['owner_broker'] || row['Owner/Broker'] || row['Owner Broker'] || null,
          vendor_state: row['Vendor State'] || row['vendor_state'] || row['Vendor State'] || null,
          vendor_city: row['Vendor City'] || row['vendor_city'] || row['Vendor City'] || null,
          whatsapp_number: row['WhatsApp Number'] || row['whatsapp_number'] || row['WhatsApp Number'] || row['Whatsapp Number'] || null,
          alternate_number: row['Alternate Number'] || row['alternate_number'] || row['Alternate Number'] || null,
          vehicle_type: row['Vehicle Type'] || row['vehicle_type'] || row['Vehicle Type'] || null,
          main_service_state: row['Main Service State'] || row['main_service_state'] || row['Main Service State'] || null,
          main_service_city: row['Main Service City'] || row['main_service_city'] || row['Main Service City'] || null,
          return_service: (row['Return Service'] || row['return_service'] || row['Return Service'] || 'N').toString().toUpperCase().substring(0, 1),
          any_association: (row['Any Association'] || row['any_association'] || row['Any Association'] || 'N').toString().toUpperCase().substring(0, 1),
          association_name: row['Association Name'] || row['association_name'] || row['Association Name'] || null,
          verification: row['Verification'] || row['verification'] || null
        };

        // Validate required fields
        if (!vendorData.name || !vendorData.transport_name) {
          errors.push({
            row: rowNum,
            error: `Row ${rowNum}: Name and Transport Name are required`
          });
          continue;
        }

        // Validate return_service and any_association
        if (!['Y', 'N'].includes(vendorData.return_service)) {
          vendorData.return_service = 'N';
        }
        if (!['Y', 'N'].includes(vendorData.any_association)) {
          vendorData.any_association = 'N';
        }

        const values = [
          vendorData.name,
          vendorData.transport_name,
          vendorData.visiting_card || null,
          vendorData.owner_broker || null,
          vendorData.vendor_state || null,
          vendorData.vendor_city || null,
          vendorData.whatsapp_number || null,
          vendorData.alternate_number || null,
          vendorData.vehicle_type || null,
          vendorData.main_service_state || null,
          vendorData.main_service_city || null,
          vendorData.return_service || 'N',
          vendorData.any_association || 'N',
          vendorData.association_name || null,
          vendorData.verification || null
        ];

        const result = await db.query(insertQuery, values);
        insertedVendors.push({
          id: result.rows[0].id,
          name: vendorData.name,
          transport_name: vendorData.transport_name
        });
      } catch (err) {
        errors.push({
          row: rowNum,
          error: `Row ${rowNum}: ${err.message}`
        });
      }
    }

    res.status(200).json({
      message: `Import completed: ${insertedVendors.length} vendors imported successfully`,
      imported: insertedVendors.length,
      total: data.length,
      errors: errors.length > 0 ? errors : undefined,
      insertedVendors: insertedVendors
    });
  } catch (err) {
    console.error('Error importing vendors:', err.message);
    return res.status(500).json({ 
      error: 'Error importing vendors', 
      details: err.message
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


