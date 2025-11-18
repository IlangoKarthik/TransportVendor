import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import ExcelImport from './ExcelImport';
import './VendorList.css';

const VendorList = ({ onEdit, onAddNew }) => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Prevent double fetch in React StrictMode (development only)
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/vendors`);
      setVendors(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching vendors:', err);
      
      // Provide more specific error messages
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError(`Cannot connect to backend server at ${API_BASE_URL}. Please ensure the backend server is running on port 5000.`);
      } else if (err.response?.status === 503) {
        setError('Backend server is running but database connection failed. Please check server logs.');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error + (err.response.data.details ? `: ${err.response.data.details}` : ''));
      } else {
        setError('Error loading vendors. Please check if the backend server is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/vendors/${id}`);
      setDeleteConfirm(null);
      fetchVendors(); // Refresh the list
    } catch (err) {
      console.error('Error deleting vendor:', err);
      alert('Error deleting vendor. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="vendor-list-container">
        <div className="loading">Loading vendors...</div>
      </div>
    );
  }

  const handleImportSuccess = () => {
    fetchVendors(); // Refresh the list after import
  };

  return (
    <div className="vendor-list-container">
      <div className="list-header">
        <h2>Vendors List</h2>
        <div className="header-actions">
          <button className="btn-import-excel" onClick={() => setShowImportModal(true)}>
            📊 Import Excel
          </button>
          <button className="btn-add-new" onClick={onAddNew}>
            + Add New Vendor
          </button>
        </div>
      </div>

      {showImportModal && (
        <ExcelImport
          onImportSuccess={handleImportSuccess}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {error && <div className="error-message">{error}</div>}

      {vendors.length === 0 ? (
        <div className="empty-state">
          <p>No vendors found.</p>
          <button className="btn-add-new" onClick={onAddNew}>
            Add First Vendor
          </button>
        </div>
      ) : (
        <>
          <div className="list-info">
            <p>Total Vendors: <strong>{vendors.length}</strong></p>
          </div>
          <div className="table-wrapper">
            <table className="vendors-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Transport Name</th>
                  <th>Owner/Broker</th>
                  <th>State</th>
                  <th>City</th>
                  <th>WhatsApp</th>
                  <th>Vehicle Type</th>
                  <th>Return Service</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td>{vendor.id}</td>
                    <td>{vendor.name || '-'}</td>
                    <td>{vendor.transport_name || '-'}</td>
                    <td>{vendor.owner_broker || '-'}</td>
                    <td>{vendor.vendor_state || '-'}</td>
                    <td>{vendor.vendor_city || '-'}</td>
                    <td>{vendor.whatsapp_number || '-'}</td>
                    <td>{vendor.vehicle_type || '-'}</td>
                    <td>
                      <span className={`badge ${vendor.return_service === 'Y' ? 'badge-yes' : 'badge-no'}`}>
                        {vendor.return_service === 'Y' ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>{formatDate(vendor.created_at)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-edit"
                          onClick={() => onEdit(vendor.id)}
                          title="Edit"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                          Edit
                        </button>
                        {deleteConfirm === vendor.id ? (
                          <div className="delete-confirm">
                            <button
                              className="btn-delete-confirm"
                              onClick={() => handleDelete(vendor.id)}
                              title="Confirm Delete"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </button>
                            <button
                              className="btn-delete-cancel"
                              onClick={() => setDeleteConfirm(null)}
                              title="Cancel"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn-delete"
                            onClick={() => setDeleteConfirm(vendor.id)}
                            title="Delete"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default VendorList;

