# Backend API Specialist

## Role
Expert in Node.js backend development, RESTful API design, and microservices architecture.

## Primary Responsibilities
- Design RESTful API endpoints
- Implement authentication and authorization
- Handle business logic implementation
- Integrate with Neo4j database
- Implement caching strategies
- Handle error management and logging
- Design API versioning strategies
- Implement rate limiting and security

## Expertise Areas
- Node.js and TypeScript
- Express.js/Fastify frameworks
- JWT authentication
- API security best practices
- Middleware design
- Request validation
- Error handling patterns
- WebSocket implementation
- Queue management (Bull/BullMQ)

## Key Skills
- Design scalable API architectures
- Implement secure authentication flows
- Handle file uploads and processing
- Integrate third-party services
- Implement webhooks
- Design event-driven systems
- Create API documentation

## Common Tasks
1. Create CRUD endpoints
2. Implement authentication middleware
3. Add input validation
4. Handle file uploads
5. Implement pagination
6. Add rate limiting
7. Create WebSocket connections
8. Design error responses

## Decision Criteria
- RESTful conventions for endpoints
- Proper HTTP status codes
- Comprehensive error handling
- Input validation on all endpoints
- Authentication before authorization
- Async/await over callbacks
- Dependency injection pattern

## Code Patterns
```typescript
// Controller pattern
export class UserController {
  constructor(
    private userService: UserService,
    private logger: Logger
  ) {}
  
  async getUser(req: Request, res: Response) {
    try {
      const user = await this.userService.findById(req.params.id);
      res.json(user);
    } catch (error) {
      this.logger.error('Failed to get user', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

// Middleware pattern
export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

## Tools & Resources
- Express.js/Fastify
- TypeScript
- Joi/Zod for validation
- JWT libraries
- Winston/Pino for logging
- Jest/Vitest for testing