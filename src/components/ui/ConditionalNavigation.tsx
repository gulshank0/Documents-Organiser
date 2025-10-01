'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from './Navigation';
import { useEffect, useState } from 'react';

export function ConditionalNavigation() {
  const pathname = usePathname();
  const [is404, setIs404] = useState(false);
  
  useEffect(() => {
    // Check if the current page is a 404 by looking at document title or other indicators
    // Since Next.js doesn't provide a direct way to check 404 status on client side,
    // we'll check if the pathname matches known routes
    const knownRoutes = [
      '/',
      '/login',
      '/register',
      '/dashboard',
      '/documents',
      '/upload',
      '/search',
      '/profile',
      '/integrations'
    ];
    
    // Check if pathname starts with any known route or is a dynamic route
    const isKnownRoute = knownRoutes.some(route => 
      pathname === route || pathname.startsWith(`${route}/`)
    );
    
    setIs404(!isKnownRoute);
  }, [pathname]);
  
  // Don't render Navigation on these pages or 404 pages
  const excludedPages = ['/', '/login', '/register'];
  const shouldHideNavigation = excludedPages.includes(pathname) || is404;
  
  if (shouldHideNavigation) {
    return null;
  }
  
  return <Navigation />;
}