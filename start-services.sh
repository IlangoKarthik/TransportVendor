#!/bin/bash

echo "=================================================="
echo "Starting Netkathir AI Tool Services"
echo "$(date)"
echo "=================================================="

# Try to start Flask DB Search Service
echo ""
echo "[1/3] Starting Flask DB Search Service (port 5002)..."
cd /app/db_search || { echo "ERROR: Cannot cd to db_search"; exit 1; }
export PYTHONUNBUFFERED=1

nohup python3 api.py > /tmp/flask-db-search.log 2>&1 &
FLASK_DB_PID=$!
echo "      Flask DB PID: $FLASK_DB_PID"

sleep 3
if ! kill -0 $FLASK_DB_PID 2>/dev/null; then
    echo "✗ Flask DB Search crashed! Logs:"
    tail -100 /tmp/flask-db-search.log
    echo ""
    echo "Attempting to continue with Document Search..."
else
    echo "✓ Flask DB Search appears to be running"
    tail -10 /tmp/flask-db-search.log
fi

# Try to start Flask Document Search Service
echo ""
echo "[2/3] Starting Flask Document Search Service (port 5001)..."
cd /app/document_search || { echo "ERROR: Cannot cd to document_search"; exit 1; }
export PYTHONUNBUFFERED=1

nohup python3 api.py > /tmp/flask-doc-search.log 2>&1 &
FLASK_DOC_PID=$!
echo "      Flask Doc PID: $FLASK_DOC_PID"

sleep 3
if ! kill -0 $FLASK_DOC_PID 2>/dev/null; then
    echo "✗ Flask Document Search crashed! Logs:"
    tail -100 /tmp/flask-doc-search.log
    echo ""
    echo "Attempting to continue with Node..."
else
    echo "✓ Flask Document Search appears to be running"
    tail -10 /tmp/flask-doc-search.log
fi

# Start Node.js API Server
echo ""
echo "[3/3] Starting Node.js API Server (port ${PORT:-10000})..."
cd /app/server || { echo "ERROR: Cannot cd to server"; exit 1; }
export NODE_ENV=production
export PYTHONUNBUFFERED=1

echo "Launching Node.js..."
exec node index.js 2>&1
