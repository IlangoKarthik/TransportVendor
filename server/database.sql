-- Transport Vendor Database Setup
-- Run this script if you want to manually create the database and table

-- Create database
CREATE DATABASE IF NOT EXISTS transport_vendor_db;
USE transport_vendor_db;

-- Create vendors table
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

-- Add indexes for better query performance
CREATE INDEX idx_vendor_state ON vendors(vendor_state);
CREATE INDEX idx_vendor_city ON vendors(vendor_city);
CREATE INDEX idx_main_service_state ON vendors(main_service_state);
CREATE INDEX idx_main_service_city ON vendors(main_service_city);
CREATE INDEX idx_created_at ON vendors(created_at);

