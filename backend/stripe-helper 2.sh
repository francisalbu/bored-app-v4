#!/bin/bash

# Stripe Mode Switcher
# Quickly switch between test and live Stripe keys

set -e

BACKEND_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$BACKEND_DIR/.env"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}       Stripe Mode Switcher${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo ""

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "   Create one from .env.example first"
    exit 1
fi

# Detect current mode
if grep -q "^STRIPE_SECRET_KEY=sk_test_" "$ENV_FILE"; then
    CURRENT_MODE="TEST"
    CURRENT_COLOR=$GREEN
elif grep -q "^STRIPE_SECRET_KEY=sk_live_" "$ENV_FILE"; then
    CURRENT_MODE="LIVE"
    CURRENT_COLOR=$YELLOW
else
    CURRENT_MODE="UNKNOWN"
    CURRENT_COLOR=$RED
fi

echo -e "Current mode: ${CURRENT_COLOR}${CURRENT_MODE}${NC}"
echo ""

# Menu
echo "What would you like to do?"
echo ""
echo "  1) Check current Stripe keys"
echo "  2) Show test card numbers"
echo "  3) Open Stripe Dashboard (Test Mode)"
echo "  4) Open Stripe Dashboard (Live Mode)"
echo "  5) Open Stripe Testing Docs"
echo "  0) Exit"
echo ""
read -p "Enter your choice: " choice

case $choice in
    1)
        echo ""
        echo -e "${BLUE}Current Stripe Configuration:${NC}"
        echo ""
        
        # Show secret key (partial)
        SECRET_KEY=$(grep "^STRIPE_SECRET_KEY=" "$ENV_FILE" | cut -d'=' -f2)
        if [ ! -z "$SECRET_KEY" ]; then
            if [[ $SECRET_KEY == sk_test_* ]]; then
                echo -e "  Secret Key: ${GREEN}${SECRET_KEY:0:20}...${NC} (TEST)"
            elif [[ $SECRET_KEY == sk_live_* ]]; then
                echo -e "  Secret Key: ${YELLOW}${SECRET_KEY:0:20}...${NC} (LIVE)"
            else
                echo -e "  Secret Key: ${RED}${SECRET_KEY:0:20}...${NC} (UNKNOWN)"
            fi
        else
            echo -e "  Secret Key: ${RED}Not set${NC}"
        fi
        
        # Show publishable key (partial)
        PUB_KEY=$(grep "^STRIPE_PUBLISHABLE_KEY=" "$ENV_FILE" | cut -d'=' -f2)
        if [ ! -z "$PUB_KEY" ]; then
            if [[ $PUB_KEY == pk_test_* ]]; then
                echo -e "  Publishable Key: ${GREEN}${PUB_KEY:0:20}...${NC} (TEST)"
            elif [[ $PUB_KEY == pk_live_* ]]; then
                echo -e "  Publishable Key: ${YELLOW}${PUB_KEY:0:20}...${NC} (LIVE)"
            else
                echo -e "  Publishable Key: ${RED}${PUB_KEY:0:20}...${NC} (UNKNOWN)"
            fi
        else
            echo -e "  Publishable Key: ${RED}Not set${NC}"
        fi
        
        echo ""
        
        if [[ $SECRET_KEY == sk_test_* ]] && [[ $PUB_KEY == pk_test_* ]]; then
            echo -e "${GREEN}✅ Both keys are in TEST mode${NC}"
        elif [[ $SECRET_KEY == sk_live_* ]] && [[ $PUB_KEY == pk_live_* ]]; then
            echo -e "${YELLOW}⚠️  Both keys are in LIVE mode${NC}"
        else
            echo -e "${RED}❌ Keys are mismatched or invalid!${NC}"
        fi
        ;;
        
    2)
        echo ""
        echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
        echo -e "${BLUE}           Stripe Test Cards${NC}"
        echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${GREEN}✅ SUCCESSFUL PAYMENTS:${NC}"
        echo ""
        echo "  Card Number:    4242 4242 4242 4242 (Visa)"
        echo "  Card Number:    5555 5555 5555 4444 (Mastercard)"
        echo "  Card Number:    3782 822463 10005 (Amex)"
        echo ""
        echo "  Expiry Date:    Any future date (e.g., 12/34)"
        echo "  CVC:            Any 3 digits (e.g., 123)"
        echo "  ZIP/Postal:     Any valid format (e.g., 12345)"
        echo ""
        echo -e "${RED}❌ DECLINED PAYMENTS:${NC}"
        echo ""
        echo "  4000 0000 0000 9995  - Generic decline"
        echo "  4000 0000 0000 9987  - Lost card"
        echo "  4000 0000 0000 9979  - Stolen card"
        echo "  4000 0000 0000 0069  - Expired card"
        echo ""
        echo -e "${YELLOW}🔐 3D SECURE AUTHENTICATION:${NC}"
        echo ""
        echo "  4000 0025 0000 3155  - Requires authentication"
        echo "  4000 0027 6000 3184  - Auth required"
        echo ""
        echo "More test cards: https://docs.stripe.com/testing"
        ;;
        
    3)
        echo ""
        echo -e "${GREEN}Opening Stripe Dashboard (Test Mode)...${NC}"
        open "https://dashboard.stripe.com/test/dashboard"
        ;;
        
    4)
        echo ""
        echo -e "${YELLOW}Opening Stripe Dashboard (Live Mode)...${NC}"
        echo -e "${YELLOW}⚠️  WARNING: This is the LIVE dashboard!${NC}"
        open "https://dashboard.stripe.com/dashboard"
        ;;
        
    5)
        echo ""
        echo -e "${BLUE}Opening Stripe Testing Documentation...${NC}"
        open "https://docs.stripe.com/testing"
        ;;
        
    0)
        echo ""
        echo "Goodbye!"
        exit 0
        ;;
        
    *)
        echo ""
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
