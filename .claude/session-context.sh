#!/bin/bash

# ALB Market Session Context Hook
# Provides automatic project context by reading from CLAUDE.md (single source of truth)

echo "=== ALB MARKET PROJECT CONTEXT ==="
echo ""

# Extract project info from CLAUDE.md
if [[ -f "CLAUDE.md" ]]; then
    # Project overview from CLAUDE.md
    PROJECT_TYPE=$(grep "^**Type:**" CLAUDE.md | sed 's/\*\*Type:\*\* //')
    PROJECT_STATUS=$(grep "^**Status:**" CLAUDE.md | sed 's/\*\*Status:\*\* //')
    
    echo "🎯 PROJECT: ALB Market - $PROJECT_TYPE"
    echo "🚀 STATUS: $PROJECT_STATUS"
    echo ""
    
    # Technical stack
    echo "📦 TECHNICAL STACK:"
    sed -n '/^## Technical Stack/,/^## /p' CLAUDE.md | grep '^- ' | sed 's/^- \*\*/• /' | sed 's/\*\*//'
    echo ""
    
    # Architecture decisions (key rules)
    echo "--- KEY ARCHITECTURE DECISIONS ---"
    sed -n '/^## Architecture Decisions/,/^## /p' CLAUDE.md | grep '^- ' | sed 's/^- /• /'
    echo ""
    
    # Common commands
    echo "--- AVAILABLE COMMANDS ---"
    sed -n '/^## Common Commands/,/^## /p' CLAUDE.md | grep '^pnpm\|^# ' | grep -v '^# Testing\|^# Build' | head -10 | sed 's/^/• /'
    echo ""
    
else
    echo "⚠️  CLAUDE.md not found - basic context only"
    echo "🎯 PROJECT: ALB Market - Albion Online marketplace platform"
    echo ""
fi

echo "--- CURRENT STATUS ---"
echo "📊 Recent commits:"
git log --oneline -3 2>/dev/null | sed 's/^/  /' || echo "  No git history available"

echo ""
echo "🎫 Open GitHub issues:"
gh issue list --limit 3 --json number,title,labels --jq '.[] | "  #\(.number) \(.title) [\(.labels[].name // "no-label")]"' 2>/dev/null || echo "  GitHub CLI not configured or no issues"

echo ""
echo "📁 Project structure:"
ls -la packages/ 2>/dev/null | grep '^d' | awk '{print "  " $9}' | grep -v '^\.$\|^\.\.$' || echo "  Packages directory not found"

echo ""
echo "💾 Database status:"
if docker ps --format "table {{.Names}}\t{{.Status}}" | grep -q neo4j; then
    echo "  ✅ Neo4j container running"
    # Show current item count if available
    echo "  📊 Database items: $(grep 'Current Items:' CLAUDE.md 2>/dev/null | sed 's/.*Current Items:\*\* //' || echo 'Unknown')"
else
    echo "  ❌ Neo4j container not running (use: pnpm db:up)"
fi

echo ""
echo "🔍 WHAT TO DO FIRST:"
echo "1. Read full CLAUDE.md for complete project context"
echo "2. Check /docs/sessions/ for recent development work"
echo "3. Review open GitHub issues for pending tasks"
echo "4. Ask about specific tasks or continue previous work"
echo ""
echo "⚡ COMPREHENSIVE AUTOMATION ACTIVE:"
echo "   • Git workflow: commits → auto-docs → auto-tests"
echo "   • Session tracking: All work automatically logged"  
echo "   • Environment checks: Errors caught before 'ready' claims"
echo "   See 'Automated Workflows' section in CLAUDE.md for details"

# Show specialized agents available
if [[ -d ".claude/agents" ]]; then
    echo "5. Use specialized agents for complex tasks:"
    ls .claude/agents/ 2>/dev/null | sed 's/\.md$//' | sed 's/^/   - /' | head -5
fi

echo ""
echo "=== END PROJECT CONTEXT ==="