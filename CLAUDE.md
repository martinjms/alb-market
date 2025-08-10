# Claude Persistent Memory

## Project Overview
**Project:** ALB Market
**Type:** Graph-based marketplace platform
**Status:** MVP Development Phase (Phase 1)
**Repository:** Monorepo structure with Neo4j, Backend API, Frontend

## Current Sprint
- Setting up project structure and development rules
- Establishing git workflow and CI/CD pipelines

## Technical Stack
- **Database:** Neo4j (Graph Database)
- **Backend:** Node.js + Express/Fastify (TBD)
- **Frontend:** React + Vite (TBD)
- **Monorepo:** PNPM workspaces + Turborepo
- **Testing:** Jest/Vitest (TBD)
- **CI/CD:** GitHub Actions

## Architecture Decisions
- Monorepo for better code sharing
- Neo4j for complex relationship modeling
- Separate /tmp folder for one-time scripts
- Session files for development journaling
- .credentials file for secure credential storage

## Project Structure Notes
- `/packages/backend` - API service
- `/packages/frontend` - Web application  
- `/packages/shared` - Shared types and utilities
- `/packages/database` - Migrations and seeds
- `/tmp` - Temporary scripts (gitignored)
- `/docs/sessions` - Development session journals

## Known Issues
- [ ] Need to determine specific framework choices
- [ ] Database connection configuration pending
- [ ] Deployment infrastructure not yet defined

## Common Commands
```bash
# Initial setup
./scripts/setup-local.sh

# Development
pnpm dev                 # Start all services
pnpm dev:backend        # Backend only
pnpm dev:frontend       # Frontend only

# Testing
pnpm test:all           # Run all tests
pnpm --filter [package] test

# Database
pnpm db:migrate         # Run migrations
pnpm db:seed           # Seed data
```

## Environment Variables Required
```bash
# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=

# Backend
PORT=4000
JWT_SECRET=

# Frontend
VITE_API_URL=http://localhost:4000
```

## Development Phases
- **Current:** Phase 1 (MVP) - Rapid development with some shortcuts allowed
- **Next:** Phase 2 (Production) - Triggered by first deployment
- **Future:** Phase 3 (Scale) - At 1000+ users

## Session Files
Latest session files in `/docs/sessions/`
Naming: `YYYY-MM-DD-branch-name.md`

## Specialized Agents Available
Located in `.claude/agents/`:
- Product Manager - Creates GitHub issues, defines requirements
- Project Coordinator - Feature planning and delegation
- Neo4j Specialist - Graph database expertise
- Backend API Specialist - Server-side development
- Frontend React Specialist - UI/UX implementation
- DevOps Specialist - Infrastructure and deployment
- Testing QA Specialist - Test strategy and implementation
- Security Specialist - Security audits and compliance
- Documentation Specialist - Maintains all documentation

Workflow: Product Manager → Coordinator → Specialists → Documentation

## GitHub Integration
- Token stored in .credentials as GITHUB_PERSONAL_ACCESS_TOKEN
- Run /tmp/setup-github-cli.sh to configure GitHub CLI
- Product Manager agent creates issues automatically

## Notes for Next Session
- Need to define specific business requirements
- Choose between Express/Fastify for backend
- Decide on state management for frontend
- Set up Neo4j database instance
- Specialized agents ready for use based on task needs