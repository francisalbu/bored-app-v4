#!/bin/bash

echo "🧪 Testing Video Analysis on Render"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get auth token
echo "📝 First, we need to login to get a token..."
echo "Email: "
read EMAIL
echo "Password: "
read -s PASSWORD

echo ""
echo "🔐 Getting auth token..."

TOKEN_RESPONSE=$(curl -s -X POST https://bored-tourist-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "$TOKEN_RESPONSE"
  exit 1
fi

echo "✅ Token obtained!"
echo ""
echo "🎬 Testing video analysis with Instagram Reel..."
echo "URL: https://www.instagram.com/surfersofbali/reel/DTSZkC6jGIV/"
echo ""
echo "⏳ This may take 15-30 seconds (analyzing video with AI)..."
echo ""

curl -X POST https://bored-tourist-api.onrender.com/api/suggestions/analyze-video \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "instagram_url": "https://www.instagram.com/surfersofbali/reel/DTSZkC6jGIV/",
    "description": "Surfing in Bali"
  }' | jq '.'

echo ""
echo "✅ Test complete!"
