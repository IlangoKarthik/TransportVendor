import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import API_BASE_URL from '../config';
import './VendorForm.css';

const VendorForm = ({ vendorId, onCancel, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    transport_name: '',
    visiting_card: '',
    owner_broker: '',
    vendor_state: '',
    vendor_city: '',
    whatsapp_number: '',
    alternate_number: '',
    vehicle_type: '',
    main_service_state: '',
    main_service_city: '',
    return_service: 'N',
    any_association: 'N',
    association_name: '',
    verification: ''
  });

  const [notes, setNotes] = useState([]); // Notes array with comments and timestamps
  const [newComment, setNewComment] = useState(''); // New comment input
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [addingComment, setAddingComment] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const isEditMode = !!vendorId;
  const fetchedVendorIdRef = useRef(null);

  useEffect(() => {
    // Prevent double fetch in React StrictMode (development only)
    if (vendorId && fetchedVendorIdRef.current !== vendorId) {
      fetchedVendorIdRef.current = vendorId;
      fetchVendor();
    }
  }, [vendorId]);

  const fetchVendor = async () => {
    try {
      setFetching(true);
      const response = await axios.get(`${API_BASE_URL}/api/vendors/${vendorId}`);
      setFormData({
        name: response.data.name || '',
        transport_name: response.data.transport_name || '',
        visiting_card: response.data.visiting_card || '',
        owner_broker: response.data.owner_broker || '',
        vendor_state: response.data.vendor_state || '',
        vendor_city: response.data.vendor_city || '',
        whatsapp_number: response.data.whatsapp_number || '',
        alternate_number: response.data.alternate_number || '',
        vehicle_type: response.data.vehicle_type || '',
        main_service_state: response.data.main_service_state || '',
        main_service_city: response.data.main_service_city || '',
        return_service: response.data.return_service || 'N',
        any_association: response.data.any_association || 'N',
        association_name: response.data.association_name || '',
        verification: response.data.verification || ''
      });
      // Set notes as array
      setNotes(Array.isArray(response.data.notes) ? response.data.notes : []);
    } catch (error) {
      console.error('Error fetching vendor:', error);
      setMessage({ 
        type: 'error', 
        text: 'Error loading vendor details. Please try again.' 
      });
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (isEditMode) {
        // Update existing vendor
        await axios.put(`${API_BASE_URL}/api/vendors/${vendorId}`, formData);
        setMessage({ type: 'success', text: 'Vendor details updated successfully!' });
      } else {
        // Create new vendor
        await axios.post(`${API_BASE_URL}/api/vendors`, formData);
        setMessage({ type: 'success', text: 'Vendor details saved successfully!' });
        
        // Reset form
        setFormData({
          name: '',
          transport_name: '',
          visiting_card: '',
          owner_broker: '',
          vendor_state: '',
          vendor_city: '',
          whatsapp_number: '',
          alternate_number: '',
          vehicle_type: '',
          main_service_state: '',
          main_service_city: '',
          return_service: 'N',
          any_association: 'N',
          association_name: '',
          verification: ''
        });
        setNotes([]);
        setNewComment('');
      }
      
      // Call onSuccess callback after a short delay to show success message
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving vendor:', error);
      // Check for duplicate vendor error (409 Conflict)
      if (error.response?.status === 409) {
        const duplicateMessage = error.response?.data?.message || 
          `A vendor with the name "${formData.name}" and transport name "${formData.transport_name}" already exists.`;
        setMessage({ 
          type: 'error', 
          text: duplicateMessage
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: error.response?.data?.error || error.response?.data?.details || error.response?.data?.message || 'Error saving vendor details. Please try again.' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!newComment.trim()) {
      setMessage({ type: 'error', text: 'Please enter a comment' });
      return;
    }

    if (!isEditMode || !vendorId) {
      setMessage({ type: 'error', text: 'Please save the vendor first before adding comments' });
      return;
    }

    setAddingComment(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.post(`${API_BASE_URL}/api/vendors/${vendorId}/notes`, {
        comment: newComment.trim()
      });
      
      // Ensure notes is an array
      const updatedNotes = Array.isArray(response.data.notes) 
        ? response.data.notes 
        : (response.data.notes ? [response.data.notes] : []);
      
      setNotes(updatedNotes);
      setNewComment('');
      setMessage({ type: 'success', text: 'Comment added successfully!' });
      
      // Clear success message after 2 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 2000);
    } catch (error) {
      console.error('Error adding comment:', error);
      console.error('Error response:', error.response?.data);
      setMessage({
        type: 'error',
        text: error.response?.data?.error || error.response?.data?.details || 'Error adding comment. Please try again.'
      });
    } finally {
      setAddingComment(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return timestamp;
    }
  };

  if (fetching) {
    return (
      <div className="vendor-form-container">
        <div className="loading">Loading vendor details...</div>
      </div>
    );
  }

  return (
    <div className="vendor-form-container">
      <div className="form-header">
        <h2>{isEditMode ? 'Edit Vendor' : 'Add New Vendor'}</h2>
        {onCancel && (
          <button type="button" className="btn-cancel" onClick={onCancel}>
            ← Back to List
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="vendor-form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="name">Name <span className="required">*</span></label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="transport_name">Transport Name <span className="required">*</span></label>
            <input
              type="text"
              id="transport_name"
              name="transport_name"
              value={formData.transport_name}
              onChange={handleChange}
              required
              placeholder="Enter transport name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="visiting_card">Visiting Card</label>
            <input
              type="text"
              id="visiting_card"
              name="visiting_card"
              value={formData.visiting_card}
              onChange={handleChange}
              placeholder="Enter visiting card details"
            />
          </div>

          <div className="form-group">
            <label htmlFor="owner_broker">Owner/Broker</label>
            <input
              type="text"
              id="owner_broker"
              name="owner_broker"
              value={formData.owner_broker}
              onChange={handleChange}
              placeholder="Enter owner/broker name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="vendor_state">Vendor State</label>
            <input
              type="text"
              id="vendor_state"
              name="vendor_state"
              value={formData.vendor_state}
              onChange={handleChange}
              placeholder="Enter vendor state"
            />
          </div>

          <div className="form-group">
            <label htmlFor="vendor_city">Vendor City</label>
            <input
              type="text"
              id="vendor_city"
              name="vendor_city"
              value={formData.vendor_city}
              onChange={handleChange}
              placeholder="Enter vendor city"
            />
          </div>

          <div className="form-group">
            <label htmlFor="whatsapp_number">Whatsapp Number</label>
            <input
              type="tel"
              id="whatsapp_number"
              name="whatsapp_number"
              value={formData.whatsapp_number}
              onChange={handleChange}
              placeholder="Enter WhatsApp number"
            />
          </div>

          <div className="form-group">
            <label htmlFor="alternate_number">Alternate Number</label>
            <input
              type="tel"
              id="alternate_number"
              name="alternate_number"
              value={formData.alternate_number}
              onChange={handleChange}
              placeholder="Enter alternate number"
            />
          </div>

          <div className="form-group">
            <label htmlFor="vehicle_type">Vehicle Type</label>
            <input
              type="text"
              id="vehicle_type"
              name="vehicle_type"
              value={formData.vehicle_type}
              onChange={handleChange}
              placeholder="Enter vehicle type"
            />
          </div>

          <div className="form-group">
            <label htmlFor="main_service_state">Main Service State</label>
            <input
              type="text"
              id="main_service_state"
              name="main_service_state"
              value={formData.main_service_state}
              onChange={handleChange}
              placeholder="Enter main service state"
            />
          </div>

          <div className="form-group">
            <label htmlFor="main_service_city">Main Service City</label>
            <input
              type="text"
              id="main_service_city"
              name="main_service_city"
              value={formData.main_service_city}
              onChange={handleChange}
              placeholder="Enter main service city"
            />
          </div>

          <div className="form-group">
            <label htmlFor="return_service">Return Service</label>
            <select
              id="return_service"
              name="return_service"
              value={formData.return_service}
              onChange={handleChange}
            >
              <option value="N">No</option>
              <option value="Y">Yes</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="any_association">Any Association</label>
            <select
              id="any_association"
              name="any_association"
              value={formData.any_association}
              onChange={handleChange}
            >
              <option value="N">No</option>
              <option value="Y">Yes</option>
            </select>
          </div>

          {formData.any_association === 'Y' && (
            <div className="form-group">
              <label htmlFor="association_name">Association Name</label>
              <input
                type="text"
                id="association_name"
                name="association_name"
                value={formData.association_name}
                onChange={handleChange}
                placeholder="Enter association name"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="verification">Verification</label>
            <input
              type="text"
              id="verification"
              name="verification"
              value={formData.verification}
              onChange={handleChange}
              placeholder="Enter verification details"
            />
          </div>

          <div className="form-group form-group-full-width">
            <label htmlFor="notes">Comments & Notes</label>
            
            {/* Display existing notes/comments */}
            {notes && notes.length > 0 && (
              <div className="notes-list">
                {notes.map((note, index) => (
                  <div key={index} className="note-item">
                    <div className="note-content">{note.comment || note}</div>
                    <div className="note-timestamp">
                      {note.timestamp ? formatTimestamp(note.timestamp) : 'No timestamp'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add new comment section */}
            {isEditMode && vendorId && (
              <div className="add-comment-form">
                <textarea
                  id="newComment"
                  name="newComment"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a new comment or note..."
                  rows="3"
                  disabled={addingComment}
                  onKeyDown={(e) => {
                    // Allow Ctrl+Enter or Cmd+Enter to submit
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleAddComment(e);
                    }
                  }}
                />
                <button 
                  type="button" 
                  className="btn-add-comment"
                  onClick={handleAddComment}
                  disabled={addingComment || !newComment.trim()}
                >
                  {addingComment ? 'Adding...' : 'Add Comment'}
                </button>
              </div>
            )}

            {!isEditMode && (
              <p className="notes-hint">Save the vendor first to add comments</p>
            )}
          </div>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="form-actions">
          {onCancel && (
            <button 
              type="button" 
              className="btn-cancel-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update Vendor' : 'Submit')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VendorForm;

