import { getDatabase } from '@/lib/database';
import { 
  DocumentIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

export default async function DashboardStats() {
  let stats;
  
  try {
    const db = getDatabase();
    
    // Test connection first
    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    
    stats = await db.getDocumentStats();
  } catch (error) {
    console.error('Error fetching stats:', error);
    
    // Return fallback UI with default values
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <div className="glass-card p-6 bg-card/50 border border-border/50">
          <div className="flex items-center justify-center h-20">
            <div className="text-center">
              <ExclamationTriangleIcon className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Unable to load dashboard stats</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Check database connection</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Documents',
      value: stats.total_documents.toLocaleString(),
      icon: DocumentIcon,
      gradient: 'from-blue-500 to-blue-600',
      bgGradient: 'from-blue-50/50 to-blue-100/30 dark:from-blue-950/20 dark:to-blue-900/10',
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
      change: '+12%',
      changeType: 'positive',
      description: 'Documents processed'
    },
    {
      title: 'Processing Queue',
      value: stats.by_status?.PROCESSING || 0,
      icon: ClockIcon,
      gradient: 'from-amber-500 to-orange-600',
      bgGradient: 'from-amber-50/50 to-orange-100/30 dark:from-amber-950/20 dark:to-orange-900/10',
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
      change: '-5%',
      changeType: 'positive',
      description: 'Currently processing'
    },
    {
      title: 'Completed Today',
      value: stats.recent_24h.toLocaleString(),
      icon: CheckCircleIcon,
      gradient: 'from-emerald-500 to-green-600',
      bgGradient: 'from-emerald-50/50 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-green-600',
      change: '+8%',
      changeType: 'positive',
      description: 'Last 24 hours'
    },
    {
      title: 'Failed Processing',
      value: stats.by_status?.FAILED || 0,
      icon: ExclamationTriangleIcon,
      gradient: 'from-red-500 to-red-600',
      bgGradient: 'from-red-50/50 to-red-100/30 dark:from-red-950/20 dark:to-red-900/10',
      iconBg: 'bg-gradient-to-br from-red-500 to-red-600',
      change: '-2%',
      changeType: 'positive',
      description: 'Requires attention'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat, index) => (
        <div 
          key={stat.title} 
          className="group scale-in glass-card hover:scale-105 transition-all duration-300 relative overflow-hidden bg-card/50 border border-border/50 hover:border-border/70 hover:shadow-lg"
          style={{ animationDelay: `${index * 150}ms` }}
        >
          {/* Background decoration */}
          <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-40 transition-opacity group-hover:opacity-60`} />
          <div className="absolute top-0 right-0 w-32 h-32 bg-background/10 rounded-full -translate-y-16 translate-x-16 transition-transform group-hover:scale-110" />
          
          <div className="relative z-10 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-muted-foreground mb-1 tracking-wide">{stat.title}</p>
                <p className="text-3xl font-bold text-foreground mb-2 leading-none">{stat.value}</p>
                <p className="text-xs text-muted-foreground/80 font-medium">{stat.description}</p>
              </div>
              <div className={`p-3 rounded-2xl ${stat.iconBg} shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-110`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            
            {/* Progress indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full transition-colors ${
                  stat.changeType === 'positive' 
                    ? 'bg-green-100/80 text-green-700 border border-green-200/60 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30' 
                    : 'bg-red-100/80 text-red-700 border border-red-200/60 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30'
                }`}>
                  {stat.changeType === 'positive' ? (
                    <ArrowTrendingUpIcon className="w-3 h-3" />
                  ) : (
                    <ArrowTrendingDownIcon className="w-3 h-3" />
                  )}
                  <span className="text-xs font-bold">{stat.change}</span>
                </div>
                <span className="text-xs text-muted-foreground/70 font-medium">vs last week</span>
              </div>
            </div>
            
            {/* Animated bottom border */}
            <div className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${stat.gradient} transform origin-left transition-transform duration-500 group-hover:scale-x-100 scale-x-75 rounded-full`} />
          </div>
        </div>
      ))}
    </div>
  );
}