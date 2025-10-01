'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';

export default function NotFound() {
  const router = useRouter();
  const [copied, setCopied] = React.useState(false);

  const contactInfo = {
    email: 'gulshan63072@gmail.com',
    github: 'https://github.com/gulshank0/documents-organiser',
    support: 'support@documentsorganizer.com',
    twitter: 'https://x.com/gulshank0',
    discord: 'https://discord.gg/docsorganizer'
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(contactInfo.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContactForm = () => {
    const subject = encodeURIComponent('404 Error - Page Not Found');
    const body = encodeURIComponent(
      `Hi Developer Team,\n\nI encountered a 404 error while trying to access a page.\n\nURL: ${typeof window !== 'undefined' ? window.location.href : ''}\n\nPlease help me find what I'm looking for.\n\nThank you!`
    );
    window.location.href = `mailto:${contactInfo.email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-destructive/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative max-w-4xl w-full space-y-8 z-10">
        {/* Header with Logo */}
        <div className="text-center space-y-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center space-x-3 mb-8"
          >
            <div className="p-4 rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/10 text-destructive">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h1 className="text-7xl md:text-8xl font-bold mb-4">
              <span className="bg-gradient-to-r from-destructive via-destructive/80 to-destructive/60 bg-clip-text text-transparent">
                404
              </span>
            </h1>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Page Not Found
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Oops! The page you're looking for doesn't exist. It might have been moved, deleted, or never existed in the first place.
            </p>
          </motion.div>
        </div>

        {/* Quick Navigation */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="grid md:grid-cols-2 gap-4"
        >
          <Card className="p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-card/80 backdrop-blur-sm border-border/50 cursor-pointer" onClick={() => router.push('/')}>
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground">Go Home</h3>
              <p className="text-sm text-muted-foreground">Return to homepage</p>
            </div>
          </Card> 

          <Card className="p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-card/80 backdrop-blur-sm border-border/50 cursor-pointer" onClick={() => router.back()}>
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground">Go Back</h3>
              <p className="text-sm text-muted-foreground">Previous page</p>
            </div>
          </Card>
        </motion.div>

        {/* Contact Developer Section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Card className="p-8 bg-gradient-to-br from-primary/5 to-secondary/5 backdrop-blur-sm border-primary/20 shadow-2xl">
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M13,17H11V15H13V17M13,13H11V7H13V13Z" />
                  </svg>
                  Need Assistance?
                </div>
                <h3 className="text-2xl font-bold text-foreground">Contact Developer Team</h3>
                <p className="text-muted-foreground">
                  Can't find what you're looking for? Our development team is here to help you 24/7.
                </p>
              </div>

              {/* Primary Contact Button */}
              <div className="pt-2">
                <Button
                  onClick={handleContactForm}
                  className="w-full sm:w-auto px-8 py-6 text-lg bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" />
                  </svg>
                  Contact via Email
                </Button>
              </div>

              {/* Contact Options */}
              <div className="grid md:grid-cols-3 gap-4 pt-4">
                {/* Email Contact */}
                <div className="bg-card/50 p-4 rounded-xl border border-border/30 hover:border-primary/50 transition-all duration-300">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm mb-2">Email</h4>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-background/50 px-2 py-1 rounded border border-border/30 truncate flex-1">
                          {contactInfo.email}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCopyEmail}
                          className="h-7 w-7 p-0"
                        >
                          {copied ? (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z" />
                            </svg>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GitHub Issues */}
                <div className="bg-card/50 p-4 rounded-xl border border-border/30 hover:border-primary/50 transition-all duration-300">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm mb-2">GitHub</h4>
                      <Link href={contactInfo.github} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="w-full h-8 text-xs">
                          Report Issue
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Live Support */}
                <div className="bg-card/50 p-4 rounded-xl border border-border/30 hover:border-primary/50 transition-all duration-300">
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M12.5,11.5V7.5H11V13L15.2,15.4L16,14.2L12.5,11.5Z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm mb-2">24/7 Support</h4>
                      <div className="flex items-center justify-center text-xs text-muted-foreground">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                        Online Now
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Support Info */}
              <div className="pt-6 border-t border-border/30">
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center justify-center text-muted-foreground">
                    <svg className="w-5 h-5 mr-2 text-primary" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z" />
                    </svg>
                    <span>Response within 24 hours</span>
                  </div>
                  <div className="flex items-center justify-center text-muted-foreground">
                    <svg className="w-5 h-5 mr-2 text-primary" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M16.59,7.58L10,14.17L7.41,11.59L6,13L10,17L18,9L16.59,7.58Z" />
                    </svg>
                    <span>Available 24/7</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

             {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="text-center pt-8 border-t border-border/30"
        >
          <p className="text-xs text-muted-foreground">
            Error Code: 404 | This page could not be found
          </p>
        </motion.div>
      </div>
    </div>
  );
}