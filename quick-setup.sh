#!/bin/bash
# Quick Setup Script for Netkathir AI Tool

echo "🚀 Netkathir AI Tool - Quick Setup"
echo "===================================="

# Check prerequisites
echo ""
echo "Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Install from nodejs.org"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ Python3 not found"; exit 1; }
command -v mongod >/dev/null 2>&1 || { echo "⚠️  MongoDB not found. Run: brew install mongodb-community@7.0"; }

echo "✓ Node.js: $(node --version)"
echo "✓ Python: $(python3 --version)"

# Start MongoDB if not running
echo ""
echo "Starting MongoDB..."
brew services start mongodb-community@7.0 2>/dev/null || echo "MongoDB may already be running"

# Check if .env exists
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  .env file not found!"
    echo "Copying .env.example to .env..."
    cp .env.example .env
    echo "⚠️  IMPORTANT: Edit .env file with your API keys before starting!"
    echo "   Required: OPENAI_API_KEY, SMTP_USER, SMTP_PASS, JWT_SECRET"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo ""
    echo "Installing dependencies..."
    npm install
    cd server && npm install && cd ..
    cd client && npm install && cd ..
    pip3 install -r document_search/requirements.txt
    pip3 install -r db_search/requirements.txt
fi

# Create data folders
echo ""
echo "Creating data folders..."
mkdir -p data/users data/embeddings logs

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "  npm start"
echo ""
echo "Then open: http://localhost:3000"
echo ""
