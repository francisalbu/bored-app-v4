#!/bin/bash

# 🚀 Safe iOS Build Script
# This ensures dependencies are installed before building

echo "🔍 Checking dependencies..."

# Check if node_modules exists and has critical packages
if [ ! -d "node_modules" ] || [ ! -d "node_modules/@expo/config-plugins" ]; then
    echo "📦 Installing dependencies..."
    npm install --legacy-peer-deps
else
    echo "✅ Dependencies OK"
fi

echo "🏗️  Starting EAS build..."
eas build --platform ios

echo "✅ Build command completed!"
