#!/bin/bash

echo "🎬 Testing AI Video Analysis on Render"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔗 URL: https://www.instagram.com/surfersofbali/reel/DTSZkC6jGIV/"
echo "⏱️  This will take 10-30 seconds..."
echo ""

# Test without authentication first (using test endpoint if available)
# Or we need a token

echo "Testing endpoint..."
curl -X POST https://bored-tourist-api.onrender.com/api/suggestions/test-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "instagram_url": "https://www.instagram.com/surfersofbali/reel/DTSZkC6jGIV/"
  }' \
  -w "\n\n⏱️  Time: %{time_total}s\n" \
  | jq '.' || echo "Response received (jq not installed for pretty print)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
