# Claude Persistent Memory

## Project Overview
**Project:** ALB Market
**Type:** Graph-based marketplace platform
**Status:** MVP Development Phase (Phase 1)
**Repository:** Monorepo structure with Neo4j, Backend API, Frontend

## Current Sprint
- ✅ Project structure and development rules established
- ✅ Docker-based development environment configured
- ✅ Neo4j database restored with 3,790 items
- ✅ Automated git workflow and hook system established

## Technical Stack
- **Database:** Neo4j (Graph Database) - Docker containerized
- **Backend:** Node.js + Express/Fastify (TBD)
- **Frontend:** React + Vite (TBD)
- **Monorepo:** PNPM workspaces + Turborepo
- **Testing:** Jest/Vitest (TBD)
- **CI/CD:** GitHub Actions
- **Development:** Docker Compose for local environment

## Architecture Decisions
- Monorepo for better code sharing
- Neo4j for complex relationship modeling
- Docker containerization for consistent development environment
- Automated database restoration from backups
- One-command development startup (`pnpm start`)
- Separate /tmp folder for one-time scripts
- Session files for development journaling
- .credentials file for secure credential storage
- **Automated git workflow: commit → auto-docs → auto-tests**

## Project Structure Notes
- `/packages/backend` - API service
- `/packages/frontend` - Web application  
- `/packages/shared` - Shared types and utilities
- `/packages/database` - Migrations and seeds
- `/tmp` - Temporary scripts (gitignored)
- `/docs/sessions` - Development session journals

## Known Issues
- [ ] Need to determine specific framework choices (Express vs Fastify)
- [ ] Frontend framework selection (React state management)
- [ ] Deployment infrastructure not yet defined
- ✅ Database connection configuration completed (Docker + auto-restore)

## Common Commands
```bash
# Development (ONE COMMAND STARTUP!)
pnpm start              # Start everything: Neo4j + Backend + Frontend
pnpm start:dev          # Alias for pnpm start

# Individual services
pnpm dev                # Start backend + frontend (requires Neo4j running)
pnpm dev:backend        # Backend only
pnpm dev:frontend       # Frontend only

# Database management
pnpm db:up              # Start Neo4j in Docker
pnpm db:down            # Stop Neo4j
pnpm db:logs            # View Neo4j logs
pnpm db:migrate         # Run migrations
pnpm db:seed            # Seed data

# Testing
pnpm test:all           # Run all tests
pnpm --filter [package] test

# Build
pnpm build              # Build all packages

# Hook System & Automation (AUTOMATED)
/doc-ready                            # Check if automation is complete
# All git workflow automation is active by default
```

## Environment Variables & Access
```bash
# Neo4j (Automatically configured in Docker)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=albmarket123

# Neo4j Browser: http://localhost:7474
# Credentials: neo4j / albmarket123

# Backend (when ready)
PORT=4000
JWT_SECRET=

# Frontend (when ready)
VITE_API_URL=http://localhost:4000
```

## Database Status
- **Current Items:** 3,790 items loaded
- **Backup Location:** `/packages/database/backups/`
- **Auto-restore:** Database automatically restores from latest backup if empty

## Development Phases
- **Current:** Phase 1 (MVP) - Rapid development with some shortcuts allowed
- **Next:** Phase 2 (Production) - Triggered by first deployment
- **Future:** Phase 3 (Scale) - At 1000+ users

## Session Files (AUTOMATED)
- Location: `/docs/sessions/`
- **Automatically maintained** by hook system
- All subprocess work logged with task IDs and status

## Specialized Agents Available
**Built into `.claude/spawn-claude.sh`** (automatically used by hook system):
- **Documentation** - Updates README, API docs, component docs (AUTOMATED)
- **Testing** - Creates comprehensive tests with GitHub Actions support (AUTOMATED)  
- **Security** - Security audits and compliance reviews
- **Backend** - API development and database operations
- **Frontend** - React components and state management

**Additional template agents** in `.claude/agents/`:
- Product Manager, Project Coordinator, Neo4j Specialist, DevOps Specialist

**Automated Workflow**: Code commit → Documentation agent → Testing agent
**Manual Workflow**: Use Task tool with specific agents for complex tasks

## GitHub Integration
- Token stored in .credentials as GITHUB_PERSONAL_ACCESS_TOKEN
- Run /tmp/setup-github-cli.sh to configure GitHub CLI
- Product Manager agent creates issues automatically

## Automated Workflows
**CRITICAL**: This project has comprehensive automation for development workflows:

### Git Workflow Automation
1. **Claude commits code**: `git commit -m "feat: implement feature"`
2. **PostToolUse hook detects commit** in Bash tool output
3. **Documentation Agent spawns** (hookless) → reads code → updates docs → commits docs
4. **Testing Agent spawns** (hookless) → reads code → creates tests → commits tests
5. **Result**: Clean git history with descriptive commits

### Session Documentation Automation  
1. **Session starts**: SessionStart hook injects project context automatically
2. **Background work tracked**: All automation logged to session files automatically
3. **Status tracking**: Task IDs and completion status recorded automatically
4. **No manual session updates needed**: System maintains its own documentation

### Expected Git History Pattern
```
abc1234 feat: implement user authentication
def5678 docs: update API documentation for auth endpoints  
ghi9012 test: add comprehensive auth tests with GitHub Actions
```

### Expected Session File Entries
```
### 🤖 Subprocess: 2025-08-10 14:30:15
**Task ID:** DOC-1728123456-1234  
**Status:** 🔄 In Progress

**Status:** ✅ Completed Successfully  
**Duration:** 150s
---
```

### Hook Configuration
- **SessionStart Hook**: Automatic project context injection
- **PostToolUse Hook**: Detects git commits, spawns doc/test agents
- **Stop Hook**: Environment check before declaring work "ready"
- **Subprocesses run hookless**: No infinite loops (agents use `--settings '{}'`)
- **Session logging**: All automation tracked automatically

### Key Commands
- `/doc-ready` - Check if background automation is complete
- Environment and session tracking run automatically

## Quick Start for New Developers
1. Clone repository: `git clone <repo-url>`
2. Install dependencies: `pnpm install`
3. Start everything: `pnpm start`
4. Access Neo4j Browser: http://localhost:7474 (neo4j/albmarket123)
5. Backend will be at: http://localhost:4000 (when implemented)
6. Frontend will be at: http://localhost:3000 (when implemented)
7. **Understand the automated workflow above** - commits trigger automation

## Notes for Next Session
- ✅ Neo4j database instance ready with 3,790 items
- Need to define specific business requirements
- Choose between Express/Fastify for backend
- Decide on state management for frontend
- Specialized agents ready for use based on task needs