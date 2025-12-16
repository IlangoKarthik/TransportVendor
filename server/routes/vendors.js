const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const auth = require('../middleware/auth');
const xlsx = require('xlsx');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');

// Configure multer for file upload (Excel and CSV)
const upload = multer({ 
  dest: 'uploads/temp/',
  fileFilter: (req, file, cb) => {
    // Accept Excel and CSV files
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv'
    ];
    
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    
    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed'));
    }
  }
});

// @route   GET /api/vendors
// @desc    Get all vendors for logged-in user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const vendors = await Vendor.find({ userId: req.userId })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: vendors.length,
      vendors
    });
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/vendors/:id
// @desc    Get single vendor
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.status(200).json({
      success: true,
      vendor
    });
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/vendors
// @desc    Create new vendor
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const vendorData = {
      ...req.body,
      userId: req.userId
    };

    const vendor = await Vendor.create(vendorData);

    res.status(201).json({
      success: true,
      message: 'Vendor created successfully',
      vendor
    });
  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/vendors/:id
// @desc    Update vendor
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    let vendor = await Vendor.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Vendor updated successfully',
      vendor
    });
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/vendors/:id
// @desc    Delete vendor
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const vendor = await Vendor.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    await Vendor.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Vendor deleted successfully'
    });
  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/vendors/import
// @desc    Import vendors from Excel or CSV
// @access  Private
router.post('/import', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read Excel or CSV file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    // Map Excel columns to vendor schema
    const vendors = data.map(row => ({
      userId: req.userId,
      transportName: row['Transport Name'] || row.transportName || row['Transport Company'] || '',
      name: row.Name || row.name || row['Contact Person'] || '',
      city: row.City || row.city || row['Vendor City'] || '',
      state: row.State || row.state || row['Vendor State'] || '',
      visitingCard: row['Visiting Card'] || row.visitingCard || row['Description'] || '',
      vehicleType: row['Vehicle Type'] || row.vehicleType || '',
      mainServiceCity: row['Main Service City'] || row.mainServiceCity || row['Service City'] || '',
      ownerBroker: row['Owner/Broker'] || row.ownerBroker || row['Owner Broker'] || '',
      whatsappNumber: row['WhatsApp Number'] || row.whatsappNumber || row.whatsapp || '',
      alternateNumber: row['Alternate Number'] || row.alternateNumber || row['Alt Number'] || '',
      mainServiceState: row['Main Service State'] || row.mainServiceState || row['Service State'] || '',
      returnService: row['Return Service'] || row.returnService || '',
      anyAssociation: row['Any Association'] || row.anyAssociation || row.association || '',
      associationName: row['Association Name'] || row.associationName || '',
      verification: row.Verification || row.verification || '',
      notes: row.Notes || row.Comments || row.comments || row.notes ? 
        [{ comment: row.Notes || row.Comments || row.comments || row.notes, timestamp: new Date() }] : []
    }));

    // Insert vendors
    const result = await Vendor.insertMany(vendors, { ordered: false });

    // Delete temp file
    await fs.unlink(req.file.path);

    res.status(201).json({
      success: true,
      message: `${result.length} vendors imported successfully`,
      count: result.length
    });
  } catch (error) {
    // Clean up temp file
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    console.error('Import vendors error:', error);
    res.status(500).json({ error: 'Server error during import' });
  }
});

// @route   GET /api/vendors/export/:format
// @desc    Export vendors to Excel or CSV
// @access  Private
router.get('/export/:format', auth, async (req, res) => {
  try {
    const vendors = await Vendor.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    // Format data for export
    const exportData = vendors.map(v => ({
      'Transport Name': v.transportName || '',
      'Name': v.name || '',
      'City': v.city || '',
      'State': v.state || '',
      'Visiting Card': v.visitingCard || '',
      'Vehicle Type': v.vehicleType || '',
      'Main Service City': v.mainServiceCity || '',
      'Owner/Broker': v.ownerBroker || '',
      'WhatsApp Number': v.whatsappNumber || '',
      'Alternate Number': v.alternateNumber || '',
      'Main Service State': v.mainServiceState || '',
      'Return Service': v.returnService || '',
      'Any Association': v.anyAssociation || '',
      'Association Name': v.associationName || '',
      'Verification': v.verification || '',
      'Notes': v.notes?.map(n => n.comment).join('; ') || '',
      'Created At': new Date(v.createdAt).toLocaleString()
    }));

    const format = req.params.format.toLowerCase();
    
    // Create worksheet
    const worksheet = xlsx.utils.json_to_sheet(exportData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Vendors');

    // Generate file based on format
    if (format === 'csv') {
      const csv = xlsx.utils.sheet_to_csv(worksheet);
      res.setHeader('Content-Disposition', 'attachment; filename=vendors_export.csv');
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
    } else {
      // Default to Excel
      const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Disposition', 'attachment; filename=vendors_export.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);
    }
  } catch (error) {
    console.error('Export vendors error:', error);
    res.status(500).json({ error: 'Server error during export' });
  }
});

// NOTE: AI Search and Embedding Generation removed from Node.js server
// Flask db_search service handles all vendor search with embeddings
// Embeddings are automatically generated and cached by Flask when vendors are created/updated

module.exports = router;
