#!/bin/bash

# ALB Market - Agent/Developer Onboarding Script
# This script MUST be run by every new agent or developer

set -e

echo "======================================"
echo "   ALB MARKET ONBOARDING PROCESS     "
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Display rules
echo -e "${YELLOW}STEP 1: Reading Project Rules${NC}"
echo "Opening claude.md - READ IT COMPLETELY"
echo ""
cat claude.md | less

echo ""
read -p "Have you read and understood ALL the rules? (yes/no): " understood
if [ "$understood" != "yes" ]; then
    echo -e "${RED}❌ You must read and understand the rules before proceeding${NC}"
    exit 1
fi

# Step 2: Check environment
echo ""
echo -e "${YELLOW}STEP 2: Checking Environment${NC}"

# Check Node version
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version must be 18 or higher${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js version OK${NC}"

# Check PNPM
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ PNPM is not installed${NC}"
    echo "Install with: npm install -g pnpm"
    exit 1
fi
echo -e "${GREEN}✓ PNPM installed${NC}"

# Check Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Git installed${NC}"

# Step 3: Check project structure
echo ""
echo -e "${YELLOW}STEP 3: Verifying Project Structure${NC}"

# Check critical directories
dirs=("/tmp" "/docs" "/scripts" "/packages")
for dir in "${dirs[@]}"; do
    if [ ! -d ".$dir" ]; then
        echo -e "${YELLOW}Creating $dir${NC}"
        mkdir -p ".$dir"
    fi
    echo -e "${GREEN}✓ $dir exists${NC}"
done

# Check critical files
if [ ! -f ".credentials" ]; then
    echo -e "${YELLOW}Creating .credentials file${NC}"
    touch .credentials
    echo "# Add your credentials here (KEY=VALUE format)" > .credentials
    echo "# This file is gitignored and should NEVER be committed" >> .credentials
fi
echo -e "${GREEN}✓ .credentials file exists${NC}"

if [ ! -f "CLAUDE.md" ]; then
    echo -e "${RED}❌ CLAUDE.md is missing${NC}"
    exit 1
fi
echo -e "${GREEN}✓ CLAUDE.md exists${NC}"

# Step 4: Read CLAUDE.md
echo ""
echo -e "${YELLOW}STEP 4: Reading Project Context${NC}"
echo "Reading CLAUDE.md for current project state..."
echo ""
head -n 50 CLAUDE.md
echo ""
echo "... (truncated)"
echo ""
read -p "Have you read the project context? (yes/no): " read_context
if [ "$read_context" != "yes" ]; then
    echo -e "${RED}❌ You must understand the project context${NC}"
    exit 1
fi

# Step 5: Create session file
echo ""
echo -e "${YELLOW}STEP 5: Creating Session File${NC}"

# Create sessions directory if not exists
mkdir -p docs/sessions

# Get current branch
BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
DATE=$(date +%Y-%m-%d)
SESSION_FILE="docs/sessions/${DATE}-${BRANCH}.md"

if [ ! -f "$SESSION_FILE" ]; then
    cat > "$SESSION_FILE" << EOF
# Session: ${DATE} - ${BRANCH}

## Context
**PR/Issue:** #
**Started:** $(date +"%Y-%m-%d %H:%M")
**Last Updated:** $(date +"%Y-%m-%d %H:%M")

## Goals
- [ ] Complete onboarding process
- [ ] Understand project structure
- [ ] Set up development environment

## Current State
- Onboarding script executed
- Environment verified
- Ready to start development

## Blockers/Issues
- None

## Decisions Made
- Read and accepted project rules
- Understood monorepo structure

## Next Steps
1. Review existing code
2. Check GitHub issues
3. Start assigned task

## Files Modified
- None (onboarding only)

## Test Commands
\`\`\`bash
pnpm test:all
\`\`\`

## Notes for Next Session
- Review claude.md regularly
- Update this session file before commits
EOF
    echo -e "${GREEN}✓ Created session file: $SESSION_FILE${NC}"
else
    echo -e "${GREEN}✓ Session file already exists: $SESSION_FILE${NC}"
fi

# Step 6: Display available commands
echo ""
echo -e "${YELLOW}STEP 6: Available Commands${NC}"
cat << EOF

Development Commands:
  pnpm dev                 - Start all services
  pnpm dev:backend        - Start backend only
  pnpm dev:frontend       - Start frontend only

Testing Commands:
  pnpm test:all           - Run all tests
  pnpm turbo run test --filter=[origin/develop] - Test changed packages

Database Commands:
  pnpm db:migrate         - Run database migrations
  pnpm db:seed           - Seed test data

Git Workflow:
  1. git checkout develop
  2. git pull origin develop
  3. git checkout -b feature/[package]/[ticket]-[description]
  4. Make changes
  5. git commit -m "type(scope): message"
  6. git push origin [branch]
  7. Create PR with template

Important Files:
  claude.md              - Project rules (READ DAILY)
  CLAUDE.md             - Project memory
  .credentials          - Your secrets (NEVER COMMIT)
  /tmp/                 - Temporary scripts
  /docs/sessions/       - Session journals

EOF

# Step 7: Final checklist
echo ""
echo -e "${YELLOW}STEP 7: Onboarding Checklist${NC}"
echo ""
echo "✅ Project rules read and understood"
echo "✅ Environment verified"
echo "✅ Project structure checked"
echo "✅ CLAUDE.md context reviewed"
echo "✅ Session file created"
echo "✅ Commands reference displayed"
echo ""
echo -e "${GREEN}🎉 ONBOARDING COMPLETE!${NC}"
echo ""
echo -e "${YELLOW}REMEMBER:${NC}"
echo "1. Update your session file regularly"
echo "2. Never edit .credentials"
echo "3. Use /tmp for temporary scripts"
echo "4. Follow ALL rules in claude.md"
echo "5. Run tests before EVERY commit"
echo ""
echo -e "${GREEN}Welcome to ALB Market! Now get to work and follow the rules.${NC}"