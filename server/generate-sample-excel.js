const XLSX = require('xlsx');
const path = require('path');

// Sample vendor data
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
  },
  {
    'Name': 'Priya Sharma',
    'Transport Name': 'Premium Cargo Movers',
    'Visiting Card': 'Business Card',
    'Owner/Broker': 'Priya Sharma',
    'Vendor State': 'Delhi',
    'Vendor City': 'New Delhi',
    'WhatsApp Number': '9876543240',
    'Alternate Number': '9876543241',
    'Vehicle Type': 'Container',
    'Main Service State': 'Delhi',
    'Main Service City': 'New Delhi',
    'Return Service': 'Y',
    'Any Association': 'N',
    'Association Name': '',
    'Verification': 'Verified'
  },
  {
    'Name': 'Amit Patel',
    'Transport Name': 'Swift Delivery Services',
    'Visiting Card': '',
    'Owner/Broker': 'Amit Patel',
    'Vendor State': 'Gujarat',
    'Vendor City': 'Ahmedabad',
    'WhatsApp Number': '9876543250',
    'Alternate Number': '',
    'Vehicle Type': 'Truck',
    'Main Service State': 'Gujarat',
    'Main Service City': 'Ahmedabad',
    'Return Service': 'N',
    'Any Association': 'Y',
    'Association Name': 'Gujarat Transport Association',
    'Verification': 'Pending'
  }
];

// Create workbook and worksheet
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(sampleData);

// Set column widths for better readability
const colWidths = [
  { wch: 15 }, // Name
  { wch: 25 }, // Transport Name
  { wch: 20 }, // Visiting Card
  { wch: 15 }, // Owner/Broker
  { wch: 15 }, // Vendor State
  { wch: 15 }, // Vendor City
  { wch: 18 }, // WhatsApp Number
  { wch: 18 }, // Alternate Number
  { wch: 15 }, // Vehicle Type
  { wch: 20 }, // Main Service State
  { wch: 20 }, // Main Service City
  { wch: 15 }, // Return Service
  { wch: 18 }, // Any Association
  { wch: 25 }, // Association Name
  { wch: 15 }  // Verification
];
ws['!cols'] = colWidths;

XLSX.utils.book_append_sheet(wb, ws, 'Vendors');

// Write file
const outputPath = path.join(__dirname, 'vendors_import_sample.xlsx');
XLSX.writeFile(wb, outputPath);

console.log('✅ Sample Excel file generated successfully!');
console.log(`📍 Location: ${outputPath}`);
console.log(`📊 Contains ${sampleData.length} sample vendor records`);

