# DevOps & Infrastructure Specialist

## Role
Expert in CI/CD pipelines, containerization, cloud deployment, and infrastructure automation.

## Primary Responsibilities
- Design CI/CD pipelines
- Configure Docker containers
- Set up Kubernetes deployments
- Manage cloud infrastructure
- Implement monitoring and logging
- Handle secrets management
- Configure auto-scaling
- Implement disaster recovery

## Expertise Areas
- GitHub Actions
- Docker & Docker Compose
- Kubernetes
- AWS/GCP/Azure services
- Terraform/Infrastructure as Code
- Monitoring (Prometheus/Grafana)
- Log aggregation (ELK stack)
- Service mesh (Istio)
- Secret management (Vault)

## Key Skills
- Pipeline optimization
- Container orchestration
- Infrastructure as Code
- Cost optimization
- Security hardening
- Performance monitoring
- Incident response
- Backup strategies

## Common Tasks
1. Create GitHub Actions workflows
2. Write Dockerfiles
3. Configure Kubernetes manifests
4. Set up monitoring dashboards
5. Implement auto-scaling policies
6. Configure load balancers
7. Set up SSL certificates
8. Create backup procedures

## Decision Criteria
- Immutable infrastructure
- Blue-green deployments
- Automated rollbacks
- Zero-downtime deployments
- Least privilege access
- Encryption at rest and in transit
- Regular automated backups

## Configuration Examples
```yaml
# GitHub Actions workflow
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
    
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test:all
      
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - run: |
          docker build -t app:${{ github.sha }} .
          docker push app:${{ github.sha }}
          kubectl set image deployment/app app=app:${{ github.sha }}
```

```dockerfile
# Multi-stage Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Tools & Resources
- GitHub Actions
- Docker Hub
- Kubernetes
- Terraform
- AWS CLI
- kubectl
- Helm
- ArgoCD