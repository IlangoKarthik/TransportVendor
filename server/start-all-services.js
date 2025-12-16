#!/usr/bin/env node

/**
 * Startup orchestrator for Netkathir AI Tool
 * Starts Flask services then Node API server
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const FLASK_DB_PORT = 5002;
const FLASK_DOC_PORT = 5001;
const NODE_PORT = process.env.PORT || 10000;

console.log('\n' + '='.repeat(60));
console.log('Starting Netkathir AI Tool Services');
console.log(new Date().toISOString());
console.log('='.repeat(60) + '\n');

// Helper to check if service is up
async function waitForService(port, serviceName, maxAttempts = 30) {
  console.log(`[${serviceName}] Waiting for service on port ${port}...`);
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/health`, (res) => {
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
        req.on('error', reject);
        req.setTimeout(1000);
      });
      
      console.log(`[${serviceName}] ✓ Service is healthy on port ${port}`);
      return true;
    } catch (err) {
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  console.error(`[${serviceName}] ✗ Failed to connect after ${maxAttempts} attempts`);
  return false;
}

// Start Flask service
function startFlaskService(name, port, workDir) {
  console.log(`\n[${name}] Starting on port ${port}...`);
  console.log(`[${name}] Working directory: ${workDir}`);
  
  const flask = spawn('python3', ['api.py'], {
    cwd: workDir,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  flask.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => console.log(`[${name}] ${line}`));
  });
  
  flask.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => console.error(`[${name}] ERROR: ${line}`));
  });
  
  flask.on('exit', (code, signal) => {
    console.error(`[${name}] Process exited with code ${code}, signal ${signal}`);
    if (code !== 0 && code !== null) {
      console.error(`[${name}] Service crashed! Logs should be above.`);
    }
  });
  
  flask.on('error', (err) => {
    console.error(`[${name}] Failed to start:`, err);
  });
  
  return flask;
}

// Main startup sequence
async function main() {
  const processes = [];
  
  try {
    // Start Flask DB Search
    console.log('\n[1/3] Starting Flask DB Search Service...');
    const dbSearch = startFlaskService(
      'DB-Search',
      FLASK_DB_PORT,
      path.join(__dirname, '../db_search')
    );
    processes.push(dbSearch);
    
    // Wait for DB Search to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));
    const dbReady = await waitForService(FLASK_DB_PORT, 'DB-Search', 10);
    
    // Start Flask Document Search
    console.log('\n[2/3] Starting Flask Document Search Service...');
    const docSearch = startFlaskService(
      'Doc-Search',
      FLASK_DOC_PORT,
      path.join(__dirname, '../document_search')
    );
    processes.push(docSearch);
    
    // Wait for Document Search to be ready
    await new Promise(resolve => setTimeout(resolve, 3000));
    const docReady = await waitForService(FLASK_DOC_PORT, 'Doc-Search', 10);
    
    // Report status
    console.log('\n' + '='.repeat(60));
    console.log('Flask Services Status:');
    console.log(`  DB Search (port ${FLASK_DB_PORT}):   ${dbReady ? '✓ Running' : '✗ Failed'}`);
    console.log(`  Doc Search (port ${FLASK_DOC_PORT}): ${docReady ? '✓ Running' : '✗ Failed'}`);
    console.log('='.repeat(60) + '\n');
    
    if (!dbReady && !docReady) {
      console.error('⚠️  WARNING: Both Flask services failed to start!');
      console.error('   The app will still start but search features will not work.');
    } else if (!dbReady || !docReady) {
      console.error('⚠️  WARNING: One Flask service failed to start.');
    }
    
    // Start Node.js server
    console.log('[3/3] Starting Node.js API Server...');
    console.log(`      Port: ${NODE_PORT}`);
    console.log(`      Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');
    
    // Load and start the Express app
    require('./index.js');
    
  } catch (err) {
    console.error('\n✗ Startup failed:', err);
    process.exit(1);
  }
  
  // Handle shutdown
  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    processes.forEach(p => p.kill());
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    processes.forEach(p => p.kill());
    process.exit(0);
  });
}

// Run
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
