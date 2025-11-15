#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🧪 Testing Bored Travel API${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Test 1: Health Check
echo -e "${YELLOW}1. Testing Health Check${NC}"
response=$(curl -s -w "\n%{http_code}" ${API_URL}/health)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "$body" | python3 -m json.tool 2>/dev/null | head -5
else
    echo -e "${RED}✗ Health check failed (HTTP $http_code)${NC}"
fi
echo ""

# Test 2: Get Experiences
echo -e "${YELLOW}2. Testing GET /api/experiences${NC}"
response=$(curl -s -w "\n%{http_code}" ${API_URL}/api/experiences)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ Get experiences passed${NC}"
    count=$(echo "$body" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('data', [])))" 2>/dev/null)
    echo "  Found $count experiences"
else
    echo -e "${RED}✗ Get experiences failed (HTTP $http_code)${NC}"
    echo "$body"
fi
echo ""

# Test 3: Get Trending Experiences
echo -e "${YELLOW}3. Testing GET /api/experiences/trending${NC}"
response=$(curl -s -w "\n%{http_code}" ${API_URL}/api/experiences/trending)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ Get trending passed${NC}"
    count=$(echo "$body" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('data', [])))" 2>/dev/null)
    echo "  Found $count trending experiences"
else
    echo -e "${RED}✗ Get trending failed (HTTP $http_code)${NC}"
fi
echo ""

# Test 4: Get Single Experience
echo -e "${YELLOW}4. Testing GET /api/experiences/1${NC}"
response=$(curl -s -w "\n%{http_code}" ${API_URL}/api/experiences/1)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ Get single experience passed${NC}"
    title=$(echo "$body" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('title', 'N/A'))" 2>/dev/null)
    echo "  Title: $title"
else
    echo -e "${RED}✗ Get single experience failed (HTTP $http_code)${NC}"
fi
echo ""

# Test 5: Register User
echo -e "${YELLOW}5. Testing POST /api/auth/register${NC}"
EMAIL="test$(date +%s)@example.com"
response=$(curl -s -w "\n%{http_code}" -X POST ${API_URL}/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"testpass123\",\"name\":\"Test User\"}")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 201 ]; then
    echo -e "${GREEN}✓ User registration passed${NC}"
    TOKEN=$(echo "$body" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('token', ''))" 2>/dev/null)
    echo "  Email: $EMAIL"
    echo "  Token received: ${TOKEN:0:50}..."
else
    echo -e "${RED}✗ User registration failed (HTTP $http_code)${NC}"
    echo "$body"
fi
echo ""

# Test 6: Login
echo -e "${YELLOW}6. Testing POST /api/auth/login${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST ${API_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"testpass123\"}")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ Login passed${NC}"
    TOKEN=$(echo "$body" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('token', ''))" 2>/dev/null)
    echo "  Token received: ${TOKEN:0:50}..."
else
    echo -e "${RED}✗ Login failed (HTTP $http_code)${NC}"
    echo "$body"
fi
echo ""

# Test 7: Get Profile (with auth)
echo -e "${YELLOW}7. Testing GET /api/profile (authenticated)${NC}"
response=$(curl -s -w "\n%{http_code}" ${API_URL}/api/profile \
  -H "Authorization: Bearer ${TOKEN}")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ Get profile passed${NC}"
    name=$(echo "$body" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('user', {}).get('name', 'N/A'))" 2>/dev/null)
    echo "  Name: $name"
else
    echo -e "${RED}✗ Get profile failed (HTTP $http_code)${NC}"
fi
echo ""

# Test 8: Create Booking (with auth)
echo -e "${YELLOW}8. Testing POST /api/bookings (authenticated)${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST ${API_URL}/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"experience_id\":1,\"booking_date\":\"2025-12-01\",\"participants\":2,\"total_amount\":150.00,\"notes\":\"Test booking\"}")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 201 ]; then
    echo -e "${GREEN}✓ Create booking passed${NC}"
    booking_id=$(echo "$body" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('id', 'N/A'))" 2>/dev/null)
    echo "  Booking ID: $booking_id"
    BOOKING_ID=$booking_id
else
    echo -e "${RED}✗ Create booking failed (HTTP $http_code)${NC}"
    echo "$body"
fi
echo ""

# Test 9: Get User Bookings
echo -e "${YELLOW}9. Testing GET /api/bookings (authenticated)${NC}"
response=$(curl -s -w "\n%{http_code}" ${API_URL}/api/bookings \
  -H "Authorization: Bearer ${TOKEN}")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✓ Get bookings passed${NC}"
    count=$(echo "$body" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('data', [])))" 2>/dev/null)
    echo "  Found $count bookings"
else
    echo -e "${RED}✗ Get bookings failed (HTTP $http_code)${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}✅ API Testing Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "\nServer is running at: ${GREEN}${API_URL}${NC}"
echo -e "Network access: ${GREEN}http://192.168.1.131:3000${NC}"
