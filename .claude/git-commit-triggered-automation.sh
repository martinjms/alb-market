#!/bin/bash

# Claude PostToolUse Hook - Triggers when Claude runs git commit commands
# This is the CORRECT implementation of the git-based automation idea

PROJECT_DIR="/home/martijnms/code/alb-market"
cd "$PROJECT_DIR"

# Check if the Bash tool was used to run a git commit
if [ -z "$CLAUDE_TOOL_OUTPUT" ]; then
    exit 0
fi

# Check if git commit was executed in the tool output
if ! echo "$CLAUDE_TOOL_OUTPUT" | grep -q "git commit"; then
    exit 0
fi

# Extract the commit message to understand what was committed
LAST_COMMIT_MSG=$(git log -1 --pretty=format:'%s' 2>/dev/null)

# Don't trigger on our own documentation or test commits (prevent loops)
if echo "$LAST_COMMIT_MSG" | grep -qE "^(docs:|test:|chore:.*docs|chore:.*test)"; then
    echo "🔄 Skipping automation for docs/test commit: $LAST_COMMIT_MSG"
    exit 0
fi

# Get the files that were changed in the last commit
CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null)

# Filter for source files (not docs or tests)
SOURCE_FILES=$(echo "$CHANGED_FILES" | grep -E '\.(js|ts|tsx|jsx|py|go|rs|java|json|yaml|sql)$' | grep -v '\.test\.' | grep -v '\.spec\.' | grep -v 'README\|docs/' || echo "")

if [ -z "$SOURCE_FILES" ]; then
    echo "📝 No source files in commit - skipping automation"
    exit 0
fi

echo "🤖 Git commit detected: $LAST_COMMIT_MSG"
echo "📁 Source files changed: $(echo "$SOURCE_FILES" | wc -l) files"

# 1. Generate documentation and commit it
echo "📚 Generating documentation commit..."
DOC_PROMPT="I detected you committed code changes: '$LAST_COMMIT_MSG'

Files changed:
$SOURCE_FILES

Your task:
1. Review the code changes and generate appropriate documentation updates
2. Use Edit/Write tools to update relevant documentation files (README.md, API docs, component docs)
3. After creating/updating documentation files, create a git commit with ONLY the documentation files
4. Use git add to stage ONLY the documentation files you modified
5. Use git commit with a descriptive message like 'docs: update API docs for user authentication'

IMPORTANT: 
- Only commit documentation files you actually modified
- Use specific commit messages describing what docs were updated  
- Don't commit any code files, only documentation
- Since you run without hooks, your commit is safe from infinite loops"

.claude/spawn-claude.sh "$DOC_PROMPT" \
    --agent documentation \
    --session-log "Post-commit: documentation generation" \
    --background

# 2. Generate tests and commit them  
echo "🧪 Generating test commit..."
TEST_PROMPT="I detected you committed code changes: '$LAST_COMMIT_MSG'

Files changed:
$SOURCE_FILES

Your task:
1. Analyze the code changes and generate comprehensive tests
2. Use Write tool to create test files (.test.js, .spec.js, etc.)
3. Create unit tests, integration tests, and component tests as appropriate
4. Use git add to stage ONLY the test files you created
5. Use git commit with a descriptive message like 'test: add comprehensive auth tests with GitHub Actions support'

IMPORTANT:
- Only commit test files you actually created/modified
- Use specific commit messages describing what tests were added
- Don't commit any code or documentation files, only tests
- Include GitHub Actions compatible test patterns
- Generate realistic Albion Online test data if needed
- Since you run without hooks, your commit is safe from infinite loops"

.claude/spawn-claude.sh "$TEST_PROMPT" \
    --agent testing \
    --session-log "Post-commit: test generation" \
    --background

echo "✅ Git commit automation initiated"
echo "📋 Subprocess agents will create follow-up commits"