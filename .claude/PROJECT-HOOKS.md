# ALB Market - Hook System Documentation

## Quick Reference for AI Agents

### Current Hook Configuration
```json
{
  "SessionStart": ".claude/session-context.sh (Project context injection)",  
  "PostToolUse": ".claude/git-commit-triggered-automation.sh (Git workflow automation)",
  "Stop": ".claude/environment-check-hook.sh (Environment validation)"
}
```

### Adding New Hooks
**ALWAYS use the generic spawner:**
```bash
.claude/spawn-claude.sh "your prompt" --agent <type> --session-log "Description"
```

### Available Agents
- `documentation` - Update README, API docs, component docs, changelog
- `security` - Security audits, vulnerability checks, OWASP compliance  
- `testing` - Test generation, coverage improvements, E2E tests
- `backend` - API development, database operations, middleware
- `frontend` - React components, state management, UI/UX

### Status Checking
```bash
/doc-ready              # Check if documentation is complete
```

### Project-Specific Notes
- **ALB Market Context**: Albion Online marketplace, Neo4j database, monorepo structure
- **Documentation Triggers**: Only for source files (`.js`, `.ts`, `.py`, `.json`, `.sql`, etc.)
- **Session Logging**: All automation logged to `docs/sessions/2025-08-10-master-initial-setup.md`
- **Safety**: Subprocesses run with `--settings '{}'` (no hooks) to prevent cascades

### Hook Files Location
- **Spawner**: `.claude/spawn-claude.sh` (generic, don't modify)
- **Standards**: `.claude/subprocess-standards.md` (how to create hooks)
- **Examples**: `.claude/examples/hook-examples.sh` (usage patterns)
- **This Project**: `.claude/PROJECT-HOOKS.md` (this file)

### Integration with ALB Market Workflow

#### Git-Based Automation (Primary)  
1. **Development Session**: User writes code
2. **Claude Commits**: Claude uses `git commit -m "feat: implement feature"`
3. **PostToolUse Hook**: Detects Claude's git commit in Bash tool output
4. **Documentation Agent**: Spawned hookless → reads code → writes docs → commits docs
5. **Testing Agent**: Spawned hookless → reads code → writes tests → commits tests  
6. **Clean Git History**: code → docs → tests (all with descriptive commit messages)

#### Claude Hook Automation (Supporting)
1. **Stop Hook**: Environment check fixes issues before "ready" claims
2. **Session Logging**: Tracks all automation in session file  
3. **Status Check**: `/doc-ready` before PR

#### Automation Status
- **Git workflow automation**: ✅ ACTIVE (PostToolUse hook detects commits)
- **Session documentation**: ✅ ACTIVE (automatic logging with task tracking)  
- **Environment validation**: ✅ ACTIVE (checks before declaring "ready")

**No manual setup needed** - automation is built into the hook system and runs automatically!