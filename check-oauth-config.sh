#!/bin/bash

# Google OAuth Configuration Test Script
# This script checks if everything is configured correctly

echo "🔍 Checking Google OAuth Configuration..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: app.json scheme
echo "1️⃣ Checking app.json scheme..."
SCHEME=$(grep -A 1 '"scheme"' app.json | grep -o '"[^"]*"' | tail -1 | tr -d '"')
if [ ! -z "$SCHEME" ]; then
    echo -e "${GREEN}✅ Scheme found: $SCHEME${NC}"
else
    echo -e "${RED}❌ No scheme found in app.json${NC}"
fi
echo ""

# Check 2: Bundle identifier
echo "2️⃣ Checking iOS bundle identifier..."
BUNDLE_ID=$(grep -A 1 '"bundleIdentifier"' app.json | grep -o '"[^"]*"' | tail -1 | tr -d '"')
if [ ! -z "$BUNDLE_ID" ]; then
    echo -e "${GREEN}✅ Bundle ID: $BUNDLE_ID${NC}"
else
    echo -e "${RED}❌ No bundle identifier found${NC}"
fi
echo ""

# Check 3: expo-web-browser
echo "3️⃣ Checking if expo-web-browser is installed..."
if grep -q '"expo-web-browser"' package.json; then
    echo -e "${GREEN}✅ expo-web-browser is installed${NC}"
else
    echo -e "${RED}❌ expo-web-browser NOT installed${NC}"
    echo -e "${YELLOW}   Run: npx expo install expo-web-browser${NC}"
fi
echo ""

# Check 4: Supabase configuration
echo "4️⃣ Checking Supabase configuration..."
if grep -q "hnivuisqktlrusyqywaz.supabase.co" lib/supabase.ts; then
    echo -e "${GREEN}✅ Supabase URL configured${NC}"
else
    echo -e "${RED}❌ Supabase URL not found${NC}"
fi
echo ""

# Check 5: Deep link handling
echo "5️⃣ Checking auth callback handler..."
if [ -f "app/auth/callback.tsx" ]; then
    echo -e "${GREEN}✅ Callback handler exists${NC}"
else
    echo -e "${RED}❌ Callback handler missing${NC}"
fi
echo ""

# Check 6: AuthBottomSheet
echo "6️⃣ Checking Google sign-in implementation..."
if grep -q "signInWithOAuth" components/AuthBottomSheet.tsx; then
    echo -e "${GREEN}✅ Google OAuth code found${NC}"
else
    echo -e "${RED}❌ Google OAuth code not found${NC}"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Configure Google OAuth in Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/hnivuisqktlrusyqywaz/auth/providers"
echo ""
echo "2. Add this redirect URI in Google Cloud Console:"
echo "   https://hnivuisqktlrusyqywaz.supabase.co/auth/v1/callback"
echo ""
echo "3. Rebuild the app:"
echo "   rm -rf ios/ && npx expo prebuild --clean --platform ios"
echo ""
echo "4. Test the flow:"
echo "   npx expo start"
echo ""
echo "📖 See GOOGLE_LOGIN_FIX.md for detailed instructions"
echo ""
