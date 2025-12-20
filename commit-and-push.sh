#!/bin/bash
set -e

echo "🔧 Starting git commit and push..."

# Go to the project directory
cd /Users/francisalbu/Documents/Bored_App_v6/bored-app-v4

echo "📂 Current directory: $(pwd)"

# Check git status
echo "📊 Git status:"
git status

# Add the file
echo "➕ Adding backend/routes/preferences.js..."
git add backend/routes/preferences.js

# Commit
echo "💾 Committing..."
git commit -m "Test: Remove auth temporarily from preferences endpoint"

# Push
echo "🚀 Pushing to origin main..."
git push origin main

echo "✅ DONE! Check Render for deploy."
