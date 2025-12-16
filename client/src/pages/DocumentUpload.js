import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Pages.css';

function DocumentUpload() {
  const navigate = useNavigate();
  const [flaskReady, setFlaskReady] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    // Check if user is logged in
    if (!token) {
      navigate('/login');
      return;
    }

    // Check if Flask service is running
    fetch(`http://localhost:5001/api/stats?token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(() => setFlaskReady(true))
      .catch(err => setError('Document Upload service not available. Please start Flask services.'));
  }, [token, navigate]);

  return (
    <div className="page-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="page-header" style={{ flexShrink: 0 }}>
        <button onClick={() => navigate('/home')} className="home-btn">
          ← Home
        </button>
        <h1>Document Upload</h1>
      </header>

      {error && (
        <div className="error-box" style={{ margin: '20px' }}>
          {error}
          <p style={{ marginTop: '10px', fontSize: '14px' }}>
            Run <code>./start-flask-services.sh</code> or <code>npm start</code> from root
          </p>
        </div>
      )}

      {flaskReady && (
        <iframe
          src={`http://localhost:5001/upload?token=${encodeURIComponent(token)}`}
          title="Document Upload"
          style={{
            width: '100%',
            flexGrow: 1,
            border: 'none',
            backgroundColor: 'white'
          }}
        />
      )}

      {!flaskReady && !error && (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div className="spinner"></div>
          <p>Loading Document Upload...</p>
        </div>
      )}
    </div>
  );
}

export default DocumentUpload;
