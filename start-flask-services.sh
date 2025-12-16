#!/bin/bash

# Start Flask microservices for document and vendor search
# These provide the full-featured UIs with voice search, transcription, etc.

echo "================================================"
echo "Starting Flask Microservices"
echo "================================================"

# Create logs directory
mkdir -p logs

# Kill any existing Flask processes
pkill -f "document_search/api.py"
pkill -f "db_search/api.py"

# Start Document Search Service (Port 5001)
echo "🚀 Starting Document Search Service on port 5001..."
cd document_search
python3 api.py > ../logs/document_search.log 2>&1 &
DOC_PID=$!
cd ..

sleep 2

# Start Vendor Database Search Service (Port 5002)
echo "🚀 Starting Vendor DB Search Service on port 5002..."
cd db_search
python3 api.py > ../logs/vendor_search.log 2>&1 &
VENDOR_PID=$!
cd ..

sleep 2

echo ""
echo "✅ Flask services started!"
echo "   📄 Document Search: http://localhost:5001"
echo "   🏢 Vendor Search: http://localhost:5002"
echo ""
echo "📋 Process IDs: Document=$DOC_PID, Vendor=$VENDOR_PID"
echo "📝 Logs: logs/document_search.log, logs/vendor_search.log"
echo ""
echo "To stop: ./stop-flask-services.sh"
echo "================================================"
