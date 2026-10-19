#!/bin/bash

# CarePortal Setup Script
# This script automates the initial setup of the CarePortal application

set -e  # Exit on error

echo "🏥 CarePortal Setup Script"
echo "=========================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher${NC}"
    echo "Current version: $(node -v)"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node -v) detected${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ npm $(npm -v) detected${NC}"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠ .env.local not found${NC}"
    echo "Creating from .env.example..."
    cp .env.example .env.local
    echo -e "${GREEN}✓ Created .env.local${NC}"
    echo ""
    echo -e "${YELLOW}⚠ IMPORTANT: Edit .env.local with your actual credentials:${NC}"
    echo "  - NEXT_PUBLIC_SUPABASE_URL"
    echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo "  - GEMINI_API_KEY"
    echo ""
    read -p "Press Enter once you've configured .env.local..."
fi

echo "📦 Installing dependencies..."
echo ""

# Install root dependencies
echo "Installing root dependencies..."
npm install --silent

# Install patient kiosk dependencies
echo "Installing patient kiosk dependencies..."
cd apps/patient-kiosk
npm install --silent
cd ../..

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Check if shadcn/ui is initialized
if [ ! -f "apps/patient-kiosk/components.json" ]; then
    echo "🎨 Initializing shadcn/ui..."
    cd apps/patient-kiosk
    
    # Create components.json for shadcn/ui
    cat > components.json <<EOF
{
  "\$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
EOF
    
    cd ../..
    echo -e "${GREEN}✓ shadcn/ui configured${NC}"
fi

echo ""
echo "🎨 Installing UI components..."
echo "This may take a few minutes..."
echo ""

# Install shadcn/ui components
cd apps/patient-kiosk

COMPONENTS=(
    "button"
    "card"
    "dialog"
    "input"
    "label"
    "select"
    "progress"
    "slider"
    "radio-group"
    "toast"
    "alert"
    "badge"
    "dropdown-menu"
    "tabs"
    "skeleton"
    "avatar"
)

for component in "${COMPONENTS[@]}"; do
    echo "  Installing $component..."
    npx shadcn-ui@latest add "$component" -y --silent 2>/dev/null || true
done

cd ../..

echo -e "${GREEN}✓ UI components installed${NC}"
echo ""

# Create missing directories
echo "📁 Creating directory structure..."

mkdir -p apps/patient-kiosk/components/ui
mkdir -p apps/patient-kiosk/components/patient
mkdir -p apps/patient-kiosk/components/3d
mkdir -p apps/patient-kiosk/components/forms
mkdir -p apps/patient-kiosk/hooks
mkdir -p apps/patient-kiosk/services
mkdir -p apps/patient-kiosk/store
mkdir -p apps/patient-kiosk/i18n
mkdir -p apps/patient-kiosk/app/api
mkdir -p apps/patient-kiosk/app/(patient)
mkdir -p apps/patient-kiosk/public/uploads

echo -e "${GREEN}✓ Directory structure created${NC}"
echo ""

# Check Supabase configuration
echo "🔍 Checking Supabase configuration..."

if grep -q "your_supabase" .env.local 2>/dev/null; then
    echo -e "${YELLOW}⚠ Supabase credentials not configured in .env.local${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Create a Supabase project at https://supabase.com"
    echo "2. Update .env.local with your Supabase credentials"
    echo "3. Run the database schema from database/schema.sql"
    echo "4. Run the seed data from database/seed/seed.sql"
    echo ""
else
    echo -e "${GREEN}✓ Supabase configuration found${NC}"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "📚 Next steps:"
echo ""
echo "1. Configure Supabase:"
echo "   - Run database/schema.sql in Supabase SQL Editor"
echo "   - Run database/seed/seed.sql for demo data"
echo ""
echo "2. Get Google Gemini API key:"
echo "   - Visit https://makersuite.google.com/app/apikey"
echo "   - Add to .env.local as GEMINI_API_KEY"
echo ""
echo "3. Start development server:"
echo "   npm run dev:patient"
echo ""
echo "4. Visit http://localhost:3000"
echo ""
echo "📖 For detailed instructions, see:"
echo "   - QUICK_START.md"
echo "   - IMPLEMENTATION_GUIDE.md"
echo ""
echo "🎉 Happy coding!"
