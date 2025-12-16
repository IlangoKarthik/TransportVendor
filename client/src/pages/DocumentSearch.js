import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_CONFIG } from '../config/api';
import './Pages.css';

function DocumentSearch() {
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

    // Check if Flask service is running with retry
    let attempts = 0;
    const maxAttempts = 3;
    
    const checkFlask = async () => {
      try {
        const url = `${API_CONFIG.DOC_SEARCH_API}/health`;
        console.log(`[Attempt ${attempts + 1}/${maxAttempts}] Checking Flask at:`, url);
        const res = await fetch(url, { method: 'GET' });
        if (res.ok) {
          setFlaskReady(true);
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch (err) {
        console.error('Flask fetch error:', err);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkFlask, 2000);
        } else {
          setError(`Document Search service not available after ${maxAttempts} attempts. The service may still be starting up - please refresh in a moment.`);
        }
      }
    };
    
    checkFlask();
  }, [token, navigate]);

  return (
    <div className="page-container" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header className="page-header" style={{ flexShrink: 0 }}>
        <button onClick={() => navigate('/home')} className="home-btn">
          ← Home
        </button>
        <h1>Document AI Search</h1>
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
          src={`${API_CONFIG.DOC_SEARCH_API}?token=${encodeURIComponent(token)}`}
          title="Document Search"
          allow="microphone"
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
          <p>Loading Document Search...</p>
        </div>
      )}
    </div>
  );
}

export default DocumentSearch;
