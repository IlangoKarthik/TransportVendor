/**
 * Script to create sample vendor import files (Excel and CSV)
 * Run: node create_sample_files.js
 */

const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Sample vendor data
const sampleVendors = [
  {
    'Transport Name': 'ABC Logistics',
    'Name': 'Rajesh Kumar',
    'City': 'Mumbai',
    'State': 'Maharashtra',
    'Visiting Card': 'Specialized in electronics and fragile goods transport',
    'Vehicle Type': '32-Foot Container',
    'Main Service City': 'Pune',
    'Owner/Broker': 'Owner',
    'WhatsApp Number': '+91-9876543210',
    'Alternate Number': '+91-9876543211',
    'Main Service State': 'Maharashtra',
    'Return Service': 'Y',
    'Any Association': 'Y',
    'Association Name': 'All India Transport Association',
    'Verification': 'Verified',
    'Comments': 'Reliable for electronics shipments'
  },
  {
    'Transport Name': 'Delhi Express Carriers',
    'Name': 'Amit Sharma',
    'City': 'Delhi',
    'State': 'Delhi',
    'Visiting Card': 'Fast delivery service across North India',
    'Vehicle Type': '10-Wheeler Flatbed',
    'Main Service City': 'Jaipur',
    'Owner/Broker': 'Owner',
    'WhatsApp Number': '+91-9988776655',
    'Alternate Number': '+91-9988776656',
    'Main Service State': 'Rajasthan',
    'Return Service': 'N',
    'Any Association': 'N',
    'Association Name': '',
    'Verification': 'Pending',
    'Comments': 'New vendor, needs verification'
  },
  {
    'Transport Name': 'Chennai Cargo Solutions',
    'Name': 'Sundar Rajan',
    'City': 'Chennai',
    'State': 'Tamil Nadu',
    'Visiting Card': 'Coastal and southern India specialist',
    'Vehicle Type': '22-Foot Open Body',
    'Main Service City': 'Bangalore',
    'Owner/Broker': 'Broker',
    'WhatsApp Number': '+91-8899001122',
    'Alternate Number': '+91-8899001123',
    'Main Service State': 'Karnataka',
    'Return Service': 'Y',
    'Any Association': 'Y',
    'Association Name': 'South India Transport Federation',
    'Verification': 'Verified',
    'Comments': 'Good for bulk shipments'
  },
  {
    'Transport Name': 'Gujarat Transport Co',
    'Name': 'Kiran Patel',
    'City': 'Ahmedabad',
    'State': 'Gujarat',
    'Visiting Card': 'Industrial goods transport experts',
    'Vehicle Type': '4-Wheeler Pickup',
    'Main Service City': 'Vadodara',
    'Owner/Broker': 'Owner',
    'WhatsApp Number': '+91-7766554433',
    'Alternate Number': '+91-7766554434',
    'Main Service State': 'Gujarat',
    'Return Service': 'Y',
    'Any Association': 'N',
    'Association Name': '',
    'Verification': 'Verified',
    'Comments': 'Small loads specialist'
  },
  {
    'Transport Name': 'Bengal Movers',
    'Name': 'Sourav Das',
    'City': 'Kolkata',
    'State': 'West Bengal',
    'Visiting Card': 'Eastern region logistics provider',
    'Vehicle Type': 'Multi Axle Trailer',
    'Main Service City': 'Bhubaneswar',
    'Owner/Broker': 'Broker',
    'WhatsApp Number': '+91-9123456789',
    'Alternate Number': '+91-9123456780',
    'Main Service State': 'Odisha',
    'Return Service': 'N',
    'Any Association': 'Y',
    'Association Name': 'East India Transporters Guild',
    'Verification': 'Unverified',
    'Comments': 'Heavy machinery transport'
  }
];

// Create Excel file
const createExcel = () => {
  const worksheet = xlsx.utils.json_to_sheet(sampleVendors);
  
  // Set column widths
  const colWidths = [
    { wch: 25 }, // Transport Name
    { wch: 20 }, // Name
    { wch: 15 }, // City
    { wch: 15 }, // State
    { wch: 40 }, // Visiting Card
    { wch: 20 }, // Vehicle Type
    { wch: 20 }, // Main Service City
    { wch: 15 }, // Owner/Broker
    { wch: 18 }, // WhatsApp Number
    { wch: 18 }, // Alternate Number
    { wch: 20 }, // Main Service State
    { wch: 15 }, // Return Service
    { wch: 15 }, // Any Association
    { wch: 30 }, // Association Name
    { wch: 15 }, // Verification
    { wch: 35 }  // Comments
  ];
  worksheet['!cols'] = colWidths;
  
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Vendors');
  
  const excelPath = path.join(__dirname, 'sample_vendors_import.xlsx');
  xlsx.writeFile(workbook, excelPath);
  console.log('✅ Created:', excelPath);
};

// Create CSV file
const createCSV = () => {
  const worksheet = xlsx.utils.json_to_sheet(sampleVendors);
  const csv = xlsx.utils.sheet_to_csv(worksheet);
  
  const csvPath = path.join(__dirname, 'sample_vendors_import.csv');
  fs.writeFileSync(csvPath, csv);
  console.log('✅ Created:', csvPath);
};

// Main execution
console.log('🔨 Creating sample vendor import files...\n');

try {
  createExcel();
  createCSV();
  
  console.log('\n✅ Sample files created successfully!');
  console.log('\n📋 Files created:');
  console.log('   - sample_vendors_import.xlsx (Excel format)');
  console.log('   - sample_vendors_import.csv (CSV format)');
  console.log('\n💡 Usage:');
  console.log('   1. Go to Vendor Management page');
  console.log('   2. Click "Import" button');
  console.log('   3. Select one of these sample files');
  console.log('   4. 5 vendors will be imported\n');
} catch (error) {
  console.error('❌ Error creating files:', error);
  process.exit(1);
}
