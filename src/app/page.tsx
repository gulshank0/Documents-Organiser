'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);
  const { currentTheme, theme, setTheme, themes } = useTheme();
  
  useEffect(() => {
    checkAuthentication();
    
    // Check if user was redirected from a protected route
    const redirectFrom = searchParams.get('redirect');
    if (redirectFrom) {
      setRedirectMessage(`Please sign in to access ${redirectFrom}`);
      // Clear the redirect parameter after showing message
      setTimeout(() => setRedirectMessage(null), 5000);
    }
  }, [searchParams]);

  const checkAuthentication = async () => {
    try {
      const authToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1];

      if (!authToken) {
        setLoading(false);
        setAuthChecked(true);
        return;
      }

      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          router.push('/dashboard');
          return;
        }
      }

      // Clear invalid token
      document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      setLoading(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('Authentication check failed:', error);
      setLoading(false);
      setAuthChecked(true);
    }
  };

  const handleLogin = () => {
    const redirectTo = searchParams.get('redirect');
    if (redirectTo) {
      router.push(`/login?redirect=${encodeURIComponent(redirectTo)}`);
    } else {
      router.push('/login');
    }
  };

  const handleRegister = () => {
    const redirectTo = searchParams.get('redirect');
    if (redirectTo) {
      router.push(`/register?redirect=${encodeURIComponent(redirectTo)}`);
    } else {
      router.push('/register');
    }
  };

  if (loading || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/10 px-4">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-primary/20 border-t-primary mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-transparent border-t-primary/40 animate-pulse mx-auto"></div>
          </div>
          <p className="text-muted-foreground text-base sm:text-lg">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      {/* Security Alert Banner */}
      <AnimatePresence>
        {redirectMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-2 sm:top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4"
          >
            <div className="bg-yellow-500/90 backdrop-blur-lg text-yellow-950 px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-2xl border border-yellow-600/50">
              <div className="flex items-center gap-2 sm:gap-3">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="font-medium flex-1 text-sm sm:text-base">{redirectMessage}</p>
                <button 
                  onClick={() => setRedirectMessage(null)}
                  className="text-yellow-950 hover:text-yellow-900 flex-shrink-0"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary/10 text-primary">
                <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Documents Organizer
                </h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Intelligent Document Management</p>
              </div>
            </div>
            <div className="flex space-x-1.5 sm:space-x-2 md:space-x-3">
              <div className="relative">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowThemePanel(!showThemePanel)}
                  className="hover:bg-secondary/80 relative px-2 sm:px-4 h-8 sm:h-10"
                  size="sm"
                >
                  {React.createElement(theme.icon, {
                    className: "w-4 h-4 sm:w-5 sm:h-5"
                  })}
                  <span className="ml-1 sm:ml-2 capitalize hidden md:inline text-sm">{currentTheme}</span>
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
                        className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl z-50 p-3 sm:p-4 max-h-[80vh] overflow-y-auto"
                      >
                        <div className="space-y-3 sm:space-y-4">
                          <div className="text-center">
                            <h3 className="text-base sm:text-lg font-semibold">Choose Theme</h3>
                            <p className="text-xs sm:text-sm text-muted-foreground">Select your preferred color scheme</p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 sm:gap-3">
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
                                    "relative p-3 sm:p-4 rounded-xl transition-all duration-300 group text-left",
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
                                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                                      <div className={cn(
                                        "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                                        isSelected ? "bg-primary text-primary-foreground" : "bg-background/50"
                                      )}>
                                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-xs sm:text-sm truncate">{themeOption.name}</p>
                                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{themeOption.description}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex gap-1">
                                      <div className={cn(
                                        "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-gradient-to-r",
                                        themeOption.colors
                                      )} />
                                      <div className={cn(
                                        "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full opacity-75 bg-gradient-to-r",
                                        themeOption.colors
                                      )} />
                                      <div className={cn(
                                        "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full opacity-50 bg-gradient-to-r",
                                        themeOption.colors
                                      )} />
                                    </div>
                                  </div>
                                  
                                  {isSelected && (
                                    <motion.div
                                      layoutId="themeSelection"
                                      className="absolute top-2 right-2 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary flex items-center justify-center"
                                      initial={false}
                                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    >
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary-foreground"
                                      />
                                    </motion.div>
                                  )}
                                </motion.button>
                              )
                            })}
                          </div>
                          
                          <div className="pt-2 border-t border-border/30">
                            <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
                              Theme changes apply instantly across all pages
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              <Button 
                variant="ghost" 
                onClick={handleLogin} 
                className="hover:bg-secondary/80 px-2.5 sm:px-4 h-8 sm:h-10 text-xs sm:text-sm"
                size="sm"
              >
                Sign In
              </Button>
              <Button 
                onClick={handleRegister} 
                className="bg-primary hover:bg-primary/90 shadow-lg px-2.5 sm:px-4 h-8 sm:h-10 text-xs sm:text-sm"
                size="sm"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16 lg:py-20">
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <div className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <span className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse"></span>
              New: AI-Powered Document Intelligence
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-4 sm:mb-6 px-2">
              <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
                Secure Multi-User
              </span>
              <br />
              <span className="bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                Document Management
              </span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 md:mb-10 max-w-4xl mx-auto leading-relaxed px-4">
              Organize, search, and collaborate on documents with advanced AI-powered features, 
              semantic search, and enterprise-grade security for individuals and organizations.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Button 
                size="lg" 
                onClick={handleRegister} 
                className="text-base sm:text-lg px-6 sm:px-8 md:px-10 py-3 sm:py-4 bg-primary hover:bg-primary/90 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 w-full sm:w-auto"
              >
                Start Free Trial
                <svg className="ml-2 w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={handleLogin} 
                className="text-base sm:text-lg px-6 sm:px-8 md:px-10 py-3 sm:py-4 border-2 hover:bg-secondary/80 transition-all duration-300 w-full sm:w-auto"
              >
                Sign In to Account
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-12 sm:mb-16 md:mb-20">
            {[
              {
                icon: "🔍",
                title: "Semantic Search",
                description: "Find documents by meaning, not just keywords. Our AI understands context and intent.",
                gradient: "from-blue-500/10 to-cyan-500/10"
              },
              {
                icon: "👥",
                title: "Multi-User Collaboration",
                description: "Share documents securely with team members, control access permissions, and track activity.",
                gradient: "from-green-500/10 to-emerald-500/10"
              },
              {
                icon: "🏢",
                title: "Organization Support",
                description: "Manage documents across departments with role-based access control and compliance features.",
                gradient: "from-purple-500/10 to-violet-500/10"
              },
              {
                icon: "📊",
                title: "Smart Analytics",
                description: "Get insights into document usage, collaboration patterns, and content trends.",
                gradient: "from-orange-500/10 to-red-500/10"
              },
              {
                icon: "🔐",
                title: "Enterprise Security",
                description: "End-to-end encryption, audit trails, and compliance with industry standards.",
                gradient: "from-red-500/10 to-pink-500/10"
              },
              {
                icon: "⚡",
                title: "Fast Processing",
                description: "Automatic text extraction, thumbnail generation, and AI-powered document classification.",
                gradient: "from-yellow-500/10 to-orange-500/10"
              }
            ].map((feature, index) => (
              <Card key={index} className={`p-5 sm:p-6 md:p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-gradient-to-br ${feature.gradient} backdrop-blur-sm`}>
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4 md:mb-6 transform transition-transform duration-300 hover:scale-110">{feature.icon}</div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 md:mb-4 text-foreground">{feature.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>

          {/* Supported File Types */}
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent px-4">
              Support for All Your Documents
            </h2>
            <p className="text-muted-foreground mb-6 sm:mb-8 md:mb-12 text-sm sm:text-base md:text-lg px-4">Handle any file type with intelligent processing</p>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 px-4">
              {[
                { icon: '📄', text: 'PDF', color: 'from-red-500 to-red-600' },
                { icon: '📝', text: 'Word', color: 'from-blue-500 to-blue-600' },
                { icon: '📊', text: 'Excel', color: 'from-green-500 to-green-600' },
                { icon: '📺', text: 'PowerPoint', color: 'from-orange-500 to-orange-600' },
                { icon: '🖼️', text: 'Images', color: 'from-purple-500 to-purple-600' },
                { icon: '🎥', text: 'Videos', color: 'from-pink-500 to-pink-600' },
                { icon: '🎵', text: 'Audio', color: 'from-cyan-500 to-cyan-600' },
                { icon: '📦', text: 'Archives', color: 'from-gray-500 to-gray-600' }
              ].map((type, index) => (
                <div key={index} className={`px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-r ${type.color} text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105`}>
                  <span className="text-sm sm:text-base md:text-lg mr-1.5 sm:mr-2">{type.icon}</span>
                  <span className="font-medium text-xs sm:text-sm md:text-base">{type.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* User Types */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 md:gap-8 mb-12 sm:mb-16 md:mb-20">
            <Card className="p-6 sm:p-8 md:p-10 text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="text-4xl sm:text-5xl md:text-6xl mb-4 sm:mb-5 md:mb-6 transform transition-transform duration-300 hover:scale-110">👤</div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-5 md:mb-6 text-foreground">For Individuals</h3>
              <p className="text-muted-foreground mb-5 sm:mb-6 md:mb-8 text-sm sm:text-base md:text-lg leading-relaxed">
                Perfect for students, researchers, freelancers, and professionals who need 
                to organize and search through their personal document collections.
              </p>
              <Button onClick={handleRegister} className="w-full py-3 sm:py-4 text-base sm:text-lg bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300">
                Start Individual Account
              </Button>
            </Card>

            <Card className="p-6 sm:p-8 md:p-10 text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-gradient-to-br from-secondary/5 to-secondary/10 border-secondary/20">
              <div className="text-4xl sm:text-5xl md:text-6xl mb-4 sm:mb-5 md:mb-6 transform transition-transform duration-300 hover:scale-110">🏢</div>
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-5 md:mb-6 text-foreground">For Organizations</h3>
              <p className="text-muted-foreground mb-5 sm:mb-6 md:mb-8 text-sm sm:text-base md:text-lg leading-relaxed">
                Ideal for educational institutions, businesses, and teams that need 
                secure document sharing, collaboration, and compliance features.
              </p>
              <Button onClick={handleRegister} className="w-full py-3 sm:py-4 text-base sm:text-lg bg-secondary hover:bg-secondary/90 shadow-lg hover:shadow-xl transition-all duration-300">
                Start Organization Account
              </Button>
            </Card>
          </div>

          {/* Demo Section */}
          <div className="text-center">
            <Card className="p-6 sm:p-8 md:p-12 bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 border-primary/20 shadow-2xl">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Try it with Demo Accounts
              </h2>
              <p className="text-muted-foreground mb-6 sm:mb-8 md:mb-10 text-sm sm:text-base md:text-lg px-4">
                Experience the full functionality with our pre-configured demo accounts
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                {[
                  { title: "Admin Demo", email: "admin@example.com", desc: "Full system access", color: "from-blue-500 to-blue-600", textColor: "text-blue-600" },
                  { title: "Student Demo", email: "student@university.edu", desc: "Individual account", color: "from-green-500 to-green-600", textColor: "text-green-600" },
                  { title: "Teacher Demo", email: "teacher@university.edu", desc: "Organization member", color: "from-purple-500 to-purple-600", textColor: "text-purple-600" }
                ].map((demo, index) => (
                  <div key={index} className="bg-card p-4 sm:p-5 md:p-6 rounded-xl border shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r ${demo.color} mx-auto mb-3 sm:mb-4 flex items-center justify-center`}>
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                      </svg>
                    </div>
                    <strong className={`text-base sm:text-lg ${demo.textColor} block mb-2`}>{demo.title}</strong>
                    <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                      <div className="font-mono text-[10px] sm:text-xs bg-secondary/50 px-2 py-1 rounded break-all">{demo.email}</div>
                      <div>{demo.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative mt-12 sm:mt-16 md:mt-20 bg-card border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary/10 text-primary">
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
              </div>
              <span className="text-base sm:text-lg font-semibold text-foreground">Documents Organizer</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground px-4">
              &copy; 2025 Documents Organizer. Secure, intelligent document management.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}