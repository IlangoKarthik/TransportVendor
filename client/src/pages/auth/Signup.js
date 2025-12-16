import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup, verifySignupOtp } from '../../services/authService';
import './Auth.css';

function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: form, 2: OTP verification
  const [formData, setFormData] = useState({
    email: '',
    userId: '',
    password: '',
    confirmPassword: ''
  });
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signup(formData.email, formData.userId, formData.password, formData.confirmPassword);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verifySignupOtp(formData.email, formData.userId, formData.password, otp);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.error || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Netkathir AI Tool</h1>
          <h2>{step === 1 ? 'Sign Up' : 'Verify OTP'}</h2>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your.email@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label>User ID</label>
              <input
                type="text"
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                placeholder="Choose a unique user ID"
                required
                minLength="3"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minimum 8 characters"
                required
                minLength="8"
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Re-enter password"
                required
                minLength="8"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Sending OTP...' : 'Sign Up'}
            </button>

            <div className="auth-footer">
              Already have an account? <Link to="/login">Login instead?</Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="auth-form">
            {error && <div className="error-message">{error}</div>}
            
            <div className="success-message">
              OTP sent to {formData.email}.
            </div>

            <div className="form-group">
              <label>Enter OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP"
                required
                maxLength="6"
              />
              <small style={{ color: '#667eea', marginTop: '8px', display: 'block', fontSize: '14px' }}>
                <strong>Demo OTP:</strong> 1234
              </small>
            </div>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Verifying...' : 'Verify & Create Account'}
            </button>

            <button 
              type="button" 
              onClick={() => setStep(1)} 
              className="btn-secondary"
            >
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Signup;
