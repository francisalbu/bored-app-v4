#!/bin/bash

# Script to make logo images public in Google Cloud Storage

echo "🔓 Making logos public..."

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    echo "❌ gsutil not found. Please install Google Cloud SDK:"
    echo "   brew install --cask google-cloud-sdk"
    exit 1
fi

# Make the gallery folder public
echo "📁 Making images/gallery folder public..."
gsutil -m acl ch -R -u AllUsers:R gs://bored_tourist_media/images/gallery/

# Verify
echo ""
echo "✅ Testing access to logos..."
curl -I "https://storage.googleapis.com/bored_tourist_media/images/gallery/lxtourslogo.png" 2>&1 | grep -E "HTTP"
curl -I "https://storage.googleapis.com/bored_tourist_media/images/gallery/pupyylogo.webp" 2>&1 | grep -E "HTTP"
curl -I "https://storage.googleapis.com/bored_tourist_media/images/gallery/escala25logo.jpeg" 2>&1 | grep -E "HTTP"

echo ""
echo "If you see HTTP/2 200, the logos are now public! 🎉"
echo "If you still see 403, you may need to use the Google Cloud Console."
