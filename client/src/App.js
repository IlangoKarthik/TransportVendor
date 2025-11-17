import React, { useState } from 'react';
import './App.css';
import VendorForm from './components/VendorForm';
import VendorList from './components/VendorList';

function App() {
  const [currentView, setCurrentView] = useState('list'); // 'list' or 'form'
  const [editingVendorId, setEditingVendorId] = useState(null);

  const handleAddNew = () => {
    setEditingVendorId(null);
    setCurrentView('form');
  };

  const handleEdit = (vendorId) => {
    setEditingVendorId(vendorId);
    setCurrentView('form');
  };

  const handleCancel = () => {
    setEditingVendorId(null);
    setCurrentView('list');
  };

  const handleSuccess = () => {
    // After successful save/update, return to list view
    setTimeout(() => {
      setEditingVendorId(null);
      setCurrentView('list');
    }, 1500);
  };

  return (
    <div className={`App ${currentView === 'form' ? 'form-view' : ''}`}>
      <div className={`container ${currentView === 'list' ? 'container-full-width' : ''}`}>
        <header className="app-header">
          <h1>Transport Vendor Management</h1>
          <p>{currentView === 'list' ? 'View and manage all vendors' : 'Add or edit vendor details'}</p>
        </header>
        {currentView === 'list' ? (
          <VendorList onEdit={handleEdit} onAddNew={handleAddNew} />
        ) : (
          <VendorForm 
            vendorId={editingVendorId} 
            onCancel={handleCancel}
            onSuccess={handleSuccess}
          />
        )}
      </div>
    </div>
  );
}

export default App;

