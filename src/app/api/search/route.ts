import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { createAuthenticatedHandler, getCurrentOrganization, checkRateLimit } from '@/lib/auth';
import { SearchRequest } from '@/types';

export const POST = createAuthenticatedHandler(async (request: NextRequest, user, authUser) => {
  try {
    // Rate limiting check
    const rateLimit = checkRateLimit(user.id, 'search', 50, 60000); // 50 requests per minute
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Too many search requests. Please try again later.',
          rateLimit: {
            remaining: rateLimit.remaining,
            resetTime: rateLimit.resetTime
          }
        },
        { status: 429 }
      );
    }

    const searchRequest: SearchRequest = await request.json();
    const { 
      query, 
      department, 
      fileType, 
      channel, 
      folderId, 
      tags, 
      visibility,
      dateFrom,
      dateTo,
      isFavorite,
      limit = 50, 
      offset = 0,
      useSemanticSearch = true,
      includeFolders = false
    } = searchRequest;

    const db = getDatabase();
    const organizationId = getCurrentOrganization(user, request);

    if (!query && !department && !fileType && !channel && !folderId && !tags?.length) {
      return NextResponse.json(
        { 
          success: false,
          error: 'At least one search parameter is required' 
        },
        { status: 400 }
      );
    }

    // Build enhanced search request with user context
    const enhancedSearchRequest: SearchRequest = {
      query,
      department,
      fileType,
      channel,
      folderId,
      tags,
      userId: user.id,
      organizationId,
      visibility,
      dateFrom,
      dateTo,
      isFavorite,
      limit: Math.min(limit, 100), // Cap at 100 results
      offset,
      useSemanticSearch,
      includeFolders
    };

    const searchResults = await db.searchDocuments(enhancedSearchRequest, user.id);

    // Get search filters for the response
    const filters = await getSearchFilters(user.id, organizationId);

    const response = {
      success: true,
      data: {
        query,
        totalDocuments: searchResults.total,
        results: searchResults.results,
        searchMethod: useSemanticSearch ? 'semantic' : 'keyword',
        processingTime: searchResults.processingTime,
        filters,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total: searchResults.total,
          hasNext: searchResults.results.length === limit,
          hasPrev: offset > 0
        },
        suggestions: generateSearchSuggestions(query, searchResults.results)
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Search failed',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
});

// Get available search filters for the user
async function getSearchFilters(userId: string, organizationId?: string) {
  const db = getDatabase();
  
  try {
    // This would ideally be cached or computed more efficiently
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

    // Get unique departments, file types, and channels
    const [departments, fileTypes, channels] = await Promise.all([
      db.prisma.document.findMany({
        where: accessWhere,
        select: { department: true },
        distinct: ['department']
      }),
      db.prisma.document.findMany({
        where: accessWhere,
        select: { fileType: true },
        distinct: ['fileType']
      }),
      db.prisma.document.findMany({
        where: accessWhere,
        select: { channel: true },
        distinct: ['channel']
      })
    ]);

    return {
      departments: departments.map(d => d.department).filter(Boolean),
      fileTypes: fileTypes.map(f => f.fileType).filter(Boolean),
      channels: channels.map(c => c.channel),
      users: [], // Could be populated with accessible users
      organizations: [] // Could be populated with user's organizations
    };
  } catch (error) {
    console.error('Error getting search filters:', error);
    return {
      departments: [],
      fileTypes: [],
      channels: [],
      users: [],
      organizations: []
    };
  }
}

// Generate search suggestions based on results
function generateSearchSuggestions(query?: string, results: any[] = []): string[] {
  if (!query || results.length === 0) {
    return [];
  }

  const suggestions: string[] = [];
  const queryWords = query.toLowerCase().split(' ');

  // Extract common terms from successful search results
  const commonTerms = new Map<string, number>();
  
  results.forEach(result => {
    // Extract terms from filename
    const filenameTerms = result.filename.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(' ')
      .filter(term => term.length > 2 && !queryWords.includes(term));
    
    filenameTerms.forEach(term => {
      commonTerms.set(term, (commonTerms.get(term) || 0) + 1);
    });

    // Extract terms from departments and tags
    if (result.department) {
      commonTerms.set(result.department.toLowerCase(), (commonTerms.get(result.department.toLowerCase()) || 0) + 2);
    }
    
    result.tags?.forEach((tag: string) => {
      commonTerms.set(tag.toLowerCase(), (commonTerms.get(tag.toLowerCase()) || 0) + 1);
    });
  });

  // Sort by frequency and take top suggestions
  const sortedTerms = Array.from(commonTerms.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term]) => term);

  // Create combined suggestions
  sortedTerms.forEach(term => {
    if (!queryWords.includes(term)) {
      suggestions.push(`${query} ${term}`);
    }
  });

  return suggestions.slice(0, 3); // Return top 3 suggestions
}