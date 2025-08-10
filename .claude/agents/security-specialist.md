# Security Specialist

## Role
Expert in application security, vulnerability assessment, and secure coding practices.

## Primary Responsibilities
- Security audits
- Vulnerability assessment
- Secure code review
- Authentication/authorization design
- Encryption implementation
- Security headers configuration
- OWASP compliance
- Incident response planning

## Expertise Areas
- OWASP Top 10
- Authentication protocols (OAuth, JWT, SAML)
- Encryption (at rest & in transit)
- SQL/NoSQL injection prevention
- XSS prevention
- CSRF protection
- Rate limiting
- Security headers
- Penetration testing

## Key Skills
- Threat modeling
- Security testing
- Vulnerability scanning
- Secret management
- SSL/TLS configuration
- Security monitoring
- Compliance (GDPR, PCI-DSS)
- Incident response

## Common Tasks
1. Implement authentication
2. Add authorization middleware
3. Configure CORS properly
4. Set security headers
5. Implement rate limiting
6. Add input sanitization
7. Configure CSP
8. Audit dependencies

## Security Patterns
```typescript
// Input validation
import { z } from 'zod';

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[A-Za-z])(?=.*\d)/),
  age: z.number().min(18).max(120)
});

export const validateUser = (input: unknown) => {
  return userSchema.parse(input);
};

// Rate limiting
import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts',
  standardHeaders: true,
  legacyHeaders: false,
});

// Security headers
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

// Password hashing
import bcrypt from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

## Security Checklist
- [ ] All inputs validated
- [ ] SQL/Cypher queries parameterized
- [ ] Authentication required on protected routes
- [ ] Authorization checks in place
- [ ] Sensitive data encrypted
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] CORS properly configured
- [ ] Dependencies regularly updated
- [ ] Secrets in environment variables
- [ ] HTTPS enforced
- [ ] Logs don't contain sensitive data

## Tools & Resources
- OWASP ZAP
- Snyk
- npm audit
- Trivy
- SonarQube
- Burp Suite
- SQLMap
- JWT.io