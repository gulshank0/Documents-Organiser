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
  Palette,
  LogOut,
  UserCircle,
  Shield,
  HelpCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NotificationPanel } from '@/components/ui/NotificationPanel'
import { cn } from '@/lib/utils'
import { useTheme } from '@/contexts/ThemeContext'
import { useSession } from '@/hooks/useSession'

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
  const { user, isAuthenticated, isLoading } = useSession()
  const [isMobileOpen, setIsMobileOpen] = React.useState(false)
  const [isCollapsed, setIsCollapsed] = React.useState(false)
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null)
  const [showThemePanel, setShowThemePanel] = React.useState(false)
  const [showUserMenu, setShowUserMenu] = React.useState(false)
  
  const { currentTheme, theme, setTheme, themes } = useTheme()

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

      <div className="hidden xl:block fixed top-0 z-50 transition-all duration-300" style={{ left: isCollapsed ? '70px' : '280px' }}>
        <Button
          variant="ghost"
          size="sm"
          className="glass-card shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-lg bg-background/80 border border-border/50 hover:bg-accent/50"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 0 : 180 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <ChevronRight className="h-4 w-4" />
          </motion.div>
        </Button>
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
                    SMART NOTES
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
          <motion.nav
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ 
              type: "spring", 
              damping: 30, 
              stiffness: 300 
            }}
            className="xl:hidden fixed top-0 left-0 h-full w-80 glass-card border-r border-border/30 z-50 flex flex-col shadow-2xl backdrop-blur-xl bg-background/95"
          >
            <div className="flex-shrink-0 border-b border-border/30 p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
              
              <div className="flex items-center gap-4 relative z-10">
                <motion.div 
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center shadow-xl ring-2 ring-primary/20"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FileText className="w-7 h-7 text-primary-foreground" />
                </motion.div>
                
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold truncate bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    SMART NOTES
                  </h2>
                  <p className="text-sm text-muted-foreground/80 truncate font-medium">
                    Document Intelligence System
                  </p>
                </div>
              </div>
            </div>

            {isAuthenticated && user && (
              <div className="flex-shrink-0 border-b border-border/30 p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />
                
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
              </div>
            )}

            <div className="flex-1 py-6 space-y-3 overflow-y-auto px-6">
              {navigationItems.map((item, index) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <Link key={item.href} href={item.href} onClick={() => setIsMobileOpen(false)}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "group relative flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 cursor-pointer",
                        "hover:shadow-lg hover:shadow-primary/5",
                        isActive 
                          ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-xl shadow-primary/20" 
                          : "hover:bg-accent/50 hover:backdrop-blur-sm"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="mobileActiveBackground"
                          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/90 to-primary opacity-90"
                          initial={false}
                          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      
                      <div className={cn(
                        "flex-shrink-0 relative z-10 transition-all duration-300",
                        isActive && "drop-shadow-sm"
                      )}>
                        <Icon className={cn(
                          "w-6 h-6 transition-all duration-300",
                          isActive ? "text-primary-foreground" : "text-foreground/80"
                        )} />
                      </div>
                      
                      <div className="flex-1 min-w-0 relative z-10">
                        <div className="flex items-center justify-between">
                          <p className={cn(
                            "text-lg font-semibold truncate transition-all duration-300",
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
                          "text-base truncate transition-all duration-300 mt-0.5",
                          isActive ? "text-primary-foreground/80" : "text-muted-foreground/70"
                        )}>
                          {item.description}
                        </p>
                      </div>
                      
                      <div className="flex-shrink-0 relative z-10">
                        <ChevronRight className={cn(
                          "w-5 h-5 transition-all duration-300",
                          isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                        )} />
                      </div>
                    </motion.div>
                  </Link>
                )
              })}
            </div>

            <div className="flex-shrink-0 border-t border-border/30 p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-accent/5 to-transparent" />
              
              <div className="space-y-4 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold">System Status</p>
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
                      <p className="text-base text-muted-foreground/80 truncate font-medium">
                        All systems operational
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-medium bg-background/50">
                    v3.0.0
                  </Badge>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-start gap-2 hover:bg-accent/50"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
                  </Button>
                  
                  {isAuthenticated && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSignOut}
                      className="px-3 hover:bg-destructive/10 hover:text-destructive"
                      title="Sign out"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      <header className={cn(
        "fixed top-0 right-0 glass-card border-b border-border/30 z-30 h-16 xl:h-20 transition-all duration-500 backdrop-blur-xl bg-background/95",
        isCollapsed ? "left-20 xl:left-20" : "left-0 xl:left-80"
      )}>
        <div className="flex items-center justify-between h-full px-6 xl:px-8">
          <div className="flex items-center gap-6 min-w-0 flex-1">
            <div className={cn(
              "xl:hidden transition-all duration-300",
              isCollapsed ? "w-16" : "w-12"
            )} />
            <div className="min-w-0 flex-1">
              <h1 className="text-xl xl:text-2xl 2xl:text-3xl font-bold capitalize truncate bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                {pathname.split('/').pop() || 'Dashboard'}
              </h1>
              <p className="text-sm xl:text-base 2xl:text-lg text-muted-foreground/80 truncate font-medium mt-1">
                {navigationItems.find(item => item.href === pathname)?.description || 'Welcome to Document Intelligence System'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 xl:gap-4 flex-shrink-0">
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
                          <button className="w-full px-4 py-2 text-left hover:bg-accent/50 transition-colors flex items-center gap-3">
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