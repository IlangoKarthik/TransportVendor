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
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'transport_vendor_db',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased from 2s to 10s for cloud databases
};

const db = new Pool(dbConfig);

// Log connection config (without password)
console.log('📊 Database Configuration:');
console.log(`   Host: ${dbConfig.host}`);
console.log(`   Port: ${dbConfig.port}`);
console.log(`   Database: ${dbConfig.database}`);
console.log(`   User: ${dbConfig.user}`);
console.log(`   SSL: ${dbConfig.ssl ? 'Enabled' : 'Disabled'}`);

// Track connection state
let dbConnected = false;

// Test connection and create table
async function initializeDatabase() {
  let retries = 0;
  const maxRetries = 5;
  const retryDelay = 3000; // 3 seconds

  while (retries < maxRetries) {
    try {
      const client = await db.connect();
      console.log('✓ Connected to PostgreSQL database');
      dbConnected = true;
      client.release();
      
      // Create table if it doesn't exist
      await createTable();
      return;
    } catch (err) {
      retries++;
      console.error(`❌ Database connection attempt ${retries}/${maxRetries} failed:`, err.message);
      
      if (err.code === 'ECONNREFUSED') {
        console.error('⚠️  Connection Refused - Possible issues:');
        console.error('   1. PostgreSQL server is not running');
        console.error('   2. Incorrect host/port in environment variables');
        console.error('   3. Firewall blocking the connection');
        console.error('   4. Database server is not accessible from this network');
      } else if (err.code === 'ENOTFOUND') {
        console.error('⚠️  Host Not Found - Check DB_HOST environment variable');
      } else if (err.code === '28P01') {
        console.error('⚠️  Authentication Failed - Check DB_USER and DB_PASSWORD');
      } else if (err.code === '3D000') {
        console.error('⚠️  Database Does Not Exist - Check DB_NAME environment variable');
      }
      
      if (retries < maxRetries) {
        console.log(`   Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('⚠️  Failed to connect after all retry attempts');
        console.error('   API endpoints will return database errors until PostgreSQL is connected.');
        console.error('   Please check your environment variables and ensure PostgreSQL is running.');
      }
    }
  }
}

// Initialize database connection
initializeDatabase();

// Handle pool errors
db.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
  dbConnected = false;
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
      notes JSONB DEFAULT '[]'::jsonb,
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
  // Convert notes from TEXT to JSONB array if it exists as TEXT
  const addNotesColumnQuery = `
    DO $$ 
    BEGIN
      -- Check if notes column exists
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendors' AND column_name = 'notes'
      ) THEN
        -- Check if it's TEXT type and needs conversion to JSONB
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'vendors' 
          AND column_name = 'notes' 
          AND data_type = 'text'
        ) THEN
          -- Convert existing TEXT notes to JSONB array format
          ALTER TABLE vendors ALTER COLUMN notes TYPE JSONB USING 
            CASE 
              WHEN notes IS NULL OR notes = '' THEN '[]'::jsonb
              ELSE jsonb_build_array(
                jsonb_build_object(
                  'comment', notes,
                  'timestamp', COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
                )
              )
            END;
        END IF;
      ELSE
        -- Add notes column as JSONB array if it doesn't exist
        ALTER TABLE vendors ADD COLUMN notes JSONB DEFAULT '[]'::jsonb;
      END IF;
    END $$;
  `;

  // Fix field_X columns - rename them to proper names if they exist
  // This migration runs on every server start to fix any field_X columns
  const fixFieldColumnsQuery = `
    DO $$ 
    DECLARE
      column_exists BOOLEAN;
      renamed_count INTEGER := 0;
    BEGIN
      -- Check if table exists first
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendors') THEN
        -- Rename field_0 to transport_name (based on your data: "Patel Transport Services")
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'field_0'
        ) INTO column_exists;
        
        IF column_exists AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'transport_name'
        ) THEN
          ALTER TABLE vendors RENAME COLUMN field_0 TO transport_name;
          renamed_count := renamed_count + 1;
          RAISE NOTICE 'Renamed field_0 to transport_name';
        END IF;

        -- Rename field_1 to name (based on your data: "Suresh Patel")
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'field_1'
        ) INTO column_exists;
        
        IF column_exists AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'name'
        ) THEN
          ALTER TABLE vendors RENAME COLUMN field_1 TO name;
          renamed_count := renamed_count + 1;
          RAISE NOTICE 'Renamed field_1 to name';
        END IF;

        -- Rename field_2 to vendor_city
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'field_2'
        ) INTO column_exists;
        
        IF column_exists AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'vendor_city'
        ) THEN
          ALTER TABLE vendors RENAME COLUMN field_2 TO vendor_city;
          renamed_count := renamed_count + 1;
          RAISE NOTICE 'Renamed field_2 to vendor_city';
        END IF;

        -- Rename field_3 to vendor_state
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'field_3'
        ) INTO column_exists;
        
        IF column_exists AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'vendor_state'
        ) THEN
          ALTER TABLE vendors RENAME COLUMN field_3 TO vendor_state;
          renamed_count := renamed_count + 1;
          RAISE NOTICE 'Renamed field_3 to vendor_state';
        END IF;

        -- Rename field_4 to visiting_card
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'field_4'
        ) INTO column_exists;
        
        IF column_exists AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'visiting_card'
        ) THEN
          ALTER TABLE vendors RENAME COLUMN field_4 TO visiting_card;
          renamed_count := renamed_count + 1;
          RAISE NOTICE 'Renamed field_4 to visiting_card';
        END IF;

        -- Rename field_5 to vehicle_type
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'field_5'
        ) INTO column_exists;
        
        IF column_exists AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'vehicle_type'
        ) THEN
          ALTER TABLE vendors RENAME COLUMN field_5 TO vehicle_type;
          renamed_count := renamed_count + 1;
          RAISE NOTICE 'Renamed field_5 to vehicle_type';
        END IF;

        -- Rename field_6 to main_service_city
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'field_6'
        ) INTO column_exists;
        
        IF column_exists AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'main_service_city'
        ) THEN
          ALTER TABLE vendors RENAME COLUMN field_6 TO main_service_city;
          renamed_count := renamed_count + 1;
          RAISE NOTICE 'Renamed field_6 to main_service_city';
        END IF;

        -- Rename field_7 to owner_broker
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'field_7'
        ) INTO column_exists;
        
        IF column_exists AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'owner_broker'
        ) THEN
          ALTER TABLE vendors RENAME COLUMN field_7 TO owner_broker;
          renamed_count := renamed_count + 1;
          RAISE NOTICE 'Renamed field_7 to owner_broker';
        END IF;

        -- Rename field_8 to whatsapp_number
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'field_8'
        ) INTO column_exists;
        
        IF column_exists AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'whatsapp_number'
        ) THEN
          ALTER TABLE vendors RENAME COLUMN field_8 TO whatsapp_number;
          renamed_count := renamed_count + 1;
          RAISE NOTICE 'Renamed field_8 to whatsapp_number';
        END IF;

        -- Rename field_9 to alternate_number
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'field_9'
        ) INTO column_exists;
        
        IF column_exists AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'alternate_number'
        ) THEN
          ALTER TABLE vendors RENAME COLUMN field_9 TO alternate_number;
          renamed_count := renamed_count + 1;
          RAISE NOTICE 'Renamed field_9 to alternate_number';
        END IF;

        -- Rename field_10 to main_service_state
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'field_10'
        ) INTO column_exists;
        
        IF column_exists AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'main_service_state'
        ) THEN
          ALTER TABLE vendors RENAME COLUMN field_10 TO main_service_state;
          renamed_count := renamed_count + 1;
          RAISE NOTICE 'Renamed field_10 to main_service_state';
        END IF;

        -- Rename field_11 to return_service
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'field_11'
        ) INTO column_exists;
        
        IF column_exists AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'return_service'
        ) THEN
          ALTER TABLE vendors RENAME COLUMN field_11 TO return_service;
          renamed_count := renamed_count + 1;
          RAISE NOTICE 'Renamed field_11 to return_service';
        END IF;

        -- Rename field_12 to any_association
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'field_12'
        ) INTO column_exists;
        
        IF column_exists AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'any_association'
        ) THEN
          ALTER TABLE vendors RENAME COLUMN field_12 TO any_association;
          renamed_count := renamed_count + 1;
          RAISE NOTICE 'Renamed field_12 to any_association';
        END IF;

        -- Rename field_13 to association_name
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'field_13'
        ) INTO column_exists;
        
        IF column_exists AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'association_name'
        ) THEN
          ALTER TABLE vendors RENAME COLUMN field_13 TO association_name;
          renamed_count := renamed_count + 1;
          RAISE NOTICE 'Renamed field_13 to association_name';
        END IF;

        -- Rename field_14 to verification
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'field_14'
        ) INTO column_exists;
        
        IF column_exists AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'verification'
        ) THEN
          ALTER TABLE vendors RENAME COLUMN field_14 TO verification;
          renamed_count := renamed_count + 1;
          RAISE NOTICE 'Renamed field_14 to verification';
        END IF;

        -- Handle field_15 and notes column
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'field_15'
        ) INTO column_exists;
        
        IF column_exists AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'notes'
        ) THEN
          ALTER TABLE vendors RENAME COLUMN field_15 TO notes;
          renamed_count := renamed_count + 1;
          RAISE NOTICE 'Renamed field_15 to notes';
        ELSIF column_exists AND EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = current_schema() 
          AND table_name = 'vendors' 
          AND column_name = 'notes'
        ) THEN
          -- Copy data from field_15 to notes if notes is null
          UPDATE vendors SET notes = field_15 WHERE notes IS NULL AND field_15 IS NOT NULL;
          -- Drop field_15
          ALTER TABLE vendors DROP COLUMN field_15;
          RAISE NOTICE 'Merged field_15 into notes and dropped field_15';
        END IF;

        IF renamed_count > 0 THEN
          RAISE NOTICE 'Migration completed: Renamed % columns from field_X to proper names', renamed_count;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error during column migration: %', SQLERRM;
    END $$;
  `;

  try {
    await db.query(createTableQuery);
    await db.query(createTriggerQuery);
    await db.query(addNotesColumnQuery);
    
    // Always run field_X column migration to fix any existing tables with field_X columns
    console.log('Running column migration to fix field_X columns...');
    await db.query(fixFieldColumnsQuery);
    
    console.log('✓ Vendors table ready');
  } catch (err) {
    console.error('Error creating/migrating table:', err.message);
    console.error('Stack:', err.stack);
  }
}

// API Routes

// Get all vendors
app.get('/api/vendors', async (req, res) => {
  try {
    // Check if database is connected
    if (!dbConnected) {
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        message: 'Unable to connect to PostgreSQL database. Please check your database configuration and ensure PostgreSQL is running.',
        code: 'DB_CONNECTION_ERROR',
        troubleshooting: 'Check server logs for connection details and errors'
      });
    }

    const query = 'SELECT * FROM vendors ORDER BY created_at DESC';
    const results = await db.query(query);
    // Ensure notes is always an array
    const vendors = results.rows.map(vendor => ({
      ...vendor,
      notes: Array.isArray(vendor.notes) ? vendor.notes : (vendor.notes ? [vendor.notes] : [])
    }));
    res.json(vendors);
  } catch (err) {
    console.error('Error fetching vendors:', err.message);
    console.error('Error code:', err.code);
    
    let errorMessage = 'Error fetching vendors';
    let statusCode = 500;
    
    if (err.code === 'ECONNREFUSED') {
      errorMessage = 'Database connection refused';
      statusCode = 503;
    } else if (err.code === 'ENOTFOUND') {
      errorMessage = 'Database host not found';
      statusCode = 503;
    } else if (err.code === '28P01') {
      errorMessage = 'Database authentication failed';
      statusCode = 503;
    } else if (err.code === '3D000') {
      errorMessage = 'Database does not exist';
      statusCode = 503;
    }
    
    return res.status(statusCode).json({ 
      error: errorMessage,
      details: err.message,
      code: err.code,
      troubleshooting: 'Check server logs and verify your database environment variables (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)'
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
    // Ensure notes is always an array
    const vendor = {
      ...results.rows[0],
      notes: Array.isArray(results.rows[0].notes) ? results.rows[0].notes : (results.rows[0].notes ? [results.rows[0].notes] : [])
    };
    res.json(vendor);
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
    Array.isArray(notes) && notes.length > 0 ? JSON.stringify(notes) : '[]'
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

  // Don't allow editing notes through PUT endpoint - notes can only be added via dedicated endpoint
  // Get existing notes to preserve them
  const existingVendor = await db.query('SELECT notes FROM vendors WHERE id = $1', [id]);
  const existingNotes = existingVendor.rows[0]?.notes || [];

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

// Add comment to vendor notes
app.post('/api/vendors/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Comment is required and cannot be empty' });
    }

    // Get existing vendor to check if it exists and get current notes
    const vendorResult = await db.query('SELECT notes FROM vendors WHERE id = $1', [id]);
    
    if (vendorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Get existing notes (ensure it's an array)
    let existingNotes = vendorResult.rows[0].notes;
    
    // Parse if it's a string
    if (typeof existingNotes === 'string') {
      try {
        existingNotes = JSON.parse(existingNotes);
      } catch (e) {
        console.error('Error parsing existing notes:', e);
        existingNotes = [];
      }
    }
    
    // Ensure it's an array
    if (!Array.isArray(existingNotes)) {
      existingNotes = existingNotes ? [existingNotes] : [];
    }

    // Create new comment object with timestamp
    const newComment = {
      comment: comment.trim(),
      timestamp: new Date().toISOString()
    };

    // Append new comment to existing notes
    const updatedNotes = [...existingNotes, newComment];
    
    console.log('Adding comment to vendor:', id);
    console.log('Existing notes count:', existingNotes.length);
    console.log('Updated notes count:', updatedNotes.length);

    // Update vendor with new notes array
    // Cast the JSON string to JSONB in PostgreSQL
    const updateResult = await db.query(
      'UPDATE vendors SET notes = $1::jsonb WHERE id = $2 RETURNING notes',
      [JSON.stringify(updatedNotes), id]
    );

    // Ensure notes is parsed as an array
    let returnedNotes = updateResult.rows[0].notes;
    
    if (typeof returnedNotes === 'string') {
      try {
        returnedNotes = JSON.parse(returnedNotes);
      } catch (e) {
        console.error('Error parsing returned notes:', e);
        returnedNotes = [];
      }
    }
    
    if (!Array.isArray(returnedNotes)) {
      returnedNotes = returnedNotes ? [returnedNotes] : [];
    }

    console.log('Returned notes count:', returnedNotes.length);

    res.json({
      message: 'Comment added successfully',
      notes: returnedNotes
    });
  } catch (err) {
    console.error('Error adding comment:', err.message);
    return res.status(500).json({
      error: 'Error adding comment',
      details: err.message
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb)
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
          // Convert notes from Excel to array format if provided
          vendorData.notes 
            ? (typeof vendorData.notes === 'string' && vendorData.notes.trim() 
              ? JSON.stringify([{ comment: vendorData.notes.trim(), timestamp: new Date().toISOString() }])
              : '[]')
            : '[]'
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
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const client = await db.connect();
    client.release();
    
    res.json({ 
      status: 'OK', 
      message: 'Server is running',
      database: {
        connected: true,
        host: dbConfig.host,
        database: dbConfig.database,
        port: dbConfig.port
      }
    });
  } catch (err) {
    res.status(503).json({ 
      status: 'ERROR', 
      message: 'Server is running but database connection failed',
      database: {
        connected: false,
        error: err.message,
        code: err.code,
        host: dbConfig.host,
        database: dbConfig.database,
        port: dbConfig.port
      },
      troubleshooting: {
        ECONNREFUSED: 'PostgreSQL server is not running or incorrect host/port',
        ENOTFOUND: 'Database host not found - check DB_HOST environment variable',
        '28P01': 'Authentication failed - check DB_USER and DB_PASSWORD',
        '3D000': 'Database does not exist - check DB_NAME environment variable'
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


