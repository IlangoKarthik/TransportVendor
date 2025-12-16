#!/bin/bash

# Startup script for Netkathir AI Tool
# Starts all three services: Node.js backend, Document Search (Flask), Vendor Search (Flask)

echo "Starting Netkathir AI Tool..."
echo "========================================"

# Kill any existing processes on these ports
echo "Cleaning up existing processes..."
lsof -ti:5003 | xargs kill -9 2>/dev/null
lsof -ti:5001 | xargs kill -9 2>/dev/null
lsof -ti:5002 | xargs kill -9 2>/dev/null

# Create logs directory
mkdir -p logs

# Start Document Search Flask app (port 5001)
echo "Starting Document Search service on port 5001..."
cd document_search
python3 api.py > ../logs/document_search.log 2>&1 &
DOC_SEARCH_PID=$!
cd ..

# Wait a bit for first service to start
sleep 2

# Start Vendor Search Flask app (port 5002)
echo "Starting Vendor Search service on port 5002..."
cd db_search
python3 api.py > ../logs/vendor_search.log 2>&1 &
VENDOR_SEARCH_PID=$!
cd ..

# Wait a bit for second service to start
sleep 2

# Start Node.js backend (port 5003)
echo "Starting Node.js backend on port 5003..."
cd server
npm start > ../logs/server.log 2>&1 &
NODE_PID=$!
cd ..

echo ""
echo "========================================"
echo "✓ All services started!"
echo "========================================"
echo "Document Search: http://localhost:5003/document-search (Flask on 5001)"
echo "Vendor Search:   http://localhost:5003/vendor-search (Flask on 5002)"
echo "Main Backend:    http://localhost:5003 (Node.js)"
echo "Frontend:        http://localhost:3000 (React - start separately)"
echo ""
echo "Process IDs:"
echo "  Document Search: $DOC_SEARCH_PID"
echo "  Vendor Search:   $VENDOR_SEARCH_PID"
echo "  Node.js:         $NODE_PID"
echo ""
echo "Logs:"
echo "  tail -f logs/document_search.log"
echo "  tail -f logs/vendor_search.log"
echo "  tail -f logs/server.log"
echo ""
echo "To stop all services:"
echo "  ./stop.sh"
echo "========================================"

# Save PIDs to file for stopping later
echo $DOC_SEARCH_PID > logs/doc_search.pid
echo $VENDOR_SEARCH_PID > logs/vendor_search.pid
echo $NODE_PID > logs/node.pid
