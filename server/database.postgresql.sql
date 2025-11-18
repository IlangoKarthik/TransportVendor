-- Transport Vendor Database Setup for PostgreSQL
-- Run this script if you want to manually create the database and table

-- Create database (run this as superuser)
-- CREATE DATABASE transport_vendor_db;
-- \c transport_vendor_db;

-- Create vendors table
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

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vendor_state ON vendors(vendor_state);
CREATE INDEX IF NOT EXISTS idx_vendor_city ON vendors(vendor_city);
CREATE INDEX IF NOT EXISTS idx_main_service_state ON vendors(main_service_state);
CREATE INDEX IF NOT EXISTS idx_main_service_city ON vendors(main_service_city);
CREATE INDEX IF NOT EXISTS idx_created_at ON vendors(created_at);

