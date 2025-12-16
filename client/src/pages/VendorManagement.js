import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getVendors, 
  createVendor, 
  updateVendor, 
  deleteVendor, 
  importVendors, 
  exportVendors,
  generateEmbeddings
} from '../services/vendorService';
import { states, statesAndCities, vehicleTypes } from '../utils/indiaData';
import './PagesModern.css';

function VendorManagement() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [filteredVendors, setFilteredVendors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Notes state
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');

  const [formData, setFormData] = useState({
    transportName: '',
    name: '',
    city: '',
    state: '',
    visitingCard: '',
    vehicleType: '',
    mainServiceCity: '',
    mainServiceState: '',
    ownerBroker: '',
    whatsappNumber: '',
    alternateNumber: '',
    returnService: '',
    anyAssociation: '',
    associationName: '',
    verification: ''
  });

  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    const filtered = vendors.filter(v => 
      v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.transportName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vehicleType?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredVendors(filtered);
  }, [searchTerm, vendors]);

  const loadVendors = async () => {
    try {
      const data = await getVendors();
      setVendors(data.vendors || []);
    } catch (err) {
      setError('Failed to load vendors');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const dataToSubmit = {
        ...formData,
        notes: notes // Include notes array with timestamps
      };
      
      if (editingVendor) {
        await updateVendor(editingVendor._id, dataToSubmit);
        setSuccess('Vendor updated successfully');
      } else {
        await createVendor(dataToSubmit);
        setSuccess('Vendor created successfully');
      }
      setShowModal(false);
      resetForm();
      loadVendors();
    } catch (err) {
      setError(err.response?.data?.error || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      transportName: vendor.transportName || '',
      name: vendor.name || '',
      city: vendor.city || '',
      state: vendor.state || '',
      visitingCard: vendor.visitingCard || '',
      vehicleType: vendor.vehicleType || '',
      mainServiceCity: vendor.mainServiceCity || '',
      mainServiceState: vendor.mainServiceState || '',
      ownerBroker: vendor.ownerBroker || '',
      whatsappNumber: vendor.whatsappNumber || '',
      alternateNumber: vendor.alternateNumber || '',
      returnService: vendor.returnService || '',
      anyAssociation: vendor.anyAssociation || '',
      associationName: vendor.associationName || '',
      verification: vendor.verification || ''
    });
    setNotes(vendor.notes || []);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this vendor?')) return;

    try {
      await deleteVendor(id);
      setSuccess('Vendor deleted');
      loadVendors();
    } catch (err) {
      setError('Failed to delete vendor');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const data = await importVendors(file);
      setSuccess(`Imported ${data.count || data.inserted || 0} vendor(s)`);
      loadVendors();
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed');
    } finally {
      setLoading(false);
      e.target.value = ''; // Reset file input
    }
  };

  const handleExport = (format) => {
    exportVendors(format);
    setShowExportMenu(false);
  };

  const handleGenerateEmbeddings = async () => {
    if (!window.confirm('Refresh AI search embeddings from MongoDB? This will make all vendors searchable in Vendor DB Search.')) return;

    console.log('🔄 Starting embeddings refresh...');
    console.log('📍 Token in localStorage:', !!localStorage.getItem('token'));
    console.log('🔑 Token value:', localStorage.getItem('token')?.substring(0, 20) + '...');
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      console.log('📡 Calling Flask refresh endpoint...');
      const result = await generateEmbeddings();
      console.log('✅ Success response:', result);
      
      setSuccess('Embeddings refreshed successfully! Vendors are now searchable.');
      
      // Show detailed success message
      setTimeout(() => {
        alert('✅ Search index refreshed!\n\nYou can now:\n1. Go to Vendor DB Search\n2. Search for vendors by name, city, or services\n3. Get AI-powered search results');
      }, 500);
    } catch (err) {
      console.error('❌ Embeddings refresh error:', err);
      console.error('Error details:', err.message);
      
      const errorMessage = err.message || 'Failed to refresh embeddings. Check console for details.';
      setError(errorMessage);
      
      // Show detailed error
      alert('❌ Failed to refresh search index\n\nError: ' + errorMessage + '\n\nCheck browser console for details.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      transportName: '',
      name: '',
      city: '',
      state: '',
      visitingCard: '',
      vehicleType: '',
      mainServiceCity: '',
      mainServiceState: '',
      ownerBroker: '',
      whatsappNumber: '',
      alternateNumber: '',
      returnService: '',
      anyAssociation: '',
      associationName: '',
      verification: ''
    });
    setNotes([]);
    setNewNote('');
    setEditingVendor(null);
  };
  
  const handleAddNote = () => {
    if (!newNote.trim()) return;
    
    const note = {
      comment: newNote.trim(),
      timestamp: new Date().toISOString()
    };
    
    setNotes([...notes, note]);
    setNewNote('');
  };
  
  const handleDeleteNote = (index) => {
    setNotes(notes.filter((_, i) => i !== index));
  };
  
  const getCitiesForState = (stateName) => {
    return statesAndCities[stateName] || [];
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <button onClick={() => navigate('/home')} className="home-btn">
          ← Home
        </button>
        <h1>Vendor Management</h1>
      </header>

      <main className="page-content">
        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box">{success}</div>}

        <div className="toolbar">
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input-small"
          />
          
          <div className="toolbar-actions">
            <button onClick={() => setShowModal(true)} className="btn-add">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Vendor
            </button>
            
            <label className="btn-import">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Import
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImport} style={{ display: 'none' }} />
            </label>
            
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)} 
                className="btn-export"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Export
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '4px' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              
              {showExportMenu && (
                <div className="export-dropdown">
                  <button onClick={() => handleExport('excel')} className="export-option">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    Export as Excel
                  </button>
                  <button onClick={() => handleExport('csv')} className="export-option">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    Export as CSV
                  </button>
                </div>
              )}
            </div>
            
            <button onClick={handleGenerateEmbeddings} disabled={loading} className="btn-embeddings">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Refresh Search Index
            </button>
          </div>
        </div>

        <div className="vendors-table-container">
          <table className="vendors-table">
            <thead>
              <tr>
                <th>Transport Name</th>
                <th>Contact Name</th>
                <th>City</th>
                <th>State</th>
                <th>Vehicle Type</th>
                <th>WhatsApp</th>
                <th>Owner/Broker</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.map((vendor) => (
                <tr key={vendor._id}>
                  <td>{vendor.transportName}</td>
                  <td>{vendor.name}</td>
                  <td>{vendor.city}</td>
                  <td>{vendor.state}</td>
                  <td>{vendor.vehicleType}</td>
                  <td>{vendor.whatsappNumber}</td>
                  <td>{vendor.ownerBroker}</td>
                  <td className="actions-cell">
                    <button onClick={() => handleEdit(vendor)} className="btn-edit-small">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(vendor._id)} className="btn-delete-small">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredVendors.length === 0 && (
            <div className="empty-state">No vendors found</div>
          )}
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</h2>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="close-btn">×</button>
              </div>
              
              <form onSubmit={handleSubmit} className="vendor-form">
                <div className="form-row">
                  <div className="form-field">
                    <label>Transport Name *</label>
                    <input
                      type="text"
                      value={formData.transportName}
                      onChange={(e) => setFormData({ ...formData, transportName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Contact Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>State *</label>
                    <select
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value, city: '' })}
                      required
                    >
                      <option value="">Select State</option>
                      {states.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>City *</label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                      disabled={!formData.state}
                    >
                      <option value="">Select City</option>
                      {formData.state && getCitiesForState(formData.state).map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Vehicle Type *</label>
                    <select
                      value={formData.vehicleType}
                      onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                      required
                    >
                      <option value="">Select Vehicle Type</option>
                      {vehicleTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Owner/Broker *</label>
                    <select
                      value={formData.ownerBroker}
                      onChange={(e) => setFormData({ ...formData, ownerBroker: e.target.value })}
                      required
                    >
                      <option value="">Select Type</option>
                      <option value="Owner">Owner</option>
                      <option value="Broker">Broker</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>WhatsApp Number *</label>
                    <input
                      type="tel"
                      value={formData.whatsappNumber}
                      onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                      required
                      placeholder="+91-XXXXXXXXXX"
                    />
                  </div>
                  <div className="form-field">
                    <label>Alternate Number</label>
                    <input
                      type="tel"
                      value={formData.alternateNumber}
                      onChange={(e) => setFormData({ ...formData, alternateNumber: e.target.value })}
                      placeholder="+91-XXXXXXXXXX"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Main Service State</label>
                    <select
                      value={formData.mainServiceState}
                      onChange={(e) => setFormData({ ...formData, mainServiceState: e.target.value, mainServiceCity: '' })}
                    >
                      <option value="">Select State</option>
                      {states.map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Main Service City</label>
                    <select
                      value={formData.mainServiceCity}
                      onChange={(e) => setFormData({ ...formData, mainServiceCity: e.target.value })}
                      disabled={!formData.mainServiceState}
                    >
                      <option value="">Select City</option>
                      {formData.mainServiceState && getCitiesForState(formData.mainServiceState).map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Return Service *</label>
                    <select
                      value={formData.returnService}
                      onChange={(e) => setFormData({ ...formData, returnService: e.target.value })}
                      required
                    >
                      <option value="">Select Option</option>
                      <option value="Y">Yes</option>
                      <option value="N">No</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Verification Status *</label>
                    <select
                      value={formData.verification}
                      onChange={(e) => setFormData({ ...formData, verification: e.target.value })}
                      required
                    >
                      <option value="">Select Status</option>
                      <option value="Verified">Verified</option>
                      <option value="Unverified">Unverified</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Brief Description/Visiting Card</label>
                    <input
                      type="text"
                      value={formData.visitingCard}
                      onChange={(e) => setFormData({ ...formData, visitingCard: e.target.value })}
                      placeholder="Brief description of services"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Any Association</label>
                    <input
                      type="text"
                      value={formData.anyAssociation}
                      onChange={(e) => setFormData({ ...formData, anyAssociation: e.target.value })}
                      placeholder="Yes/No"
                    />
                  </div>
                  <div className="form-field">
                    <label>Association Name</label>
                    <input
                      type="text"
                      value={formData.associationName}
                      onChange={(e) => setFormData({ ...formData, associationName: e.target.value })}
                      placeholder="Name of association"
                    />
                  </div>
                </div>

                {/* Notes Section */}
                <div className="notes-section">
                  <h3>Notes & Comments</h3>
                  <div className="notes-input-group">
                    <input
                      type="text"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a note or comment..."
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNote())}
                    />
                    <button type="button" onClick={handleAddNote} className="btn-add-note">
                      Add Note
                    </button>
                  </div>
                  
                  <div className="notes-list">
                    {notes.map((note, index) => (
                      <div key={index} className="note-item">
                        <div className="note-content">
                          <p>{note.comment}</p>
                          <span className="note-timestamp">
                            {new Date(note.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(index)}
                          className="btn-delete-note"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {notes.length === 0 && (
                      <p className="no-notes">No notes added yet</p>
                    )}
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-cancel">
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="btn-save">
                    {loading ? 'Saving...' : editingVendor ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default VendorManagement;
