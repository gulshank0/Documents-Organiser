# KMRL Document Ingestion System - Next.js Edition

A modern, production-ready document processing and management system built with Next.js 14, TypeScript, and TailwindCSS for Kochi Metro Rail Limited (KMRL).

## 🚀 Features

### Core Functionality
- **Multi-source Document Ingestion**: Email, file system watchers, SharePoint, and manual uploads
- **Intelligent Document Processing**: OCR extraction with support for PDF, DOC, DOCX, images, and more
- **AI-Powered Classification**: Automatic department categorization using machine learning
- **Real-time Dashboard**: Live statistics, charts, and system monitoring
- **Semantic Search**: Advanced search capabilities with relevance scoring
- **Health Monitoring**: Comprehensive system health checks and alerting

### Technical Features
- **Next.js 14 App Router**: Modern React framework with server-side rendering
- **TypeScript**: Full type safety throughout the application
- **TailwindCSS**: Utility-first CSS framework with custom KMRL branding
- **Real-time Updates**: WebSocket integration for live data updates
- **Production Ready**: Error handling, loading states, and responsive design
- **API Routes**: RESTful endpoints matching the original FastAPI structure

## 🏗️ Architecture

### Frontend (Next.js)
- **Pages**: Dashboard, Documents, Search, Upload, Health Monitoring
- **Components**: Reusable UI components with consistent styling
- **Real-time Features**: WebSocket connections for live updates
- **Responsive Design**: Mobile-first approach with TailwindCSS

### Backend (API Routes)
- **Document Management**: CRUD operations for document metadata
- **File Processing**: Upload handling and processing pipeline integration
- **Search API**: Semantic and keyword search capabilities
- **Health Monitoring**: System metrics and alerting
- **Database Integration**: SQLite database connectivity

## 📦 Installation

```bash
# Install dependencies
npm install

# Install additional TailwindCSS plugins
npm install @tailwindcss/forms @tailwindcss/typography

# Start development server
npm run dev

# Build for production
npm run build
npm start
```

## 🔧 Configuration

### Environment Variables
```env
DATABASE_URL=./kmrl_documents.db
ML_ENABLED=true
UPLOAD_DIR=./uploads
```

### Database Setup
The application connects to your existing SQLite database at `../kmrl_documents.db` and works with the same schema as your FastAPI application.

## 📱 Pages Overview

### Dashboard (`/dashboard`)
- Real-time statistics and KPIs
- Department distribution charts
- Processing status overview
- Recent documents table
- System alerts panel

### Documents (`/documents`)
- Paginated document listing
- Advanced filtering and search
- Status and department badges
- Batch operations support

### Upload (`/upload`)
- Drag & drop file upload
- Progress tracking
- File validation
- Department auto-detection

### Search (`/search`)
- Semantic search capabilities
- Advanced filtering options
- Relevance scoring
- Rich result previews

### Health (`/health`)
- Real-time system metrics
- CPU, memory, and disk usage
- Database health status
- ML service monitoring
- Active alerts management

## 🎨 UI/UX Features

### Design System
- **KMRL Branding**: Custom blue color scheme
- **Consistent Components**: Standardized buttons, cards, and forms
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Loading States**: Skeleton screens and progress indicators
- **Error Handling**: User-friendly error messages

### Accessibility
- **Screen Reader Support**: Semantic HTML and ARIA labels
- **Keyboard Navigation**: Full keyboard accessibility
- **Color Contrast**: WCAG compliant color schemes
- **Focus Management**: Clear focus indicators

## 🔌 API Endpoints

The Next.js application provides the same API endpoints as your FastAPI version:

- `GET /api/health` - System health check
- `GET /api/documents` - List documents with filtering
- `POST /api/upload` - File upload and processing
- `POST /api/search` - Document search
- `GET /api/dashboard-data` - Dashboard statistics
- `GET /api/system-alerts` - Active system alerts

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker Support
The application can be containerized using the same infrastructure as your existing system.

### Integration with Existing System
- Uses the same SQLite database
- Compatible with existing file processing pipeline
- Maintains all existing functionality
- Can run alongside or replace the FastAPI application

## 🔄 Migration from FastAPI

This Next.js application is designed as a drop-in replacement for your existing FastAPI web interface:

1. **Database Compatibility**: Uses the same SQLite schema
2. **File System Integration**: Works with existing upload directories
3. **API Compatibility**: Maintains the same data structures
4. **Feature Parity**: All original features implemented

## 🛠️ Development

### Project Structure
```
src/
├── app/                 # Next.js App Router pages
├── components/         # Reusable UI components
├── lib/               # Utility functions and database
├── types/             # TypeScript type definitions
└── styles/            # Global styles and TailwindCSS
```

### Key Technologies
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **TailwindCSS**: Utility-first CSS framework
- **Heroicons**: Beautiful SVG icons
- **React Hook Form**: Form handling and validation
- **Recharts**: Data visualization
- **React Hot Toast**: Notifications

## 📊 Performance

- **Server-Side Rendering**: Improved SEO and initial load times
- **Code Splitting**: Automatic bundle optimization
- **Image Optimization**: Next.js built-in image optimization
- **Caching**: Intelligent caching strategies
- **Bundle Analysis**: Optimized bundle sizes

## 🔐 Security

- **Input Validation**: Server-side validation for all inputs
- **File Upload Security**: Type checking and size limits
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Proper cross-origin resource sharing
- **Error Handling**: Secure error messages

---

**Built with ❤️ for Kochi Metro Rail Limited**