import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';

import Signup from './pages/auth/Signup';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import Home from './pages/Home';
import DocumentSearch from './pages/DocumentSearch';
import DocumentUpload from './pages/DocumentUpload';
import VendorSearch from './pages/VendorSearch';
import VendorManagement from './pages/VendorManagement';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/document-search" element={<ProtectedRoute><DocumentSearch /></ProtectedRoute>} />
        <Route path="/document-upload" element={<ProtectedRoute><DocumentUpload /></ProtectedRoute>} />
        <Route path="/vendor-search" element={<ProtectedRoute><VendorSearch /></ProtectedRoute>} />
        <Route path="/vendor-management" element={<ProtectedRoute><VendorManagement /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

