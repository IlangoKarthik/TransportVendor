# Sample Vendor Import Files

This directory contains sample Excel and CSV files for testing the vendor import functionality.

## Files

- **sample_vendors_import.xlsx** - Excel format with 5 sample vendors
- **sample_vendors_import.csv** - CSV format with the same 5 sample vendors

## Sample Data Included

The files contain 5 vendors with complete information:

1. **ABC Logistics** (Mumbai, Maharashtra) - Electronics specialist
2. **Delhi Express Carriers** (Delhi) - Fast delivery service
3. **Chennai Cargo Solutions** (Chennai, Tamil Nadu) - Coastal specialist
4. **Gujarat Transport Co** (Ahmedabad, Gujarat) - Industrial goods expert
5. **Bengal Movers** (Kolkata, West Bengal) - Heavy machinery transport

## How to Use

### Import Process

1. Go to **Vendor Management** page
2. Click the **Import** button
3. Select either the `.xlsx` or `.csv` file
4. 5 vendors will be imported automatically
5. All vendors will be searchable in the Vendor DB Search

### Column Format

Both files use the following columns (must match exactly for import):

```
Transport Name, Name, City, State, Visiting Card, Vehicle Type,
Main Service City, Owner/Broker, WhatsApp Number, Alternate Number,
Main Service State, Return Service, Any Association, Association Name,
Verification, Notes
```

### Supported File Formats

- **Excel**: `.xlsx`, `.xls`
- **CSV**: `.csv` (comma-separated values)

## Export Functionality

After importing (or adding your own vendors), you can export the data:

1. Click the **Export** button dropdown
2. Choose:
   - **Export as Excel** - Creates `.xlsx` file
   - **Export as CSV** - Creates `.csv` file
3. File downloads automatically

## Field Mapping

| Column Name | MongoDB Field | Description |
|------------|---------------|-------------|
| Transport Name | transportName | Company name |
| Name | name | Contact person |
| City | city | Vendor city |
| State | state | Vendor state |
| Visiting Card | visitingCard | Brief description |
| Vehicle Type | vehicleType | Type of vehicles |
| Main Service City | mainServiceCity | Primary service area |
| Owner/Broker | ownerBroker | Owner or Broker |
| WhatsApp Number | whatsappNumber | WhatsApp contact |
| Alternate Number | alternateNumber | Alternative phone |
| Main Service State | mainServiceState | Service state |
| Return Service | returnService | Y/N for return service |
| Any Association | anyAssociation | Y/N for association |
| Association Name | associationName | Name of association |
| Verification | verification | Verified/Pending/Unverified |
| Notes | notes | Comments/notes |

## Creating Your Own Import Files

### Excel Method

1. Open Excel or Google Sheets
2. Create headers in row 1 (see column names above)
3. Add your vendor data in subsequent rows
4. Save as `.xlsx` or `.csv`

### CSV Method

1. Create a text file with `.csv` extension
2. First line: column headers (comma-separated)
3. Subsequent lines: vendor data (comma-separated)
4. Save and import

### Example CSV Format

```csv
Transport Name,Name,City,State,Vehicle Type,Verification
XYZ Logistics,John Doe,Mumbai,Maharashtra,32-Foot Container,Verified
```

## Notes

- Empty fields are allowed - they will be stored as empty strings
- Notes field supports multiple notes (will be converted to array)
- Dates are automatically added on import (createdAt, updatedAt)
- Duplicate entries will be imported (no automatic deduplication)

## Re-creating Sample Files

If you need to regenerate the sample files:

```bash
cd server
node create_sample_files.js
```

This will create fresh `sample_vendors_import.xlsx` and `sample_vendors_import.csv` files.
