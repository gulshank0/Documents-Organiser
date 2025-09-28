import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { 
  User, 
  Document, 
  Folder, 
  Organization, 
  DocumentWithRelations,
  FolderWithRelations,
  UserWithRelations,
  OrganizationWithRelations,
  SearchRequest,
  SearchResult,
  DocumentStatus,
  DocumentVisibility,
  FolderVisibility,
  SharePermission,
  UserType,
  OrganizationRole,
  IntegrationType,
  AuthUser,
  LoginCredentials,
  RegisterData,
  AccessContext
} from '@/types';

class EnhancedDatabase {
  private prisma: PrismaClient;
  private static instance: EnhancedDatabase;
  private connectionChecked: boolean = false;
  private lastConnectionCheck: number = 0;
  private connectionCheckInterval: number = 30000; // 30 seconds

  constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Remove the deprecated beforeExit hook - use process events instead
    process.on('beforeExit', () => {
      console.log('Database connection closing...');
      this.disconnect();
    });
  }

  static getInstance(): EnhancedDatabase {
    if (!EnhancedDatabase.instance) {
      EnhancedDatabase.instance = new EnhancedDatabase();
    }
    return EnhancedDatabase.instance;
  }

  // Getter to access Prisma client
  get client(): PrismaClient {
    return this.prisma;
  }

  async testConnection(): Promise<boolean> {
    const now = Date.now();
    
    // Cache connection status for 30 seconds to avoid excessive checks
    if (this.connectionChecked && (now - this.lastConnectionCheck) < this.connectionCheckInterval) {
      return true;
    }

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.connectionChecked = true;
      this.lastConnectionCheck = now;
      console.log('Database connection verified successfully');
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      this.connectionChecked = false;
      this.lastConnectionCheck = now;
      
      // Try to reconnect
      try {
        await this.reconnect();
        return true;
      } catch (reconnectError) {
        console.error('Database reconnection failed:', reconnectError);
        return false;
      }
    }
  }

  async reconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      await this.prisma.$connect();
      console.log('Database reconnected successfully');
    } catch (error) {
      console.error('Failed to reconnect to database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      this.connectionChecked = false;
    } catch (error) {
      console.error('Error disconnecting from database:', error);
    }
  }

  // Wrapper method to ensure connection before executing queries
  private async ensureConnection(): Promise<boolean> {
    const isConnected = await this.testConnection();
    if (!isConnected) {
      throw new Error('Database connection unavailable');
    }
    return true;
  }

  // ==================== AUTHENTICATION ====================

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  generateJWT(user: AuthUser): string {
    const payload = {
      id: user.id,
      email: user.email,
      userType: user.userType,
      currentOrganization: user.currentOrganization
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', {
      expiresIn: '7d',
      issuer: 'documents-organizer',
      audience: 'documents-app'
    });
  }

  verifyJWT(token: string): AuthUser | null {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
      return {
        id: decoded.id,
        email: decoded.email,
        userType: decoded.userType,
        currentOrganization: decoded.currentOrganization
      };
    } catch (error) {
      console.error('JWT verification failed:', error);
      return null;
    }
  }

  async registerUser(data: RegisterData): Promise<User> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    const hashedPassword = await this.hashPassword(data.password);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        userType: data.userType,
        profession: data.profession,
        preferences: {
          create: {
            theme: 'system',
            language: 'en',
            emailNotifications: true,
            pushNotifications: true,
            autoSync: true,
            defaultVisibility: 'PRIVATE',
            aiSuggestions: true
          }
        }
      },
      include: {
        preferences: true
      }
    });

    return user;
  }

  async loginUser(credentials: LoginCredentials): Promise<{ user: UserWithRelations; token: string } | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: credentials.email },
      include: {
        preferences: true,
        organizations: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!user || !user.password) {
      return null;
    }

    const isValidPassword = await this.verifyPassword(credentials.password, user.password);
    if (!isValidPassword) {
      return null;
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      avatar: user.avatar ?? undefined,
      userType: user.userType,
      profession: user.profession ?? undefined,
      currentOrganization: user.organizations[0]?.organizationId
    };

    const token = this.generateJWT(authUser);

    // Transform the user object to match UserWithRelations type
    const transformedUser: UserWithRelations = {
      ...user,
      preferences: user.preferences || undefined,
      organizations: user.organizations.map(org => ({
        id: org.id,
        isActive: org.isActive,
        userId: org.userId,
        organizationId: org.organizationId,
        role: org.role,
        permissions: org.permissions,
        joinedAt: org.joinedAt
      }))
    };

    return { user: transformedUser, token };
  }

  async getUserById(userId: string): Promise<UserWithRelations | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        organizations: {
          include: {
            organization: true
          }
        },
        integrations: true
      }
    });

    if (!user) {
      return null;
    }

    // Transform the user object to match UserWithRelations type
    const transformedUser: UserWithRelations = {
      ...user,
      preferences: user.preferences || undefined,
      organizations: user.organizations.map(org => ({
        id: org.id,
        isActive: org.isActive,
        userId: org.userId,
        organizationId: org.organizationId,
        role: org.role,
        permissions: org.permissions,
        joinedAt: org.joinedAt
      }))
    };

    return transformedUser;
  }

  // ==================== ACCESS CONTROL ====================

  async getUserPermissions(userId: string, organizationId?: string): Promise<AccessContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          where: organizationId ? { organizationId } : undefined,
          include: {
            organization: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const permissions: AccessContext['permissions'] = [
      { action: 'read', resource: 'document' },
      { action: 'write', resource: 'document' },
      { action: 'read', resource: 'folder' },
      { action: 'write', resource: 'folder' }
    ];

    let role: OrganizationRole | undefined;
    
    if (organizationId && user.organizations.length > 0) {
      const membership = user.organizations.find(org => org.organizationId === organizationId);
      role = membership?.role;
      
      // Add organization-specific permissions based on role
      if (role === 'OWNER' || role === 'ADMIN') {
        permissions.push(
          { action: 'admin', resource: 'organization' },
          { action: 'delete', resource: 'document' },
          { action: 'delete', resource: 'folder' },
          { action: 'share', resource: 'document' }
        );
      } else if (role === 'MANAGER') {
        permissions.push(
          { action: 'share', resource: 'document' },
          { action: 'delete', resource: 'document', conditions: { owner: userId } }
        );
      }
    }

    return {
      userId,
      organizationId,
      role,
      permissions
    };
  }

  async canAccessDocument(userId: string, documentId: string): Promise<boolean> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        shares: true,
        organization: {
          include: {
            members: true
          }
        }
      }
    });

    if (!document) return false;

    // Owner can always access
    if (document.userId === userId) return true;

    // Check document visibility
    if (document.visibility === 'PUBLIC') return true;

    // Check if shared directly
    const isShared = document.shares.some(share => share.sharedWith === userId);
    if (isShared) return true;

    // Check organization access
    if (document.visibility === 'ORGANIZATION' && document.organizationId) {
      return document.organization?.members.some(member => member.userId === userId) || false;
    }

    return false;
  }

  async canEditDocument(userId: string, documentId: string): Promise<boolean> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        shares: true,
        organization: {
          include: {
            members: true
          }
        }
      }
    });

    if (!document) return false;

    // Owner can always edit
    if (document.userId === userId) return true;

    // Check shared permissions
    const share = document.shares.find(share => share.sharedWith === userId);
    if (share && (share.permissions === 'WRITE' || share.permissions === 'ADMIN')) {
      return true;
    }

    // Check organization permissions
    if (document.organizationId && document.organization) {
      const member = document.organization.members.find(member => member.userId === userId);
      if (member && (member.role === 'OWNER' || member.role === 'ADMIN' || member.role === 'MANAGER')) {
        return true;
      }
    }

    return false;
  }

  // ==================== ORGANIZATION MANAGEMENT ====================

  async createOrganization(data: {
    name: string;
    slug: string;
    description?: string;
    type: string;
    ownerId: string;
  }): Promise<OrganizationWithRelations> {
    const organization = await this.prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        type: data.type as any,
        members: {
          create: {
            userId: data.ownerId,
            role: 'OWNER',
            permissions: ['all']
          }
        }
      },
      include: {
        members: {
          include: {
            user: true
          }
        }
      }
    });

    return organization;
  }

  async inviteUserToOrganization(data: {
    organizationId: string;
    email: string;
    role: OrganizationRole;
    invitedBy: string;
  }): Promise<void> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      throw new Error('User not found. They need to register first.');
    }

    // Check if already a member
    const existingMember = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: data.organizationId
        }
      }
    });

    if (existingMember) {
      throw new Error('User is already a member of this organization');
    }

    await this.prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: data.organizationId,
        role: data.role
      }
    });
  }

  // ==================== DOCUMENT MANAGEMENT ====================

  async createDocument(data: {
    filename: string;
    originalPath: string;
    cloudinaryUrl: string;
    cloudinaryPublicId: string;
    fileType: string;
    mimeType: string;
    fileSize?: bigint;
    channel: string;
    department?: string;
    userId: string;
    organizationId?: string;
    folderId?: string;
    tags?: string[];
    visibility?: DocumentVisibility;
    metaData?: any;
    thumbnailPath?: string;
    thumbnailPublicId?: string;
  }): Promise<Document> {
    return this.prisma.document.create({
      data: {
        filename: data.filename,
        originalPath: data.originalPath,
        cloudinaryUrl: data.cloudinaryUrl,
        cloudinaryPublicId: data.cloudinaryPublicId,
        fileType: data.fileType,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        channel: data.channel,
        department: data.department,
        userId: data.userId,
        organizationId: data.organizationId,
        folderId: data.folderId,
        tags: data.tags || [],
        visibility: data.visibility || 'PRIVATE',
        metaData: data.metaData,
        status: 'PENDING',
        thumbnailPath: data.thumbnailPath,
        thumbnailPublicId: data.thumbnailPublicId,
      }
    });
  }

  async getDocuments(params: {
    userId: string;
    organizationId?: string;
    skip?: number;
    limit?: number;
    department?: string;
    status?: string;
    folderId?: string;
    visibility?: DocumentVisibility[];
  }): Promise<DocumentWithRelations[]> {
    // Ensure database connection before proceeding
    await this.ensureConnection();

    const { userId, organizationId, skip = 0, limit = 50, department, status, folderId, visibility } = params;

    try {
      // Build where clause for user access
      const whereClause: any = {
        OR: [
          { userId }, // User's own documents
          { 
            visibility: 'ORGANIZATION',
            organizationId,
            organization: {
              members: {
                some: { userId }
              }
            }
          }, // Organization documents
          {
            shares: {
              some: { sharedWith: userId }
            }
          } // Shared documents
        ]
      };

      // Add filters
      if (department) {
        whereClause.department = department;
      }
      if (status) {
        whereClause.status = status;
      }
      if (folderId) {
        whereClause.folderId = folderId;
      }
      if (visibility && visibility.length > 0) {
        whereClause.visibility = { in: visibility };
      }

      console.log('Executing document query with where clause:', JSON.stringify(whereClause, null, 2));

      const documents = await this.prisma.document.findMany({
        where: whereClause,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          organization: {
            select: { id: true, name: true }
          },
          folder: true,
          shares: true,
          versions: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      });

      console.log(`Successfully retrieved ${documents.length} documents for user ${userId}`);
      return documents;

    } catch (error) {
      console.error('Error in getDocuments:', error);
      
      // If it's a connection error, try to reconnect and retry once
      if (error instanceof Error && error.message.includes('connection')) {
        console.log('Attempting to reconnect and retry...');
        try {
          await this.reconnect();
          
          // Retry the query once
          const documents = await this.prisma.document.findMany({
            where: {
              OR: [
                { userId },
                { 
                  visibility: 'ORGANIZATION',
                  organizationId,
                  organization: {
                    members: {
                      some: { userId }
                    }
                  }
                },
                {
                  shares: {
                    some: { sharedWith: userId }
                  }
                }
              ]
            },
            include: {
              user: {
                select: { id: true, name: true, email: true }
              },
              organization: {
                select: { id: true, name: true }
              },
              folder: true,
              shares: true,
              versions: true
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
          });

          console.log(`Retry successful: retrieved ${documents.length} documents`);
          return documents;

        } catch (retryError) {
          console.error('Retry failed:', retryError);
          throw new Error(`Database connection failed: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
        }
      }
      
      throw error;
    }
  }

  async getDocumentById(documentId: string, userId: string): Promise<DocumentWithRelations | null> {
    const canAccess = await this.canAccessDocument(userId, documentId);
    if (!canAccess) {
      return null;
    }

    return this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        },
        folder: true,
        shares: {
          include: {
            recipient: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        versions: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });
  }

  async updateDocument(documentId: string, userId: string, data: Partial<Document>): Promise<Document | null> {
    const canEdit = await this.canEditDocument(userId, documentId);
    if (!canEdit) {
      throw new Error('Access denied: Cannot edit this document');
    }

    return this.prisma.document.update({
      where: { id: documentId },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  async deleteDocument(documentId: string, userId: string): Promise<boolean> {
    const canEdit = await this.canEditDocument(userId, documentId);
    if (!canEdit) {
      throw new Error('Access denied: Cannot delete this document');
    }

    await this.prisma.document.delete({
      where: { id: documentId }
    });

    return true;
  }

  // ==================== FOLDER MANAGEMENT ====================

  async createFolder(data: {
    name: string;
    description?: string;
    userId: string;
    organizationId?: string;
    parentId?: string;
    visibility?: FolderVisibility;
    color?: string;
  }): Promise<Folder> {
    return this.prisma.folder.create({
      data: {
        name: data.name,
        description: data.description,
        userId: data.userId,
        organizationId: data.organizationId,
        parentId: data.parentId,
        visibility: data.visibility || 'PRIVATE',
        color: data.color
      }
    });
  }

  async getFolders(userId: string, organizationId?: string): Promise<FolderWithRelations[]> {
    const whereClause: any = {
      OR: [
        { userId }, // User's own folders
        { 
          visibility: 'ORGANIZATION',
          organizationId,
          organization: {
            members: {
              some: { userId }
            }
          }
        } // Organization folders
      ]
    };

    return this.prisma.folder.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        },
        parent: true,
        children: true,
        documents: {
          select: { id: true, filename: true, fileType: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  // ==================== SEARCH ====================

  async searchDocuments(request: SearchRequest, userId: string): Promise<{
    results: SearchResult[];
    total: number;
    processingTime: number;
  }> {
    const startTime = Date.now();
    const { 
      query, 
      department, 
      fileType, 
      channel, 
      folderId, 
      tags, 
      organizationId,
      visibility,
      dateFrom,
      dateTo,
      isFavorite,
      limit = 50,
      offset = 0,
      useSemanticSearch = false
    } = request;

    // IMPORTANT: Restrict search to user's own documents only
    // Remove organization and shared documents access for personal search
    const accessWhere: any = {
      userId // Only user's own documents
    };

    // Build search filters
    const searchWhere: any = { ...accessWhere };

    // If using semantic search and query is provided
    if (query && useSemanticSearch) {
      try {
        const semanticResults = await this.performSemanticSearch(query, userId, {
          department,
          fileType,
          channel,
          folderId,
          tags,
          visibility,
          dateFrom,
          dateTo,
          isFavorite,
          limit,
          offset
        });
        
        return {
          results: semanticResults.results,
          total: semanticResults.total,
          processingTime: Date.now() - startTime
        };
      } catch (semanticError) {
        console.warn('Semantic search failed, falling back to keyword search:', semanticError);
        // Fall through to keyword search
      }
    }

    // Keyword search implementation
    if (query) {
      searchWhere.OR = [
        { filename: { contains: query, mode: 'insensitive' } },
        { extractedText: { contains: query, mode: 'insensitive' } },
        { tags: { hasSome: [query] } },
        { department: { contains: query, mode: 'insensitive' } }
      ];
    }

    if (department) searchWhere.department = department;
    if (fileType) searchWhere.fileType = fileType;
    if (channel) searchWhere.channel = channel;
    if (folderId) searchWhere.folderId = folderId;
    if (tags && tags.length > 0) searchWhere.tags = { hasSome: tags };
    if (visibility && visibility.length > 0) searchWhere.visibility = { in: visibility };
    if (isFavorite !== undefined) searchWhere.isFavorite = isFavorite;

    if (dateFrom || dateTo) {
      searchWhere.createdAt = {};
      if (dateFrom) searchWhere.createdAt.gte = new Date(dateFrom);
      if (dateTo) searchWhere.createdAt.lte = new Date(dateTo);
    }

    // Execute search
    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where: searchWhere,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          },
          organization: {
            select: { id: true, name: true }
          },
          folder: true
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      this.prisma.document.count({ where: searchWhere })
    ]);

    // Transform results
    const results: SearchResult[] = documents.map(doc => ({
      id: doc.id,
      filename: doc.filename,
      department: doc.department,
      channel: doc.channel,
      fileType: doc.fileType,
      fileSize: doc.fileSize ? Number(doc.fileSize) : undefined,
      tags: doc.tags,
      isFavorite: doc.isFavorite,
      relevanceScore: query ? this.calculateRelevanceScore(doc, query) : 1.0,
      textPreview: doc.extractedText?.substring(0, 200) || 'No preview available',
      processedAt: doc.processedAt?.toISOString(),
      thumbnailPath: doc.thumbnailPath,
      folder: doc.folder,
      user: doc.user,
      organization: doc.organization,
      visibility: doc.visibility,
      canEdit: doc.userId === userId,
      canShare: doc.userId === userId || doc.visibility !== 'PRIVATE',
      canDelete: doc.userId === userId
    }));

    const processingTime = Date.now() - startTime;

    return {
      results,
      total,
      processingTime
    };
  }

  // Semantic search implementation using OpenAI embeddings
  private async performSemanticSearch(
    query: string, 
    userId: string, 
    filters: {
      department?: string;
      fileType?: string;
      channel?: string;
      folderId?: string;
      tags?: string[];
      visibility?: DocumentVisibility[];
      dateFrom?: string;
      dateTo?: string;
      isFavorite?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ results: SearchResult[]; total: number }> {
    // Generate embedding for the search query
    const queryEmbedding = await this.generateEmbedding(query);
    
    if (!queryEmbedding) {
      throw new Error('Failed to generate embedding for query');
    }

    // Build base where clause - only user's own documents
    const baseWhere: any = { userId };
    
    // Apply filters
    if (filters.department) baseWhere.department = filters.department;
    if (filters.fileType) baseWhere.fileType = filters.fileType;
    if (filters.channel) baseWhere.channel = filters.channel;
    if (filters.folderId) baseWhere.folderId = filters.folderId;
    if (filters.tags && filters.tags.length > 0) baseWhere.tags = { hasSome: filters.tags };
    if (filters.visibility && filters.visibility.length > 0) baseWhere.visibility = { in: filters.visibility };
    if (filters.isFavorite !== undefined) baseWhere.isFavorite = filters.isFavorite;
    
    if (filters.dateFrom || filters.dateTo) {
      baseWhere.createdAt = {};
      if (filters.dateFrom) baseWhere.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) baseWhere.createdAt.lte = new Date(filters.dateTo);
    }

    // First, get documents that match the filters and have embeddings
    const documentsWithEmbeddings = await this.prisma.document.findMany({
      where: {
        ...baseWhere,
        embeddings: {
          some: {} // Has at least one embedding
        }
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        },
        folder: true,
        embeddings: true
      }
    });

    // Calculate semantic similarity scores
    const documentsWithScores = await Promise.all(
      documentsWithEmbeddings.map(async (doc) => {
        const maxSimilarity = Math.max(
          ...doc.embeddings.map(embedding => 
            this.calculateCosineSimilarity(queryEmbedding, embedding.embedding)
          )
        );
        
        return {
          document: doc,
          semanticScore: maxSimilarity,
          keywordScore: this.calculateRelevanceScore(doc, query)
        };
      })
    );

    // Sort by combined semantic and keyword relevance
    documentsWithScores.sort((a, b) => {
      const scoreA = (a.semanticScore * 0.7) + (a.keywordScore * 0.3);
      const scoreB = (b.semanticScore * 0.7) + (b.keywordScore * 0.3);
      return scoreB - scoreA;
    });

    // Apply pagination
    const paginatedResults = documentsWithScores.slice(
      filters.offset || 0, 
      (filters.offset || 0) + (filters.limit || 50)
    );

    // Transform to SearchResult format
    const results: SearchResult[] = paginatedResults.map(({ document: doc, semanticScore, keywordScore }) => ({
      id: doc.id,
      filename: doc.filename,
      department: doc.department,
      channel: doc.channel,
      fileType: doc.fileType,
      fileSize: doc.fileSize ? Number(doc.fileSize) : undefined,
      tags: doc.tags,
      isFavorite: doc.isFavorite,
      relevanceScore: (semanticScore * 0.7) + (keywordScore * 0.3),
      textPreview: doc.extractedText?.substring(0, 200) || 'No preview available',
      processedAt: doc.processedAt?.toISOString(),
      thumbnailPath: doc.thumbnailPath,
      folder: doc.folder,
      user: doc.user,
      organization: doc.organization,
      visibility: doc.visibility,
      canEdit: doc.userId === userId,
      canShare: doc.userId === userId || doc.visibility !== 'PRIVATE',
      canDelete: doc.userId === userId
    }));

    return {
      results,
      total: documentsWithScores.length
    };
  }

  // Generate embedding using OpenAI API
  private async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        console.warn('OpenAI API key not configured for semantic search');
        return null;
      }

      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.substring(0, 8000), // Limit input size
          encoding_format: 'float'
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      return null;
    }
  }

  // Calculate cosine similarity between two vectors
  private calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Enhanced relevance scoring for keyword search
  private calculateRelevanceScore(document: Document, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    
    // Filename match (highest priority)
    const filenameMatches = queryWords.filter(word => 
      document.filename.toLowerCase().includes(word)
    ).length;
    score += (filenameMatches / queryWords.length) * 0.4;
    
    // Content match (high priority)
    if (document.extractedText) {
      const contentMatches = queryWords.filter(word => 
        document.extractedText!.toLowerCase().includes(word)
      ).length;
      score += (contentMatches / queryWords.length) * 0.3;
    }
    
    // Tags match (medium priority)
    const tagMatches = queryWords.filter(word => 
      document.tags.some(tag => tag.toLowerCase().includes(word))
    ).length;
    score += (tagMatches / queryWords.length) * 0.2;
    
    // Department match (low priority)
    if (document.department) {
      const deptMatches = queryWords.filter(word => 
        document.department!.toLowerCase().includes(word)
      ).length;
      score += (deptMatches / queryWords.length) * 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  // Store document embedding for semantic search
  async storeDocumentEmbedding(documentId: string, content: string): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(content);
      if (!embedding) {
        console.warn(`Failed to generate embedding for document ${documentId}`);
        return;
      }

      await this.prisma.documentEmbedding.upsert({
        where: { documentId },
        create: {
          documentId,
          content: content.substring(0, 1000), // Store first 1000 chars for reference
          embedding
        },
        update: {
          content: content.substring(0, 1000),
          embedding,
          updatedAt: new Date()
        }
      });

      console.log(`Stored embedding for document ${documentId}`);
    } catch (error) {
      console.error(`Failed to store embedding for document ${documentId}:`, error);
    }
  }

  // ==================== SHARING ====================

  async shareDocument(data: {
    documentId: string;
    sharedBy: string;
    userEmails: string[];
    permission: SharePermission;
    expiresAt?: Date;
  }): Promise<void> {
    const canShare = await this.canEditDocument(data.sharedBy, data.documentId);
    if (!canShare) {
      throw new Error('Access denied: Cannot share this document');
    }

    // Find users by email
    const users = await this.prisma.user.findMany({
      where: { email: { in: data.userEmails } }
    });

    if (users.length !== data.userEmails.length) {
      throw new Error('Some users not found');
    }

    // Create shares
    const shareData = users.map(user => ({
      documentId: data.documentId,
      sharedWith: user.id,
      sharedBy: data.sharedBy,
      permissions: data.permission,
      expiresAt: data.expiresAt
    }));

    await this.prisma.documentShare.createMany({
      data: shareData,
      skipDuplicates: true
    });
  }

  // ==================== INTEGRATIONS ====================

  async createUserIntegration(data: {
    userId: string;
    type: IntegrationType;
    name: string;
    settings: any;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
  }): Promise<any> {
    return await this.prisma.userIntegration.upsert({
      where: {
        userId_type: {
          userId: data.userId,
          type: data.type
        }
      },
      create: data,
      update: {
        name: data.name,
        settings: data.settings,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: data.expiresAt,
        isActive: true,
        updatedAt: new Date()
      }
    });
  }

  async getUserIntegrations(userId: string): Promise<any[]> {
    return this.prisma.userIntegration.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  // ==================== ANALYTICS ====================

  async getDashboardData(userId: string, organizationId?: string): Promise<any> {
    const accessWhere = {
      OR: [
        { userId },
        ...(organizationId ? [{
          organizationId,
          organization: {
            members: { some: { userId } }
          }
        }] : []),
        { shares: { some: { sharedWith: userId } } }
      ]
    };

    const [
      totalDocuments,
      processingQueue,
      failedDocuments,
      recentDocuments,
      departmentStats,
      channelStats
    ] = await Promise.all([
      this.prisma.document.count({ where: accessWhere }),
      this.prisma.document.count({ 
        where: { ...accessWhere, status: 'PROCESSING' } 
      }),
      this.prisma.document.count({ 
        where: { ...accessWhere, status: 'FAILED' } 
      }),
      this.prisma.document.findMany({
        where: accessWhere,
        include: {
          user: { select: { id: true, name: true, email: true } },
          organization: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      this.prisma.document.groupBy({
        by: ['department'],
        where: accessWhere,
        _count: true
      }),
      this.prisma.document.groupBy({
        by: ['channel'],
        where: accessWhere,
        _count: true
      })
    ]);

    return {
      totalDocuments,
      processingQueue,
      failedDocuments,
      storageUsed: 0, // Calculate based on fileSize sum
      recentUploads: recentDocuments,
      departmentStats: Object.fromEntries(
        departmentStats.map(stat => [stat.department || 'UNKNOWN', stat._count])
      ),
      channelStats: Object.fromEntries(
        channelStats.map(stat => [stat.channel, stat._count])
      ),
      fileTypeStats: {},
      alerts: []
    };
  }
}

// Export singleton instance
let database: EnhancedDatabase;

export function getDatabase(): EnhancedDatabase {
  if (!database) {
    database = EnhancedDatabase.getInstance();
  }
  return database;
}

export default EnhancedDatabase;