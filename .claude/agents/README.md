# Claude Subagent Configurations

This directory contains specialized agent configurations for the ALB Market project. Each agent has deep expertise in their domain and can be invoked for specific tasks.

## Available Specialists

### 🗂️ Project Coordinator
**When to use:** Starting new features, planning sprints, coordinating work
```
"I need to implement user authentication feature"
→ Coordinator breaks it down and delegates to specialists
```

### 🗄️ Neo4j Graph Database Specialist
**When to use:** Database schema design, Cypher queries, performance optimization
```
"Design the database schema for a marketplace with users, products, and orders"
"Optimize this slow Cypher query"
"How should I model user relationships in Neo4j?"
```

### 🔧 Backend API Specialist
**When to use:** API design, endpoint implementation, business logic
```
"Create REST endpoints for user management"
"Implement JWT authentication"
"Add rate limiting to the API"
```

### ⚛️ Frontend React Specialist
**When to use:** React components, state management, UI implementation
```
"Build a product listing page with filters"
"Implement infinite scroll for the feed"
"Create a reusable form component"
```

### 🚀 DevOps & Infrastructure Specialist
**When to use:** CI/CD, deployment, monitoring, containerization
```
"Set up GitHub Actions for the monorepo"
"Create Docker containers for all services"
"Configure auto-scaling for production"
```

### 🧪 Testing & QA Specialist
**When to use:** Test strategy, test implementation, coverage improvement
```
"Write tests for the authentication service"
"Set up E2E testing with Cypress"
"Improve test coverage to 80%"
```

### 🔒 Security Specialist
**When to use:** Security audits, vulnerability fixes, authentication design
```
"Review the authentication implementation for vulnerabilities"
"Implement OWASP best practices"
"Set up rate limiting and CSRF protection"
```

### 📚 Documentation Specialist
**When to use:** AUTOMATED via git workflow (no manual invocation needed)
```
AUTOMATED: Runs automatically after code commits
- Updates technical documentation
- Updates API documentation  
- Maintains changelog
- Ensures docs match implementation

Note: Built into spawn-claude.sh and triggered by PostToolUse hook
Manual invocation rarely needed - system handles this automatically
```

### 📋 Product Manager
**When to use:** Feature planning, requirements gathering, sprint planning
```
"Plan the user authentication feature"
"Create GitHub issues for shopping cart functionality"
"Break down the checkout epic into tasks"
→ Creates detailed GitHub issues with acceptance criteria
```

## How to Use Agents

### For Complex Features
1. Start with the **Project Coordinator** to plan the work
2. Coordinator will identify which specialists are needed
3. Each specialist handles their domain
4. Coordinator integrates the work

### For Specific Tasks
Directly invoke the relevant specialist:
- Database query issue → Neo4j Specialist
- API endpoint needed → Backend Specialist
- Component styling → Frontend Specialist
- Deployment problem → DevOps Specialist
- Test failures → Testing Specialist
- Security concern → Security Specialist

## Agent Collaboration Patterns

### Pattern 1: Feature Development
```
Coordinator → Plans feature
    ↓
Neo4j Specialist → Designs schema
    ↓
Backend Specialist → Implements API
    ↓
Frontend Specialist → Builds UI
    ↓
Testing Specialist → Writes tests
    ↓
Security Specialist → Security review
    ↓
DevOps Specialist → Deploys
```

### Pattern 2: Bug Fix
```
Testing Specialist → Identifies issue
    ↓
Relevant Specialist → Fixes bug
    ↓
Testing Specialist → Verifies fix
    ↓
DevOps Specialist → Deploys patch
```

### Pattern 3: Performance Optimization
```
DevOps Specialist → Identifies bottleneck
    ↓
Neo4j/Backend/Frontend Specialist → Optimizes
    ↓
Testing Specialist → Performance tests
    ↓
DevOps Specialist → Monitors improvement
```

## Best Practices

1. **Start with the Coordinator** for new features or complex tasks
2. **Use specialists directly** for domain-specific questions
3. **Document decisions** in session files
4. **Follow the chain** - let specialists hand off to each other
5. **Validate with Testing** - always involve testing specialist
6. **Security review** - involve security for sensitive features

## Example Requests

### Good Request (Clear and Specific)
```
"Neo4j Specialist: Design a graph schema for a marketplace where:
- Users can buy and sell products
- Users can follow each other
- Products have categories
- Orders track purchases"
```

### Better Request (With Context)
```
"Project Coordinator: We need to add a recommendation engine feature.
Users should see:
- Products similar to what they've viewed
- Products bought by users with similar interests
- Trending products in their network

Please plan the implementation across all teams."
```

## Agent Capabilities Matrix

| Agent | Can Do | Cannot Do |
|-------|--------|-----------|
| Neo4j | Design schemas, write queries, optimize | Frontend work, deployment |
| Backend | API design, business logic, integration | UI components, infrastructure |
| Frontend | React components, state, UX | Database queries, deployment |
| DevOps | CI/CD, deployment, monitoring | Business logic, UI design |
| Testing | Test strategy, write tests, coverage | Fix bugs (identifies them) |
| Security | Audits, secure patterns, compliance | Feature development |
| Coordinator | Planning, delegation, integration | Deep implementation |

## Quick Reference

```bash
# Common agent invocations
"Coordinator: Plan feature X"
"Neo4j: Optimize this query"
"Backend: Create endpoint for Y"
"Frontend: Build component Z"
"DevOps: Deploy to staging"
"Testing: Write tests for W"
"Security: Review authentication"
```

## Integration with Project Rules

All agents:
- Follow rules in `/claude.md`
- Update session files continuously
- Use `/tmp` for temporary scripts
- Never edit `.credentials`
- Maintain code quality standards
- Follow git workflow
- Update documentation

Remember: Agents are specialists, not generalists. Use them for their expertise!