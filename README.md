# Secure Multi-User Documents Organizer App

A robust, enterprise-grade document management system with multi-user support, role-based access control, and advanced security features. Built for organizations, educational institutions, startups, and professional teams.

## 🚀 Features

### User Management & Authentication
- **Multi-user Support**: Individual users and organizations
- **Secure Authentication**: JWT-based auth with bcrypt password hashing
- **OAuth Integration**: Google, Microsoft, GitHub sign-in
- **Role-Based Access Control**: Owner, Admin, Manager, Member, Viewer roles
- **User Types**: Students, Teachers, Professionals, Organizations

### Document Management
- **Secure Upload**: File validation, virus scanning, storage quotas
- **Multiple File Types**: PDF, Word, Excel, PowerPoint, images, videos, audio
- **Auto-Categorization**: AI-powered document classification
- **Version Control**: Document versioning with change tracking
- **Metadata Extraction**: Automatic metadata and text extraction

### Organization Features
- **Team Collaboration**: Organization-level document sharing
- **Hierarchical Structure**: Departments, teams, and project folders
- **Access Control**: Granular permissions per document/folder
- **Storage Management**: Organization storage quotas and analytics

### Advanced Search & Retrieval
- **Full-Text Search**: Search across all document content
- **Semantic Search**: AI-powered natural language queries
- **Advanced Filters**: Date, type, department, tags, user filters
- **Search Analytics**: Query performance and suggestions

### External Integrations
- **Email**: Gmail, Outlook automatic document import
- **Cloud Storage**: Google Drive, Dropbox, SharePoint sync
- **Communication**: Slack, Teams, WhatsApp integrations
- **API Access**: RESTful API for third-party integrations

### Security & Compliance
- **Encryption**: Data encrypted at rest and in transit
- **Access Logging**: Comprehensive audit trails
- **Rate Limiting**: API and upload rate limits
- **Data Isolation**: Multi-tenant architecture with data segregation

## 🛠️ Technology Stack

- **Backend**: Next.js 15, TypeScript, Prisma ORM
- **Database**: PostgreSQL with full-text search
- **Authentication**: JWT, bcrypt, NextAuth.js
- **Storage**: Local filesystem or cloud storage (AWS S3, Azure, GCS)
- **Security**: Input validation, CSRF protection, rate limiting
- **Real-time**: WebSocket for live updates
- **AI/ML**: Google Gemini integration for semantic search and categorization

## 📋 Prerequisites

- Node.js 20.0.0 or higher
- PostgreSQL 14 or higher
- npm or yarn package manager
- Git

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd documents-organiser
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup

#### Option A: Local PostgreSQL
```bash
# Install PostgreSQL (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE documents_organizer;
CREATE USER your_username WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE documents_organizer TO your_username;
\q
```

#### Option B: Docker PostgreSQL
```bash
# Start PostgreSQL with Docker
docker run --name documents-db \
  -e POSTGRES_DB=documents_organizer \
  -e POSTGRES_USER=your_username \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -d postgres:14
```

### 4. Environment Configuration
```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your configuration
nano .env
```

**Required Environment Variables:**
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/documents_organizer"
JWT_SECRET="your-super-secure-jwt-secret-key-here"
NEXTAUTH_SECRET="your-nextauth-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 5. Database Migration
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init-multi-user-system

# (Optional) Seed the database with sample data
npm run db:seed
```

### 6. Create Upload Directories
```bash
mkdir -p uploads/users uploads/organizations
chmod 755 uploads uploads/users uploads/organizations
```

### 7. Start the Application

#### Development Mode
```bash
# Start with WebSocket server
npm run dev:full

# Or start components separately
npm run ws     # WebSocket server (port 8080)
npm run dev    # Next.js app (port 3000)
```

#### Production Mode
```bash
npm run build
npm run start:full
```

## 🔐 Authentication Setup

### JWT Configuration
The app uses JWT for stateless authentication. Configure these in your `.env`:

```bash
JWT_SECRET="your-super-secure-jwt-secret-key-here-change-this-in-production"
BCRYPT_ROUNDS="12"
SESSION_TIMEOUT="604800000"  # 7 days
```

### OAuth Setup (Optional)

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API and Google Drive API
4. Create OAuth 2.0 credentials
5. Add to `.env`:
```bash
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

#### Microsoft OAuth
1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application
3. Configure permissions for Microsoft Graph
4. Add to `.env`:
```bash
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
```

## 👥 User Management

### Creating the First User
After setup, create your first admin user:

```bash
# Using the API
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourcompany.com",
    "password": "SecurePassword123!",
    "name": "System Administrator",
    "userType": "INDIVIDUAL",
    "profession": "Administrator"
  }'
```

### Creating Organizations
```bash
# Login first to get token, then create organization
curl -X POST http://localhost:3000/api/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Your Company Name",
    "slug": "your-company",
    "type": "COMPANY",
    "description": "Company description"
  }'
```

## 📁 File Upload & Processing

### Supported File Types
- **Documents**: PDF, DOC, DOCX, TXT, RTF, ODT
- **Spreadsheets**: XLS, XLSX, CSV, ODS
- **Presentations**: PPT, PPTX, ODP
- **Images**: JPG, PNG, GIF, BMP, TIFF, SVG, WebP
- **Videos**: MP4, AVI, MOV, WMV, WebM, MKV
- **Audio**: MP3, WAV, FLAC, AAC, OGG
- **Archives**: ZIP, RAR, 7Z, TAR, GZ

### Storage Limits
- **Individual Users**: 1GB default
- **Organizations**: 10GB default
- **Maximum File Size**: 100MB per file

### Upload Methods
1. **Web Interface**: Drag & drop or file browser
2. **API Upload**: POST to `/api/upload`
3. **Integrations**: Auto-sync from Gmail, Drive, etc.

## 🔍 Search & Retrieval

### Search Types
1. **Keyword Search**: Traditional full-text search
2. **Semantic Search**: AI-powered natural language queries
3. **Filtered Search**: Department, date, type, user filters

### Search API Example
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "query": "financial reports Q3 2024",
    "department": "FINANCE",
    "fileType": "pdf",
    "useSemanticSearch": true,
    "limit": 20
  }'
```

## 🔌 Integrations

### Email Integration
- **Gmail**: OAuth-based email document extraction
- **Outlook**: Microsoft Graph API integration
- **Auto-categorization**: Smart folder assignment

### Cloud Storage
- **Google Drive**: Bi-directional sync
- **Dropbox**: File monitoring and import
- **SharePoint**: Enterprise document libraries

### Communication Platforms
- **Slack**: Document sharing and notifications
- **Microsoft Teams**: Integrated file management
- **WhatsApp Business**: Document collection via chat

## 🛡️ Security Features

### Data Protection
- **Encryption at Rest**: Database and file encryption
- **Encryption in Transit**: HTTPS/TLS for all communications
- **Access Control**: Role-based permissions
- **Audit Logging**: Comprehensive activity tracking

### Security Headers
```javascript
// Automatically configured security headers
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
```

### Rate Limiting
- **API Requests**: 100 requests/minute per user
- **File Uploads**: 50 uploads/hour per user
- **Search Queries**: 50 searches/minute per user

## 📊 Monitoring & Analytics

### Built-in Analytics
- Document upload trends
- User activity patterns
- Storage usage statistics
- Search performance metrics
- Integration sync status

### Health Monitoring
```bash
# Check system health
curl http://localhost:3000/api/dashboard-data
```

## 🚀 Deployment

### Production Checklist
- [ ] Secure environment variables
- [ ] Database backup strategy
- [ ] SSL/TLS certificates
- [ ] CDN for file delivery
- [ ] Monitoring and logging
- [ ] Regular security updates

### Docker Deployment
```dockerfile
# Example Docker setup
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Variables for Production
```bash
NODE_ENV="production"
DATABASE_URL="postgresql://user:pass@prod-db:5432/documents_organizer"
JWT_SECRET="your-production-jwt-secret-256-bits-minimum"
NEXTAUTH_URL="https://yourdomain.com"
```

## 🔧 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Document Management
- `GET /api/documents` - List documents
- `POST /api/documents` - Create document
- `GET /api/documents/[id]` - Get document details
- `PUT /api/documents/[id]` - Update document
- `DELETE /api/documents/[id]` - Delete document
- `POST /api/documents/[id]/share` - Share document

### Organization Management
- `GET /api/organizations` - List user organizations
- `POST /api/organizations` - Create organization
- `POST /api/organizations/[id]/invite` - Invite user

### Search & Retrieval
- `POST /api/search` - Search documents
- `GET /api/folders` - List folders
- `POST /api/folders` - Create folder

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the API examples above

## 🗺️ Roadmap

- [ ] Mobile app development
- [ ] Advanced AI features
- [ ] Blockchain integration
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Enterprise SSO integration