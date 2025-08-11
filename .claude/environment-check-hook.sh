#!/bin/bash

# Environment Check Hook - Check logs and fix issues before declaring "ready"
# Stop hook that runs before other Stop hooks to catch issues

PROJECT_DIR="/home/martijnms/code/alb-market"
cd "$PROJECT_DIR"

echo "🔍 Checking local environment and logs before session end..."

# Check if development environment is running
DEV_ISSUES=""

# Check Neo4j logs for errors
if command -v docker >/dev/null 2>&1; then
    NEO4J_ERRORS=$(docker logs alb-market-neo4j 2>&1 | grep -i "error\|exception\|fail" | tail -5)
    if [ -n "$NEO4J_ERRORS" ]; then
        DEV_ISSUES="${DEV_ISSUES}Neo4j Errors:\n$NEO4J_ERRORS\n\n"
    fi
fi

# Check for compilation errors in build output
if [ -f "build.log" ] || [ -f "dist/build.log" ]; then
    BUILD_ERRORS=$(find . -name "build.log" -exec grep -l "error\|Error\|ERROR" {} \; 2>/dev/null)
    if [ -n "$BUILD_ERRORS" ]; then
        DEV_ISSUES="${DEV_ISSUES}Build Errors Found in: $BUILD_ERRORS\n\n"
    fi
fi

# Check for TypeScript errors
if command -v tsc >/dev/null 2>&1; then
    TS_ERRORS=$(tsc --noEmit 2>&1 | grep -i "error" | head -5)
    if [ -n "$TS_ERRORS" ]; then
        DEV_ISSUES="${DEV_ISSUES}TypeScript Errors:\n$TS_ERRORS\n\n"
    fi
fi

# Check for lint errors in recent files
RECENT_FILES=$(git status --porcelain 2>/dev/null | grep -E '^(M| M|A| A)' | cut -c4- | grep -E '\.(js|ts|tsx|jsx)$')
if [ -n "$RECENT_FILES" ] && command -v npm >/dev/null 2>&1; then
    # Try to run lint on changed files
    LINT_OUTPUT=$(echo "$RECENT_FILES" | xargs npx eslint 2>/dev/null | grep -E "error|Error" | head -3)
    if [ -n "$LINT_OUTPUT" ]; then
        DEV_ISSUES="${DEV_ISSUES}Lint Errors:\n$LINT_OUTPUT\n\n"
    fi
fi

# Check for package.json dependency issues
if [ -f "package.json" ]; then
    if ! npm ls >/dev/null 2>&1; then
        DEPENDENCY_ISSUES=$(npm ls 2>&1 | grep -E "missing|invalid|error" | head -3)
        if [ -n "$DEPENDENCY_ISSUES" ]; then
            DEV_ISSUES="${DEV_ISSUES}Dependency Issues:\n$DEPENDENCY_ISSUES\n\n"
        fi
    fi
fi

# If issues found, trigger fix process
if [ -n "$DEV_ISSUES" ]; then
    echo "⚠️ Environment issues detected!"
    
    FIX_PROMPT="Before declaring the session complete, please fix these environment issues:

$DEV_ISSUES

Focus on:
1. Fix compilation errors and TypeScript issues
2. Resolve linting violations in modified files  
3. Address dependency conflicts
4. Check database connection and query issues
5. Ensure the development environment runs cleanly

Only declare work 'ready' or 'working' after these issues are resolved.
Run necessary commands to fix issues (npm install, npm run lint --fix, etc.)"

    # Use backend specialist for environment fixes
    .claude/spawn-claude.sh "$FIX_PROMPT" \
        --agent backend \
        --session-log "Environment issues detected - fixing before completion" \
        --synchronous

    echo "🔧 Environment fix process initiated"
else
    echo "✅ Environment check passed - no issues detected"
fi