import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Overview of document processing and system status',
};

export default async function DashboardPage() {
  // Server-side authentication check
  const session = await getServerSession(authOptions);
  
  // Check for auth token in cookies (for JWT auth users)
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth-token')?.value;
  
  // If no session and no auth token, redirect to login
  if (!session && !authToken) {
    redirect('/login');
  }
  
  return <DashboardOverview />;
}