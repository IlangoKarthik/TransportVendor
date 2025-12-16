#!/bin/bash

# Stop Flask microservices

echo "Stopping Flask services..."
pkill -f "document_search/api.py"
pkill -f "db_search/api.py"
echo "✅ Flask services stopped"
