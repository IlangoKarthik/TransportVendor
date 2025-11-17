import React, { useState } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import './ExcelImport.css';

const ExcelImport = ({ onImportSuccess, onClose }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [importResult, setImportResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv' // .csv
      ];
      
      if (!allowedTypes.includes(selectedFile.type)) {
        setMessage({ 
          type: 'error', 
          text: 'Invalid file type. Please select an Excel file (.xlsx, .xls) or CSV file.' 
        });
        setFile(null);
        return;
      }

      if (selectedFile.size > 5 * 1024 * 1024) { // 5MB
        setMessage({ 
          type: 'error', 
          text: 'File size exceeds 5MB limit. Please select a smaller file.' 
        });
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setMessage({ type: '', text: '' });
    }
  };

  const handleImport = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file to import' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_BASE_URL}/api/vendors/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setImportResult(response.data);
      
      // Check if there are any errors
      const hasErrors = response.data.errors && response.data.errors.length > 0;
      
      if (hasErrors) {
        // If there are errors, show error message but keep popup open
        setMessage({ 
          type: 'error', 
          text: response.data.message || `Import completed with ${response.data.errors.length} error(s). Please review the errors below.`
        });
        // Refresh vendor list to show any successfully imported vendors
        if (onImportSuccess && response.data.imported > 0) {
          onImportSuccess();
        }
      } else {
        // If no errors, show success and close after delay
        setMessage({ 
          type: 'success', 
          text: response.data.message 
        });
        // Refresh vendor list after successful import
        if (onImportSuccess) {
          setTimeout(() => {
            onImportSuccess();
            if (onClose) onClose();
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error importing file:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || error.response?.data?.details || 'Error importing file. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/vendors/export-template`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'vendors_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setMessage({ 
        type: 'success', 
        text: 'Template downloaded successfully!' 
      });
    } catch (error) {
      console.error('Error downloading template:', error);
      setMessage({ 
        type: 'error', 
        text: 'Error downloading template. Please try again.' 
      });
    }
  };

  return (
    <div className="excel-import-overlay" onClick={onClose}>
      <div className="excel-import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="excel-import-header">
          <h2>Import Vendors from Excel</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="excel-import-content">
          {message.text && (
            <div className={`import-message ${message.type}`}>
              {message.text}
            </div>
          )}

          {importResult && (
            <div className="import-result">
              <div className="result-summary">
                <p><strong>Import Summary:</strong></p>
                <ul>
                  <li>Total Rows: {importResult.total}</li>
                  <li className="success">Imported: {importResult.imported}</li>
                  {importResult.errors && importResult.errors.length > 0 && (
                    <li className="error">Errors: {importResult.errors.length}</li>
                  )}
                </ul>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="import-errors">
                  <p><strong>Errors:</strong></p>
                  <ul>
                    {importResult.errors.map((err, index) => (
                      <li key={index}>{err.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="file-upload-section">
            <label className="file-upload-label">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                disabled={loading}
                className="file-input"
              />
              <div className="file-upload-box">
                {file ? (
                  <div className="file-selected">
                    <span className="file-icon">📄</span>
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">
                      ({(file.size / 1024).toFixed(2)} KB)
                    </span>
                  </div>
                ) : (
                  <div className="file-placeholder">
                    <span className="upload-icon">📤</span>
                    <span>Click to select Excel file (.xlsx, .xls, .csv)</span>
                    <span className="file-hint">Maximum file size: 5MB</span>
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="template-section">
            <p>Don't have a template? Download our sample template:</p>
            <button
              className="btn-download-template"
              onClick={handleDownloadTemplate}
              disabled={loading}
            >
              📥 Download Sample Template
            </button>
          </div>

          <div className="import-actions">
            <button
              className="btn-cancel-import"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="btn-import"
              onClick={handleImport}
              disabled={loading || !file}
            >
              {loading ? 'Importing...' : 'Import Vendors'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExcelImport;

