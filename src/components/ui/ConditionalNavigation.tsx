'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from './Navigation';

export function ConditionalNavigation() {
  const pathname = usePathname();
  
  // Don't render Navigation on these pages
  const excludedPages = ['/', '/login', '/register'];
  const shouldHideNavigation = excludedPages.includes(pathname);
  
  if (shouldHideNavigation) {
    return null;
  }
  
  return <Navigation />;
}