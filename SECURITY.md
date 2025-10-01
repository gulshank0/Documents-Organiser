# Security Implementation Guide

## Overview
This document outlines the comprehensive security measures implemented in the Documents Organizer application to protect routes and ensure only authenticated users can access protected resources.

## Authentication Flow

### 1. **Middleware Protection**
The application uses Next.js middleware (`middleware.ts`) to protect all routes at the edge, before they even reach the application code.

#### How It Works:
- **Public Routes**: `/, /login, /register` - Accessible without authentication
- **Protected Routes**: All other routes require authentication
- **Unauthenticated Users**: Redirected to `/` (home page) with a redirect parameter
- **Authenticated Users**: Cannot access `/login` or `/register` (redirected to `/dashboard`)

#### Token Verification:
```typescript
// Supports both NextAuth and custom JWT tokens
1. Check NextAuth JWT token (for OAuth users like Google)
2. Check custom auth-token cookie (for email/password users)
3. Validate token structure and expiration
4. Clear invalid tokens automatically
```

### 2. **API Route Protection**
All API routes (except auth endpoints) are protected using authenticated handlers.

#### Protected API Routes:
- `/api/documents/*` - Document management
- `/api/folders/*` - Folder operations
- `/api/profile/*` - User profile
- `/api/dashboard-data/*` - Dashboard data
- `/api/integrations/*` - Third-party integrations
- `/api/organizations/*` - Organization management

#### Public API Routes:
- `/api/auth/login` - User login
- `/api/auth/register` - User registration
- `/api/auth/logout` - User logout

### 3. **Session Management**

#### Dual Authentication System:
1. **NextAuth Sessions** (for OAuth providers like Google)
   - JWT-based sessions
   - Automatic token refresh
   - Secure cookie storage

2. **Custom JWT Tokens** (for email/password authentication)
   - HTTP-only cookies
   - 7-day expiration
   - Secure in production (HTTPS only)
   - SameSite: Lax protection

### 4. **Redirect Flow**

#### Unauthenticated User Flow:
1. User tries to access `/dashboard` without login
2. Middleware detects no valid token
3. User redirected to `/?redirect=/dashboard`
4. Home page shows security alert message
5. User clicks "Sign In"
6. After successful login → redirected to `/dashboard`

#### Authenticated User Flow:
1. User with valid session tries to access `/login`
2. Middleware detects valid authentication
3. User automatically redirected to `/dashboard`

## Security Features

### 1. **Token Security**
- ✅ HTTP-only cookies (prevent XSS attacks)
- ✅ Secure flag in production (HTTPS only)
- ✅ SameSite: Lax (CSRF protection)
- ✅ Token expiration validation
- ✅ Automatic invalid token cleanup

### 2. **Route Protection**
- ✅ Edge-level middleware protection
- ✅ No client-side route guards (more secure)
- ✅ Protected API endpoints
- ✅ Role-based access control (RBAC)
- ✅ Organization-based permissions

### 3. **Input Validation**
- ✅ Email format validation
- ✅ Password strength requirements (min 6 chars)
- ✅ Input sanitization
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS prevention

### 4. **Rate Limiting**
- ✅ API rate limiting (100 requests per 15 minutes)
- ✅ IP-based tracking
- ✅ User-based tracking
- ✅ Integration activity monitoring

### 5. **Audit Logging**
- ✅ Authentication attempts logging
- ✅ Document access tracking
- ✅ Integration activity logs
- ✅ User action audit trail

## Testing the Security

### Test Protected Routes:
```bash
# Without authentication - should redirect to /
curl -I http://localhost:3000/dashboard

# With invalid token - should redirect to / and clear cookie
curl -I http://localhost:3000/dashboard \
  -H "Cookie: auth-token=invalid"

# With valid token - should allow access
curl -I http://localhost:3000/dashboard \
  -H "Cookie: auth-token=<your-valid-token>"
```

### Test API Protection:
```bash
# Without auth - should return 401
curl http://localhost:3000/api/documents

# With auth - should return data
curl http://localhost:3000/api/documents \
  -H "Authorization: Bearer <your-token>"
```

## Security Best Practices

### For Developers:
1. **Always use authenticated handlers** for protected API routes
2. **Never expose sensitive data** in client-side code
3. **Validate all user inputs** on both client and server
4. **Use parameterized queries** (Prisma handles this)
5. **Keep dependencies updated** regularly
6. **Use environment variables** for secrets
7. **Enable HTTPS** in production

### For Users:
1. **Use strong passwords** (minimum 8 characters recommended)
2. **Enable 2FA** when available (future feature)
3. **Logout from shared devices**
4. **Keep browser updated**
5. **Don't share credentials**

## Environment Variables

Required for security:
```env
# NextAuth
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000

# Database
DATABASE_URL=your-database-url

# OAuth (if using Google)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Production
NODE_ENV=production  # Enables secure cookies
```

## Security Checklist

### Pre-Production:
- [ ] All routes properly protected
- [ ] Environment variables set
- [ ] HTTPS enabled
- [ ] Rate limiting configured
- [ ] Audit logging enabled
- [ ] Error messages sanitized (no stack traces to users)
- [ ] CORS properly configured
- [ ] Security headers added
- [ ] Dependencies audited (`npm audit`)
- [ ] Penetration testing completed

### Production:
- [ ] Monitor authentication logs
- [ ] Track failed login attempts
- [ ] Regular security audits
- [ ] Backup strategy in place
- [ ] Incident response plan ready
- [ ] Regular dependency updates

## Common Security Scenarios

### Scenario 1: User Session Expires
**What Happens:**
1. Middleware detects expired token
2. User redirected to `/`
3. Security alert shown
4. Previous page stored in redirect parameter
5. After login, user returns to intended page

### Scenario 2: Brute Force Login Attempt
**Protection:**
1. Rate limiting kicks in after 100 requests
2. IP temporarily blocked
3. Attempt logged for review
4. User shown "too many requests" error

### Scenario 3: XSS Attack Attempt
**Protection:**
1. HTTP-only cookies prevent token access
2. Input sanitization removes malicious code
3. React automatically escapes output
4. CSP headers block inline scripts

### Scenario 4: CSRF Attack Attempt
**Protection:**
1. SameSite cookie attribute
2. Token validation on state-changing operations
3. Origin header validation
4. Double-submit cookie pattern

## Monitoring & Alerts

### What to Monitor:
- Failed authentication attempts
- Unusual access patterns
- Rate limit violations
- Token validation failures
- Privilege escalation attempts
- Data access anomalies

### Alert Triggers:
- Multiple failed logins (>5 in 10 minutes)
- Access to unauthorized resources
- Suspicious IP patterns
- Large data exports
- Permission changes

## Compliance

### GDPR Compliance:
- ✅ Data encryption at rest and in transit
- ✅ User consent management
- ✅ Right to deletion (data purge)
- ✅ Data portability
- ✅ Audit trail maintenance

### SOC 2 Considerations:
- ✅ Access control implementation
- ✅ Encryption standards
- ✅ Audit logging
- ✅ Change management
- ✅ Incident response

## Additional Security Layers

### Future Enhancements:
1. **Two-Factor Authentication (2FA)**
2. **IP Whitelisting** for organizations
3. **Device Fingerprinting**
4. **Anomaly Detection** with AI
5. **Real-time Threat Intelligence**
6. **Blockchain-based Audit Trail**
7. **Zero-Knowledge Encryption** for documents

## Support

For security concerns or to report vulnerabilities:
- Email: security@yourdomain.com
- Bug Bounty: [Link to program]
- Security Policy: See SECURITY_POLICY.md

---

**Last Updated:** 2025-10-01
**Security Level:** Enterprise-Grade
**Compliance:** GDPR, SOC 2 Ready
