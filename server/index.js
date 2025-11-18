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
      notes TEXT,
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

  // Add notes column to existing tables (migration)
  const addNotesColumnQuery = `
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendors' AND column_name = 'notes'
      ) THEN
        ALTER TABLE vendors ADD COLUMN notes TEXT;
      END IF;
    END $$;
  `;

  // Fix field_X columns - rename them to proper names if they exist
  const fixFieldColumnsQuery = `
    DO $$ 
    BEGIN
      -- Rename field_0 to transport_name (based on your data: "Patel Transport Services")
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_0')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'transport_name') THEN
        ALTER TABLE vendors RENAME COLUMN field_0 TO transport_name;
      END IF;

      -- Rename field_1 to name (based on your data: "Suresh Patel")
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_1')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'name') THEN
        ALTER TABLE vendors RENAME COLUMN field_1 TO name;
      END IF;

      -- Rename field_2 to vendor_city (based on your data: "Ahmedabad")
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_2')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'vendor_city') THEN
        ALTER TABLE vendors RENAME COLUMN field_2 TO vendor_city;
      END IF;

      -- Rename field_3 to vendor_state (based on your data: "Gujarat")
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_3')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'vendor_state') THEN
        ALTER TABLE vendors RENAME COLUMN field_3 TO vendor_state;
      END IF;

      -- Rename field_4 to visiting_card
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_4')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'visiting_card') THEN
        ALTER TABLE vendors RENAME COLUMN field_4 TO visiting_card;
      END IF;

      -- Rename field_5 to vehicle_type
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_5')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'vehicle_type') THEN
        ALTER TABLE vendors RENAME COLUMN field_5 TO vehicle_type;
      END IF;

      -- Rename field_6 to main_service_city
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_6')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'main_service_city') THEN
        ALTER TABLE vendors RENAME COLUMN field_6 TO main_service_city;
      END IF;

      -- Rename field_7 to owner_broker
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_7')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'owner_broker') THEN
        ALTER TABLE vendors RENAME COLUMN field_7 TO owner_broker;
      END IF;

      -- Rename field_8 to whatsapp_number
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_8')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'whatsapp_number') THEN
        ALTER TABLE vendors RENAME COLUMN field_8 TO whatsapp_number;
      END IF;

      -- Rename field_9 to alternate_number
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_9')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'alternate_number') THEN
        ALTER TABLE vendors RENAME COLUMN field_9 TO alternate_number;
      END IF;

      -- Rename field_10 to main_service_state
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_10')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'main_service_state') THEN
        ALTER TABLE vendors RENAME COLUMN field_10 TO main_service_state;
      END IF;

      -- Rename field_11 to return_service
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_11')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'return_service') THEN
        ALTER TABLE vendors RENAME COLUMN field_11 TO return_service;
      END IF;

      -- Rename field_12 to any_association
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_12')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'any_association') THEN
        ALTER TABLE vendors RENAME COLUMN field_12 TO any_association;
      END IF;

      -- Rename field_13 to association_name
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_13')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'association_name') THEN
        ALTER TABLE vendors RENAME COLUMN field_13 TO association_name;
      END IF;

      -- Rename field_14 to verification
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_14')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'verification') THEN
        ALTER TABLE vendors RENAME COLUMN field_14 TO verification;
      END IF;

      -- Rename field_15 to notes (if notes column doesn't exist)
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_15')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'notes') THEN
        ALTER TABLE vendors RENAME COLUMN field_15 TO notes;
      END IF;

      -- If notes column exists but field_15 also exists, we need to merge or drop field_15
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'field_15')
         AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vendors' AND column_name = 'notes') THEN
        -- Copy data from field_15 to notes if notes is null
        UPDATE vendors SET notes = field_15 WHERE notes IS NULL AND field_15 IS NOT NULL;
        -- Drop field_15
        ALTER TABLE vendors DROP COLUMN field_15;
      END IF;
    END $$;
  `;

  try {
    await db.query(createTableQuery);
    await db.query(createTriggerQuery);
    await db.query(addNotesColumnQuery);
    await db.query(fixFieldColumnsQuery);
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
        'Verification': 'Verified',
        'Notes': 'Reliable vendor with good track record'
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
        'Verification': 'Pending',
        'Notes': 'New vendor, under review'
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
        'Verification': 'Verified',
        'Notes': 'Preferred vendor for Mumbai routes'
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
    verification,
    notes
  } = req.body;

  // Check for duplicate name and transport_name
  const duplicateCheck = await db.query(
    'SELECT id, name, transport_name FROM vendors WHERE LOWER(name) = LOWER($1) AND LOWER(transport_name) = LOWER($2)',
    [name, transport_name]
  );

  if (duplicateCheck.rows.length > 0) {
    return res.status(409).json({
      error: 'Duplicate vendor',
      message: `A vendor with the name "${name}" and transport name "${transport_name}" already exists.`,
      existingVendor: duplicateCheck.rows[0]
    });
  }

  const query = `
    INSERT INTO vendors (
      name, transport_name, visiting_card, owner_broker, vendor_state, vendor_city,
      whatsapp_number, alternate_number, vehicle_type, main_service_state,
      main_service_city, return_service, any_association, association_name, verification, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
    verification || null,
    notes || null
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
    verification,
    notes
  } = req.body;

  // Check for duplicate name and transport_name (excluding current record)
  const duplicateCheck = await db.query(
    'SELECT id, name, transport_name FROM vendors WHERE LOWER(name) = LOWER($1) AND LOWER(transport_name) = LOWER($2) AND id != $3',
    [name, transport_name, id]
  );

  if (duplicateCheck.rows.length > 0) {
    return res.status(409).json({
      error: 'Duplicate vendor',
      message: `A vendor with the name "${name}" and transport name "${transport_name}" already exists.`,
      existingVendor: duplicateCheck.rows[0]
    });
  }

  const query = `
    UPDATE vendors SET
        name = $1, transport_name = $2, visiting_card = $3, owner_broker = $4,
        vendor_state = $5, vendor_city = $6, whatsapp_number = $7, alternate_number = $8,
        vehicle_type = $9, main_service_state = $10, main_service_city = $11,
        return_service = $12, any_association = $13, association_name = $14, verification = $15, notes = $16
      WHERE id = $17
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
    notes || null,
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
        main_service_city, return_service, any_association, association_name, verification, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
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
          verification: row['Verification'] || row['verification'] || null,
          notes: row['Notes'] || row['notes'] || row['Notes'] || null
        };

        // Validate required fields
        if (!vendorData.name || !vendorData.transport_name) {
          errors.push({
            row: rowNum,
            error: `Row ${rowNum}: Name and Transport Name are required`
          });
          continue;
        }

        // Check for duplicate name and transport_name
        const duplicateCheck = await db.query(
          'SELECT id, name, transport_name FROM vendors WHERE LOWER(name) = LOWER($1) AND LOWER(transport_name) = LOWER($2)',
          [vendorData.name, vendorData.transport_name]
        );

        if (duplicateCheck.rows.length > 0) {
          errors.push({
            row: rowNum,
            error: `Row ${rowNum}: A vendor with name "${vendorData.name}" and transport name "${vendorData.transport_name}" already exists`
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
          vendorData.verification || null,
          vendorData.notes || null
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


