import type { Metadata } from 'next';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Overview of document processing and system status',
};

export default function DashboardPage() {
  return <DashboardOverview />;
}