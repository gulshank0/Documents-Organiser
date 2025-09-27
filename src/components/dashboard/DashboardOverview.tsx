'use client'

import React, { Suspense, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Clock,
  Database,
  RefreshCw,
  ArrowRight,
  Activity,
  Settings,
  Zap,
  Globe,
  Mail,
  MessageSquare,
  HardDrive,
  Cloud
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DashboardErrorBoundary } from './DashboardErrorBoundary'
import { title } from 'process'

// Type definitions
interface DashboardStats {
  totalDocuments: number;
  processingQueue: number;
  documentsToday: number;
  averageProcessingTime: number;
  systemHealth: string;
  activeConnections: number;
}

interface DashboardData {
  stats: DashboardStats;
  charts: {
    byDepartment: Record<string, number>;
    byStatus: Record<string, number>;
    recentActivity: any[];
  };
  recentDocuments: any[];
  alerts: any[];
  cached?: boolean;
  timestamp?: string;
  fallback?: boolean;
  error?: string;
}

// Loading skeleton component
function DashboardSkeleton() {
  const skeletonItems = Array.from({ length: 4 }, (_, i) => `skeleton-stat-${i}`)
  const listItems = Array.from({ length: 5 }, (_, i) => `skeleton-list-${i}`)
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {skeletonItems.map((id) => (
          <Card key={id} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-5 bg-muted rounded w-1/3"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-muted rounded"></div>
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-5 bg-muted rounded w-1/3"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {listItems.map((id) => (
                <div key={id} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Helper functions to extract nested ternary operations
const getSystemStatusText = (isSystemOnline: boolean, systemHealth: string): string => {
  if (isSystemOnline) return 'Online'
  if (systemHealth === 'disconnected') return 'Disconnected'
  return 'Error'
}

const getPerformanceText = (isSystemOnline: boolean, systemHealth: string): string => {
  if (!isSystemOnline) return 'Limited'
  return systemHealth === 'healthy' ? 'Optimal' : 'Monitoring'
}

// Quick action cards
const quickActions = [
  {
    title: 'Upload Documents',
    description: 'Add new documents to the system',
    icon: Upload,
    href: '/upload',
    color: 'from-blue-500 to-blue-600'
  },
  {
    title: 'Search Documents',
    description: 'Find and filter documents',
    icon: FileText,
    href: '/search',
    color: 'from-green-500 to-green-600'
  },
  {
    title: 'Manage Integrations',
    description: 'Configure document sources',
    icon: Settings,
    href: '/integrations',
    color: 'from-purple-500 to-purple-600'
  }
]

export function DashboardOverview() {
  const [currentTime, setCurrentTime] = useState<string>('')
  const router = useRouter()

  // Update time only on client side after hydration
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString())
    }
    
    // Set initial time
    updateTime()
    
    // Update every second (optional)
    const interval = setInterval(updateTime, 1000)
    
    return () => clearInterval(interval)
  }, [])

  // Single API call for all dashboard data with improved error handling
  const { 
    data: dashboardData, 
    isLoading, 
    error, 
    refetch,
    isFetching 
  } = useQuery<DashboardData>({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/dashboard-data', {
          headers: {
            'Cache-Control': 'public, max-age=15'
          }
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        // Handle fallback data gracefully
        if (data.fallback) {
          console.warn('Using fallback dashboard data due to:', data.error)
          return data
        }
        
        return data
      } catch (fetchError) {
        console.error('Dashboard fetch error:', fetchError)
        throw new Error('Failed to fetch dashboard data: ' + (fetchError instanceof Error ? fetchError.message : 'Unknown error'))
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
    gcTime: 60000, // Cache for 1 minute (updated from cacheTime)
    retry: (failureCount, error) => {
      // Don't retry if it's a fallback response
      if (error.message.includes('fallback')) {
        return false
      }
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  })

  const handleRefresh = () => {
    refetch()
  }

  // Helper function to get system health indicator color
  const getSystemHealthColor = (health: string | undefined): string => {
    switch (health) {
      case 'healthy': return 'bg-green-500 animate-pulse'
      case 'busy': return 'bg-yellow-500 animate-pulse'
      case 'warning': return 'bg-orange-500 animate-pulse'
      case 'degraded': return 'bg-red-500 animate-pulse'
      case 'disconnected': return 'bg-gray-500'
      case 'error': return 'bg-red-600 animate-pulse'
      default: return 'bg-gray-400'
    }
  }

  // Show error state only if there's an error and no data at all
  if (error && !dashboardData) {
    return (
      <div className="p-6">
        <DashboardErrorBoundary>
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Unable to load dashboard</h2>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : 'An unknown error occurred'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </DashboardErrorBoundary>
      </div>
    )
  }

  const systemHealth = dashboardData?.stats?.systemHealth || 'unknown'
  const isSystemOnline = systemHealth !== 'disconnected' && systemHealth !== 'error'
  const isFallbackMode = dashboardData?.fallback === true

  return (
    <DashboardErrorBoundary>
      <div className="min-h-screen pt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-7xl">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-8 lg:mb-10"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1 sm:space-y-2">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                  Welcome back
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                    Here's what's happening with your document system today.
                  </p>
                  {isFallbackMode && (
                    <Badge variant="outline" className="text-xs bg-accent border-border text-accent-foreground">
                      Limited Mode
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs sm:text-sm px-2 py-1">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Last updated: </span>
                  {currentTime || '--:--:--'}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRefresh}
                  disabled={isFetching}
                  className="px-2"
                  title="Refresh dashboard data"
                >
                  <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Alert Banner for System Issues */}
          {(isFallbackMode || systemHealth === 'disconnected') && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="bg-accent/50 border border-border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {systemHealth === 'disconnected' ? 'Database Connection Issue' : 'Limited Functionality'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {systemHealth === 'disconnected' 
                        ? 'Unable to connect to the database. Some features may be unavailable.'
                        : 'System is running with limited capabilities. Real-time data may not be available.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 sm:mb-8 lg:mb-10"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {quickActions.map((action, index) => {
                const Icon = action.icon
                const isDisabled = isFallbackMode && action.href === '/upload'
                
                return (
                  <motion.div
                    key={action.title}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    whileHover={{ scale: isDisabled ? 1 : 1.02 }}
                    whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                    className="group"
                  >
                    <Card 
                      className={cn(
                        "relative overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 h-full border-2 border-transparent hover:border-primary/20",
                        isDisabled && "opacity-60 cursor-not-allowed"
                      )}
                      onClick={() => !isDisabled && router.push(action.href)}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-r ${action.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
                      <CardHeader className="pb-3 p-4 sm:p-6">
                        <div className="flex items-start sm:items-center gap-3">
                          <div className={`p-2 sm:p-3 rounded-lg bg-gradient-to-r ${action.color} flex-shrink-0 transition-transform ${isDisabled ? '' : 'group-hover:scale-110'}`}>
                            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className={cn(
                              "text-sm sm:text-base font-semibold truncate transition-colors",
                              isDisabled ? "text-muted-foreground" : "group-hover:text-primary"
                            )}>
                              {action.title}
                              {isDisabled && <span className="text-xs ml-1">(Limited)</span>}
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm mt-1 line-clamp-2">
                              {action.description}
                            </CardDescription>
                          </div>
                          {!isDisabled && (
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0" />
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* Main Dashboard Content */}
          <Suspense fallback={<DashboardSkeleton />}>
            {isLoading && !dashboardData ? (
              <DashboardSkeleton />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-6 sm:space-y-8"
              >
                {/* Statistics Cards */}
                <DashboardStats data={dashboardData?.stats} />

                {/* Integration Status */}
                <DashboardIntegrations />

                {/* Charts and Recent Activity */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
                  {/* Charts - Takes 2 columns on xl screens, full width on smaller */}
                  <div className="xl:col-span-2 order-2 xl:order-1">
                    <DashboardCharts data={dashboardData?.charts} />
                  </div>

                  {/* Recent Documents and Alerts - Takes 1 column, shows first on mobile */}
                  <div className="space-y-6 order-1 xl:order-2">
                    <DashboardRecentDocs data={dashboardData?.recentDocuments} />
                    <DashboardAlerts data={dashboardData?.alerts} />
                  </div>
                </div>
              </motion.div>
            )}
          </Suspense>

          {/* System Status Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 sm:mt-8 lg:mt-10"
          >
            <Card className="glass-card border border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getSystemHealthColor(systemHealth)}`}></div>
                      <span className="text-sm sm:text-base font-medium">
                        System {getSystemStatusText(isSystemOnline, systemHealth)}
                      </span>
                      {systemHealth && systemHealth !== 'healthy' && (
                        <Badge variant="outline" className="text-xs">
                          {systemHealth.charAt(0).toUpperCase() + systemHealth.slice(1)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className={cn(
                        "w-4 h-4 flex-shrink-0",
                        isSystemOnline ? "text-green-600" : "text-gray-500"
                      )} />
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        Performance: {getPerformanceText(isSystemOnline, systemHealth)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isFallbackMode && (
                      <Button variant="outline" size="sm" onClick={() => handleRefresh()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retry Connection
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardErrorBoundary>
  )
}

// Dashboard statistics component - now receives data as props instead of fetching
function DashboardStats({ data }: { readonly data?: DashboardStats }) {
  if (!data) {
    const skeletonStatCards = Array.from({ length: 4 }, (_, i) => `stat-skeleton-${i}`)
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {skeletonStatCards.map((id) => (
          <Card key={id} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statCards = [
    {
      title: 'Total Documents',
      value: data.totalDocuments?.toLocaleString() || '0',
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      description: 'Documents processed'
    },
    {
      title: 'Processing Queue',
      value: data.processingQueue?.toLocaleString() || '0',
      icon: Clock,
      color: 'from-amber-500 to-orange-600',
      description: 'Currently processing'
    },
    {
      title: 'Completed Today',
      value: data.documentsToday?.toLocaleString() || '0',
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      description: 'Processed today'
    },
    {
      title: 'Avg Processing Time',
      value: `${data.averageProcessingTime || 0}s`,
      icon: TrendingUp,
      color: 'from-purple-500 to-purple-600',
      description: 'Average processing time'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="relative overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-5`} />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${stat.color}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <div className="text-xs text-muted-foreground">
                  {stat.description}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

// Dashboard charts component
function DashboardCharts({ data }: { readonly data?: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Analytics</CardTitle>
        <CardDescription>Overview of document processing and distribution</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Charts will be rendered here with the provided data
          {data && (
            <div className="text-xs mt-2">
              Departments: {Object.keys(data.byDepartment || {}).length}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Recent documents component
function DashboardRecentDocs({ data }: { readonly data?: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Documents</CardTitle>
        <CardDescription>Latest processed documents</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data && data.length > 0 ? (
            data.slice(0, 5).map((doc, index) => (
              <div key={doc.id || index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.filename || 'Unknown Document'}</p>
                  <p className="text-xs text-muted-foreground">{doc.department || 'No department'}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {doc.status || 'Unknown'}
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent documents</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Helper function to get alert type color
const getAlertTypeColor = (type: string): string => {
  switch (type) {
    case 'error': return 'bg-red-500'
    case 'warning': return 'bg-yellow-500'
    default: return 'bg-blue-500'
  }
}

// System alerts component
function DashboardAlerts({ data }: { readonly data?: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Alerts</CardTitle>
        <CardDescription>Important notifications and alerts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data && data.length > 0 ? (
            data.slice(0, 3).map((alert, index) => (
              <div key={alert.id || index} className="flex items-start gap-3 p-3 rounded-lg border">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getAlertTypeColor(alert.type)}`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">All systems operational</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Integration type to icon mapping
const getIntegrationIcon = (type: string) => {
  switch (type.toUpperCase()) {
    case 'EMAIL':
    case 'GMAIL':
      return Mail
    case 'WHATSAPP':
      return MessageSquare
    case 'SHAREPOINT':
      return Globe
    case 'DROPBOX':
      return HardDrive
    case 'GOOGLE_DRIVE':
      return Cloud
    case 'SLACK':
    case 'TEAMS':
      return MessageSquare
    default:
      return Zap
  }
}

// Integration status color helper
const getIntegrationStatusColor = (isActive: boolean, lastSync: string | null) => {
  if (!isActive) return 'bg-gray-500'
  if (!lastSync) return 'bg-yellow-500'
  
  const syncTime = new Date(lastSync).getTime()
  const now = new Date().getTime()
  const hoursSinceSync = (now - syncTime) / (1000 * 60 * 60)
  
  if (hoursSinceSync < 1) return 'bg-green-500'
  if (hoursSinceSync < 24) return 'bg-yellow-500'
  return 'bg-red-500'
}

// Format last sync time
const formatLastSync = (lastSync: string | null) => {
  if (!lastSync) return 'Never synced'
  
  const syncTime = new Date(lastSync)
  const now = new Date()
  const diffMs = now.getTime() - syncTime.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  
  if (diffHours < 1) {
    return diffMinutes < 1 ? 'Just now' : `${diffMinutes}m ago`
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }
  return syncTime.toLocaleDateString()
}

// Dashboard integrations component
function DashboardIntegrations() {
  const router = useRouter()
  
  const { 
    data: integrations, 
    isLoading: integrationsLoading, 
    error: integrationsError 
  } = useQuery({
    queryKey: ['integrations-status'],
    queryFn: async () => {
      const response = await fetch('/api/integrations')
      if (!response.ok) {
        throw new Error('Failed to fetch integrations')
      }
      return response.json()
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  })

  if (integrationsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Document Integrations
          </CardTitle>
          <CardDescription>External document sources and their sync status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-muted rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-3/4 mb-1"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (integrationsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Document Integrations
          </CardTitle>
          <CardDescription>External document sources and their sync status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Failed to load integrations</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => router.push('/integrations')}>
              <Settings className="w-4 h-4 mr-2" />
              Manage Integrations
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const activeIntegrations = integrations?.filter((int: any) => int.is_active) || []
  const totalIntegrations = integrations?.length || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Document Integrations
              </CardTitle>
              <CardDescription>External document sources and their sync status</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {activeIntegrations.length}/{totalIntegrations} Active
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => router.push('/integrations')}
                className="hidden sm:flex"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {integrations && integrations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {integrations.map((integration: any, index: number) => {
                const Icon = getIntegrationIcon(integration.type)
                const statusColor = getIntegrationStatusColor(integration.is_active, integration.last_sync)
                const lastSyncText = formatLastSync(integration.last_sync)
                
                return (
                  <motion.div
                    key={integration.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    className="group"
                  >
                    <Card className={cn(
                      "cursor-pointer transition-all duration-300 hover:shadow-md",
                      integration.is_active 
                        ? "border-primary/20 bg-gradient-to-br from-primary/5 to-transparent" 
                        : "opacity-60 hover:opacity-80"
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className={cn(
                              "p-2 rounded-lg transition-colors",
                              integration.is_active 
                                ? "bg-primary/10 text-primary" 
                                : "bg-muted text-muted-foreground"
                            )}>
                              <Icon className="w-4 h-4" />
                            </div>
                            {/* Status indicator */}
                            <div className={cn(
                              "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background",
                              statusColor
                            )}></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {integration.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {integration.is_active ? lastSyncText : 'Inactive'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No integrations configured</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => router.push('/integrations')}>
                <Settings className="w-4 h-4 mr-2" />
                Set up Integrations
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}