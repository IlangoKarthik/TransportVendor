#!/bin/bash

# Stop script for Netkathir AI Tool
# Stops all three services

echo "Stopping Netkathir AI Tool services..."

# Kill processes by PID if files exist
if [ -f logs/doc_search.pid ]; then
    kill $(cat logs/doc_search.pid) 2>/dev/null
    rm logs/doc_search.pid
fi

if [ -f logs/vendor_search.pid ]; then
    kill $(cat logs/vendor_search.pid) 2>/dev/null
    rm logs/vendor_search.pid
fi

if [ -f logs/node.pid ]; then
    kill $(cat logs/node.pid) 2>/dev/null
    rm logs/node.pid
fi

# Also kill by port just in case
lsof -ti:5003 | xargs kill -9 2>/dev/null
lsof -ti:5001 | xargs kill -9 2>/dev/null
lsof -ti:5002 | xargs kill -9 2>/dev/null

echo "✓ All services stopped"
