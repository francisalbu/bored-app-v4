#!/bin/bash

echo "🚀 Starting Backend Server..."
echo "================================"
echo ""

cd backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "✅ Starting server on http://0.0.0.0:3000"
echo "📱 Network access: http://192.168.1.131:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo "================================"
echo ""

npm start
