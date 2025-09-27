'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { signOut } from 'next-auth/react'
import { 
  Home, 
  FileText, 
  Upload, 
  Search, 
  Menu,
  X,
  ChevronRight,
  Settings,
  Bell,
  User,
  LogOut,
  UserCircle,
  Shield,
  HelpCircle,
  Command
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotificationPanel } from '@/components/ui/NotificationPanel'
import { cn, formatDate, getDepartmentColor, getFileTypeIcon } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import { useSession } from '@/hooks/useSession'
import { SearchResponse } from '@/types'

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    description: 'Overview and analytics',
    badge: null
  },
  {
    name: 'Documents',
    href: '/documents',
    icon: FileText,
    description: 'Manage documents',
    badge: null
  },
  {
    name: 'Upload',
    href: '/upload',
    icon: Upload,
    description: 'Upload new files',
    badge: null
  },
  {
    name: 'Search',
    href: '/search',
    icon: Search,
    description: 'Find documents',
    badge: null
  },
  {
    name: 'Integrations',
    href: '/integrations',
    icon: Settings,
    description: 'Document sources',
    badge: null
  }
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated } = useSession()
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null)
  const [showThemePanel, setShowThemePanel] = React.useState(false)
  const [showUserMenu, setShowUserMenu] = React.useState(false)
  
  // Global search state
  const [showSearchModal, setShowSearchModal] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [searchResults, setSearchResults] = React.useState<SearchResponse | null>(null)
  const [searchLoading, setSearchLoading] = React.useState(false)
  const [searchFilters, setSearchFilters] = React.useState({
    department: '',
    file_type: '',
    channel: '',
    use_semantic: true
  })
  
  const { currentTheme, theme, setTheme, themes } = useTheme()

  // Handle Ctrl+K keyboard shortcut
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        setShowSearchModal(true)
      }
      if (event.key === 'Escape' && showSearchModal) {
        setShowSearchModal(false)
        setSearchQuery('')
        setSearchResults(null)
      }
    }

    // Listen for custom event from centered search input
    const handleOpenGlobalSearch = () => {
      setShowSearchModal(true)
    }

    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('openGlobalSearch', handleOpenGlobalSearch)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('openGlobalSearch', handleOpenGlobalSearch)
    }
  }, [showSearchModal])

  React.useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  const handleSignOut = async () => {
    try {
      await signOut({ 
        callbackUrl: '/login',
        redirect: true 
      })
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setSearchLoading(true)
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: searchQuery, 
          ...searchFilters,
          limit: 10 // Limit results for modal
        })
      })
      
      const data = await response.json()
      setSearchResults(data.data)
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleSearchResultClick = (resultId: string) => {
    setShowSearchModal(false)
    setSearchQuery('')
    setSearchResults(null)
    router.push(`/documents/${resultId}`)
  }

  const getUserInitials = (name?: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getUserDisplayName = () => {
    return user?.name || user?.email?.split('@')[0] || 'User'
  }

  return (
    <>
      {/* Global Search Modal */}
      <AnimatePresence>
        {showSearchModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
              onClick={() => setShowSearchModal(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 flex items-center justify-center p-4 z-[101] pointer-events-none"
            >
              <div className="w-full max-w-2xl bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl pointer-events-auto">
                <div className="p-6">
                  <div className="flex items-center justify-center mb-6">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Search className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold">Global Search</h2>
                        <p className="text-sm text-muted-foreground">Search across all your documents</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-accent/50 rounded-lg">
                        <Command className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">K</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSearchModal(false)}
                        className="w-8 h-8 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <form onSubmit={handleGlobalSearch} className="space-y-4">
                    <div className="relative flex justify-center items-center">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for documents, keywords, or content..."
                        className="w-full pl-10 pr-4 py-3 bg-background border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                        autoFocus
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={searchFilters.use_semantic}
                            onChange={(e) => setSearchFilters(prev => ({ ...prev, use_semantic: e.target.checked }))}
                            className="rounded border-input text-primary focus:ring-primary"
                          />
                          <span className="text-sm">Semantic search</span>
                        </label>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowSearchModal(false)
                            router.push('/search')
                          }}
                        >
                          Advanced Search
                        </Button>
                        <Button
                          type="submit"
                          disabled={searchLoading || !searchQuery.trim()}
                          size="sm"
                        >
                          {searchLoading ? 'Searching...' : 'Search'}
                        </Button>
                      </div>
                    </div>
                  </form>

                  {/* Search Results */}
                  {searchLoading && (
                    <div className="mt-6 space-y-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse">
                          <div className="h-16 bg-accent/30 rounded-lg"></div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchResults && !searchLoading && (
                    <div className="mt-6 max-h-96 overflow-y-auto">
                      {searchResults.results.length === 0 ? (
                        <div className="text-center py-8">
                          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-muted-foreground">No documents found</p>
                          <p className="text-sm text-muted-foreground mt-1">Try different keywords or use advanced search</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-muted-foreground">
                              Found {searchResults.totalDocuments} documents
                            </p>
                            {searchResults.results.length === 10 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setShowSearchModal(false)
                                  router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
                                }}
                                className="text-xs"
                              >
                                View all results
                              </Button>
                            )}
                          </div>
                          
                          {searchResults.results.map((result) => (
                            <motion.button
                              key={result.id}
                              onClick={() => handleSearchResultClick(result.id)}
                              className="w-full p-3 bg-accent/30 hover:bg-accent/50 rounded-lg transition-colors text-left group"
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <div className="flex items-start gap-3">
                                <div className="text-lg mt-0.5 flex-shrink-0">
                                  {getFileTypeIcon(result.filename.split('.').pop() || '')}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                                    {result.filename}
                                  </h3>
                                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                    {result.textPreview}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    {result.department && (
                                      <span className={`text-xs px-2 py-0.5 rounded-full ${getDepartmentColor(result.department)}`}>
                                        {result.department}
                                      </span>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                      {result.processedAt ? formatDate(result.processedAt) : 'Unknown date'}
                                    </span>
                                    {result.relevanceScore > 0 && (
                                      <span className="text-xs text-primary">
                                        {(result.relevanceScore * 100).toFixed(0)}% match
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="mt-6 pt-4 border-t border-border/30">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span>Press <kbd className="px-1.5 py-0.5 bg-accent/50 rounded">Esc</kbd> to close</span>
                        <span>Press <kbd className="px-1.5 py-0.5 bg-accent/50 rounded">Enter</kbd> to search</span>
                      </div>
                      <span>Powered by AI semantic search</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="xl:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          className="glass-card shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white/90 dark:bg-slate-900/90"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          <AnimatePresence mode="wait">
            {isMobileOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="h-4 w-4" />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Menu className="h-4 w-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </div>

      <div className={cn(
        "hidden xl:block fixed inset-y-0 left-0 z-30 transition-all duration-500 ease-in-out",
        isCollapsed ? "w-20" : "w-80"
      )}>
        <motion.nav
          animate={{
            width: isCollapsed ? 80 : 320
          }}
          transition={{ 
            type: "spring", 
            damping: 30, 
            stiffness: 300 
          }}
          className="h-full glass-card border-r border-border/30 flex flex-col shadow-xl backdrop-blur-xl bg-background/95"
        >
          <div className={cn(
            "flex-shrink-0 border-b border-border/30 transition-all duration-500 relative overflow-hidden",
            isCollapsed ? "p-4" : "p-6 xl:p-8"
          )}>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            
            <div className={cn(
              "flex items-center transition-all duration-500 relative z-10",
              isCollapsed ? "justify-center" : "gap-4"
            )}>
              <motion.div 
                className={cn(
                  "rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center shadow-xl transition-all duration-500 ring-2 ring-primary/20",
                  isCollapsed ? "w-12 h-12" : "w-14 h-14 xl:w-16 xl:h-16"
                )}
                whileHover={{ scale: 1.05, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
              >
                <FileText className={cn(
                  "text-primary-foreground transition-all duration-500",
                  isCollapsed ? "w-5 h-5" : "w-7 h-7 xl:w-8 xl:h-8"
                )} />
              </motion.div>
              
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="min-w-0 flex-1"
                >
                  <h2 className="text-xl xl:text-2xl font-bold truncate bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    S-DOCS
                  </h2>
                  <p className="text-sm xl:text-base text-muted-foreground/80 truncate font-medium">
                    Document Intelligence System
                  </p>
                </motion.div>
              )}
            </div>
          </div>

          {isAuthenticated && user && (
            <div className={cn(
              "flex-shrink-0 border-b border-border/30 transition-all duration-500 relative overflow-hidden",
              isCollapsed ? "p-3" : "p-4"
            )}>
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />
              
              {isCollapsed ? (
                <div className="flex justify-center relative z-10">
                  <motion.div 
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-semibold text-sm shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    title={getUserDisplayName()}
                  >
                    {user.image ? (
                      <img 
                        src={user.image} 
                        alt={getUserDisplayName()} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getUserInitials(user.name)
                    )}
                  </motion.div>
                </div>
              ) : (
                <div className="flex items-center gap-3 relative z-10">
                  <motion.div 
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-semibold shadow-lg flex-shrink-0"
                    whileHover={{ scale: 1.05 }}
                  >
                    {user.image ? (
                      <img 
                        src={user.image} 
                        alt={getUserDisplayName()} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getUserInitials(user.name)
                    )}
                  </motion.div>
                  
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Global Search Button */}
          <div className={cn(
            "flex-shrink-0 border-b border-border/30 transition-all duration-500",
            isCollapsed ? "p-2" : "p-4"
          )}>
            <Button
              onClick={() => setShowSearchModal(true)}
              variant="outline"
              className={cn(
                "transition-all duration-300 hover:bg-accent/50 hover:border-primary/50 group",
                isCollapsed ? "w-full h-10 p-0" : "w-full justify-start gap-3 h-10"
              )}
            >
              <Search className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left text-muted-foreground group-hover:text-foreground transition-colors">
                    Search documents...
                  </span>
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-accent/50 rounded text-xs text-muted-foreground">
                    <Command className="w-3 h-3" />
                    <span>K</span>
                  </div>
                </>
              )}
            </Button>
          </div>

          <div className={cn(
            "flex-1 py-6 xl:py-8 space-y-2 xl:space-y-3 overflow-y-auto transition-all duration-500",
            isCollapsed ? "px-3" : "px-4 xl:px-6"
          )}>
            {navigationItems.map((item, index) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              const isHovered = hoveredItem === item.href

              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ 
                      scale: 1.02,
                      x: isCollapsed ? 0 : 4
                    }}
                    whileTap={{ scale: 0.98 }}
                    onHoverStart={() => setHoveredItem(item.href)}
                    onHoverEnd={() => setHoveredItem(null)}
                    className={cn(
                      "group relative flex items-center rounded-2xl transition-all duration-300 cursor-pointer",
                      "hover:shadow-lg hover:shadow-primary/5",
                      isActive 
                        ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-xl shadow-primary/20" 
                        : "hover:bg-accent/50 hover:backdrop-blur-sm",
                      isCollapsed ? "justify-center p-3 xl:p-4" : "gap-4 p-3 xl:p-4"
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeBackground"
                        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/90 to-primary opacity-90"
                        initial={false}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    
                    <motion.div 
                      className={cn(
                        "flex-shrink-0 relative z-10 transition-all duration-300",
                        isActive && "drop-shadow-sm"
                      )}
                      animate={{
                        rotate: isHovered ? 5 : 0,
                      }}
                    >
                      <Icon className={cn(
                        "transition-all duration-300",
                        isCollapsed ? "w-6 h-6 xl:w-7 xl:h-7" : "w-5 h-5 xl:w-6 xl:h-6",
                        isActive ? "text-primary-foreground" : "text-foreground/80"
                      )} />
                    </motion.div>
                    
                    {!isCollapsed && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 min-w-0 relative z-10"
                      >
                        <div className="flex items-center justify-between">
                          <p className={cn(
                            "text-base xl:text-lg font-semibold truncate transition-all duration-300",
                            isActive ? "text-primary-foreground" : "text-foreground/90"
                          )}>
                            {item.name}
                          </p>
                          {item.badge && (
                            <Badge variant={isActive ? "secondary" : "default"} className="ml-2 text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                        <p className={cn(
                          "text-sm xl:text-base truncate transition-all duration-300 mt-0.5",
                          isActive ? "text-primary-foreground/80" : "text-muted-foreground/70"
                        )}>
                          {item.description}
                        </p>
                      </motion.div>
                    )}
                    
                    {!isCollapsed && (
                      <motion.div
                        className="flex-shrink-0 relative z-10"
                        animate={{
                          x: isHovered || isActive ? 4 : 0,
                          opacity: isHovered || isActive ? 1 : 0.3
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className={cn(
                          "w-4 h-4 xl:w-5 xl:h-5 transition-all duration-300",
                          isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                        )} />
                      </motion.div>
                    )}

                    {isCollapsed && isActive && (
                      <motion.div
                        layoutId="collapsedActiveIndicator"
                        className="absolute right-0 w-1 h-8 bg-primary-foreground rounded-l-full"
                        initial={false}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </motion.div>
                </Link>
              )
            })}
          </div>

          <div className={cn(
            "flex-shrink-0 border-t border-border/30 transition-all duration-500 relative overflow-hidden",
            isCollapsed ? "p-3" : "p-4 xl:p-6"
          )}>
            <div className="absolute inset-0 bg-gradient-to-t from-accent/5 to-transparent" />
            
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-3 relative z-10">
                <motion.div 
                  className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/30"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    boxShadow: [
                      "0 0 0 0 rgba(34, 197, 94, 0.4)",
                      "0 0 0 6px rgba(34, 197, 94, 0)",
                      "0 0 0 0 rgba(34, 197, 94, 0)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-8 h-8 p-0 hover:bg-accent/50"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm xl:text-base font-semibold">System Status</p>
                    <div className="flex items-center gap-3 mt-2">
                      <motion.div 
                        className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/30"
                        animate={{ 
                          scale: [1, 1.2, 1],
                          boxShadow: [
                            "0 0 0 0 rgba(34, 197, 94, 0.4)",
                            "0 0 0 6px rgba(34, 197, 94, 0)",
                            "0 0 0 0 rgba(34, 197, 94, 0)"
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <p className="text-sm xl:text-base text-muted-foreground/80 truncate font-medium">
                        All systems operational
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs font-medium bg-background/50">
                      v3.0.0
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-start gap-2 hover:bg-accent/50"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.nav>
      </div>

      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="xl:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <header className={cn(
        "fixed top-0 right-0 glass-card border-b border-border/30 z-30 h-16 xl:h-20 transition-all duration-500 backdrop-blur-xl bg-background/95",
        isCollapsed ? "left-20 xl:left-20" : "left-0 xl:left-80"
      )}>
        <div className="flex items-center h-full px-6 xl:px-8">
          {/* Left Section - Page Title */}
          <div className="flex items-center gap-6 min-w-0 flex-1">
            <div className={cn(
              "xl:hidden transition-all duration-300",
              isCollapsed ? "w-16" : "w-12"
            )} />
            <div className="min-w-0 flex-1 lg:flex-none lg:w-64">
              <h1 className="text-xl xl:text-2xl 2xl:text-3xl font-bold capitalize truncate bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                {pathname.split('/').pop() || 'Dashboard'}
              </h1>
              <p className="text-sm xl:text-base 2xl:text-lg text-muted-foreground/80 truncate font-medium mt-1">
                {navigationItems.find(item => item.href === pathname)?.description || 'Welcome to Document Intelligence System'}
              </p>
            </div>
          </div>
          
          {/* Center Section - Global Search Input */}
          <div className="hidden lg:flex flex-1 justify-center items-center px-8">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative group w-full max-w-lg"
            >
              <div
                onClick={() => setShowSearchModal(true)}
                className="relative w-full cursor-pointer"
              >
                <div className="glass-card bg-background/60 hover:bg-background/80 backdrop-blur-xl border border-border/50 hover:border-primary/30 rounded-xl px-4 py-2.5 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group-hover:ring-2 group-hover:ring-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors flex-shrink-0">
                      <Search className="w-4 h-4 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0 text-center">
                      <div className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors truncate">
                        Search documents, keywords, or content...
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 px-2 py-1 bg-accent/50 group-hover:bg-accent/70 rounded-md transition-colors flex-shrink-0">
                      <Command className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">K</span>
                    </div>
                  </div>
                  
                  {/* Decorative gradient overlay */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Right Section - Actions */}
          <div className="flex items-center gap-3 xl:gap-4 flex-1 lg:flex-none justify-end">
            {/* Mobile search button - only visible on smaller screens */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden hover:bg-accent/50"
              onClick={() => setShowSearchModal(true)}
            >
              <Search className="w-4 h-4" />
            </Button>

            <div className="relative">
              <Button 
                variant="ghost" 
                size="sm" 
                className="hover:bg-accent/50 relative"
                onClick={() => setShowThemePanel(!showThemePanel)}
              >
                {React.createElement(theme.icon, {
                  className: "w-4 h-4 xl:w-5 xl:h-5"
                })}
              </Button>

              <AnimatePresence>
                {showThemePanel && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      onClick={() => setShowThemePanel(false)}
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-2 w-80 bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl z-50 p-4"
                    >
                      <div className="space-y-4">
                        <div className="text-center">
                          <h3 className="text-lg font-semibold">Choose Theme</h3>
                          <p className="text-sm text-muted-foreground">Select your preferred color scheme</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          {themes.map((themeOption) => {
                            const Icon = themeOption.icon
                            const isSelected = currentTheme === themeOption.id
                            
                            return (
                              <motion.button
                                key={themeOption.id}
                                onClick={() => {
                                  setTheme(themeOption.id)
                                  setShowThemePanel(false)
                                }}
                                className={cn(
                                  "relative p-4 rounded-xl transition-all duration-300 group text-left",
                                  "hover:scale-105 hover:shadow-lg",
                                  isSelected 
                                    ? "bg-primary/10 border-2 border-primary shadow-lg" 
                                    : "bg-accent/30 border border-border/30 hover:bg-accent/50"
                                )}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <div className={cn(
                                  "absolute inset-0 rounded-xl opacity-20 bg-gradient-to-br",
                                  themeOption.colors
                                )} />
                                
                                <div className="relative z-10">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className={cn(
                                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                                      isSelected ? "bg-primary text-primary-foreground" : "bg-background/50"
                                    )}>
                                      <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-semibold text-sm">{themeOption.name}</p>
                                      <p className="text-xs text-muted-foreground">{themeOption.description}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-1">
                                    <div className={cn(
                                      "w-3 h-3 rounded-full bg-gradient-to-r",
                                      themeOption.colors
                                    )} />
                                    <div className={cn(
                                      "w-3 h-3 rounded-full opacity-75 bg-gradient-to-r",
                                      themeOption.colors
                                    )} />
                                    <div className={cn(
                                      "w-3 h-3 rounded-full opacity-50 bg-gradient-to-r",
                                      themeOption.colors
                                    )} />
                                  </div>
                                </div>
                                
                                {isSelected && (
                                  <motion.div
                                    layoutId="themeSelection"
                                    className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                                    initial={false}
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                  >
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="w-2 h-2 rounded-full bg-primary-foreground"
                                    />
                                  </motion.div>
                                )}
                              </motion.button>
                            )
                          })}
                        </div>
                        
                        <div className="pt-2 border-t border-border/30">
                          <p className="text-xs text-muted-foreground text-center">
                            Theme changes apply instantly across all pages
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <Button variant="ghost" size="sm" className="hover:bg-accent/50">
              <Bell className="w-4 h-4 xl:w-5 xl:h-5" />
            </Button>
            <NotificationPanel />
            
            {isAuthenticated && user ? (
              <div className="relative">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hover:bg-accent/50 flex items-center gap-2 px-2"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-semibold text-sm">
                    {user.image ? (
                      <img 
                        src={user.image} 
                        alt={getUserDisplayName()} 
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      getUserInitials(user.name)
                    )}
                  </div>
                  <span className="hidden md:block font-medium truncate max-w-32">
                    {getUserDisplayName()}
                  </span>
                </Button>

                <AnimatePresence>
                  {showUserMenu && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setShowUserMenu(false)}
                      />
                      
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-full mt-2 w-64 bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl z-50 py-2"
                      >
                        <div className="px-4 py-3 border-b border-border/30">
                          <p className="font-semibold truncate">{getUserDisplayName()}</p>
                          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                          
                        </div>
                        
                        <div className="py-2">
                          <button onClick={() => {
                            setShowUserMenu(false)
                            router.push('/profile')
                          }}
                           className="w-full px-4 py-2 text-left hover:bg-accent/50 transition-colors flex items-center gap-3">
                            <UserCircle className="w-4 h-4" />
                            <span>Profile Settings</span>
                          </button>
                          <button className="w-full px-4 py-2 text-left hover:bg-accent/50 transition-colors flex items-center gap-3">
                            <Shield className="w-4 h-4" />
                            <span>Privacy & Security</span>
                          </button>
                          <button className="w-full px-4 py-2 text-left hover:bg-accent/50 transition-colors flex items-center gap-3">
                            <HelpCircle className="w-4 h-4" />
                            <span>Help & Support</span>
                          </button>
                        </div>
                        
                        <div className="border-t border-border/30 pt-2">
                          <button 
                            onClick={handleSignOut}
                            className="w-full px-4 py-2 text-left hover:bg-destructive/10 hover:text-destructive transition-colors flex items-center gap-3"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Button 
                variant="ghost" 
                size="sm" 
                className="hover:bg-accent/50"
                onClick={() => router.push('/login')}
              >
                <User className="w-4 h-4 xl:w-5 xl:h-5" />
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="h-16 xl:h-20 xl:hidden" />
    </>
  )
}