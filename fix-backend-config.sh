#!/bin/bash

# Script to check and fix backend server configuration

BACKEND_PATH="/Users/francisalbu/Documents/Bored New Backend"
SERVER_FILE="$BACKEND_PATH/src/server.js"

echo "🔍 Checking backend server configuration..."
echo "================================================"
echo ""

# Check if server.js exists
if [ ! -f "$SERVER_FILE" ]; then
    echo "❌ Server file not found at: $SERVER_FILE"
    exit 1
fi

echo "✅ Server file found"
echo ""

# Check for CORS configuration
echo "📋 Current CORS configuration:"
grep -A 3 "cors" "$SERVER_FILE" || echo "⚠️  CORS configuration not found"
echo ""

# Check for app.listen configuration
echo "📋 Current server listen configuration:"
grep -A 2 "app.listen\|server.listen" "$SERVER_FILE" || echo "⚠️  Listen configuration not found"
echo ""

echo "================================================"
echo ""
echo "✏️  RECOMMENDED CONFIGURATION:"
echo ""
echo "1. CORS should be (allowing all origins for mobile):"
echo "   const cors = require('cors');"
echo "   app.use(cors({ origin: '*' }));"
echo ""
echo "2. Server listen should bind to 0.0.0.0:"
echo "   const PORT = process.env.PORT || 3000;"
echo "   app.listen(PORT, '0.0.0.0', () => {"
echo "     console.log(\`Server running on port \${PORT}\`);"
echo "   });"
echo ""
echo "================================================"
echo ""
echo "Would you like to see the full server.js file? Run:"
echo "cat '$SERVER_FILE'"
