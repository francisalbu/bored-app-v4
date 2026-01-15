#!/bin/bash

# 🎬 AI Video Analysis - Quick Setup & Test Script
# Run this script to verify everything is installed correctly

echo "🔍 Checking system dependencies..."
echo ""

# Check FFmpeg
echo "1️⃣ Checking FFmpeg..."
if command -v ffmpeg &> /dev/null; then
    echo "   ✅ FFmpeg is installed: $(ffmpeg -version | head -n 1)"
else
    echo "   ❌ FFmpeg NOT found!"
    echo "   Install with: brew install ffmpeg"
    exit 1
fi

echo ""

# Check yt-dlp
echo "2️⃣ Checking yt-dlp..."
if command -v yt-dlp &> /dev/null; then
    echo "   ✅ yt-dlp is installed: $(yt-dlp --version)"
else
    echo "   ⚠️  yt-dlp NOT found (recommended but optional)"
    echo "   Install with: brew install yt-dlp"
fi

echo ""

# Check Node.js
echo "3️⃣ Checking Node.js..."
if command -v node &> /dev/null; then
    echo "   ✅ Node.js is installed: $(node --version)"
else
    echo "   ❌ Node.js NOT found!"
    exit 1
fi

echo ""

# Check if backend folder exists
if [ ! -d "backend" ]; then
    echo "❌ Backend folder not found! Run this script from project root."
    exit 1
fi

cd backend

# Check if node_modules exists
echo "4️⃣ Checking Node modules..."
if [ ! -d "node_modules" ]; then
    echo "   📦 Installing dependencies..."
    npm install
else
    echo "   ✅ Node modules installed"
fi

echo ""

# Check if required dependencies are installed
echo "5️⃣ Checking required packages..."
REQUIRED_PACKAGES=("fluent-ffmpeg" "axios" "@google/generative-ai")
MISSING_PACKAGES=()

for package in "${REQUIRED_PACKAGES[@]}"; do
    if grep -q "\"$package\"" package.json; then
        echo "   ✅ $package"
    else
        echo "   ❌ $package NOT found"
        MISSING_PACKAGES+=("$package")
    fi
done

if [ ${#MISSING_PACKAGES[@]} -ne 0 ]; then
    echo ""
    echo "   📦 Installing missing packages: ${MISSING_PACKAGES[*]}"
    npm install "${MISSING_PACKAGES[@]}"
fi

echo ""

# Check .env file
echo "6️⃣ Checking environment configuration..."
if [ -f ".env" ]; then
    echo "   ✅ .env file exists"
    
    # Check for GEMINI_API_KEY
    if grep -q "GEMINI_API_KEY=" .env && ! grep -q "GEMINI_API_KEY=your_" .env; then
        echo "   ✅ GEMINI_API_KEY is configured"
    else
        echo "   ⚠️  GEMINI_API_KEY not configured"
        echo "      Get your key from: https://makersuite.google.com/app/apikey"
    fi
    
    # Check for GetYourGuide (optional)
    if grep -q "GETYOURGUIDE_API_KEY=" .env && ! grep -q "GETYOURGUIDE_API_KEY=your_" .env; then
        echo "   ✅ GETYOURGUIDE_API_KEY is configured"
    else
        echo "   ℹ️  GETYOURGUIDE_API_KEY not configured (will use mock data)"
    fi
else
    echo "   ⚠️  .env file NOT found"
    echo "   Copy .env.example to .env and configure your keys"
    cp .env.example .env
    echo "   ✅ Created .env from .env.example"
fi

echo ""

# Check if services exist
echo "7️⃣ Checking service files..."
if [ -f "services/videoAnalyzer.js" ]; then
    echo "   ✅ videoAnalyzer.js"
else
    echo "   ❌ videoAnalyzer.js NOT found"
fi

if [ -f "services/getYourGuideService.js" ]; then
    echo "   ✅ getYourGuideService.js"
else
    echo "   ❌ getYourGuideService.js NOT found"
fi

echo ""

# Create temp directory
echo "8️⃣ Creating temp directory..."
if [ ! -d "temp" ]; then
    mkdir temp
    echo "   ✅ Created temp/ directory"
else
    echo "   ✅ temp/ directory exists"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Configure your GEMINI_API_KEY in .env"
echo "   2. Run the migration SQL in Supabase"
echo "   3. Start the server: npm run dev"
echo "   4. Test the endpoint with a real Instagram/TikTok URL"
echo ""
echo "📚 Full documentation: backend/AI_VIDEO_ANALYSIS_SETUP.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
