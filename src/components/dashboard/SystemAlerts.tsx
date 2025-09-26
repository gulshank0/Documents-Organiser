'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  BellIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Alert {
  type: 'warning' | 'error' | 'info' | 'success';
  message: string;
  timestamp: string;
  document_id?: number;
}

export default function SystemAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const response = await fetch('/api/system-alerts');
        const data = await response.json();
        setAlerts(data.alerts || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching alerts:', error);
        setLoading(false);
      }
    }

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000); // Refresh every 15 seconds
    
    return () => clearInterval(interval);
  }, []);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500 drop-shadow-sm" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 drop-shadow-sm" />;
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500 drop-shadow-sm" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-blue-500 drop-shadow-sm" />;
    }
  };

  const getAlertStyles = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-gradient-to-r from-red-50 via-red-25 to-red-50 dark:from-red-950/20 dark:via-red-950/10 dark:to-red-950/20 border-red-200/60 dark:border-red-800/30 hover:border-red-300 dark:hover:border-red-700/50';
      case 'warning':
        return 'bg-gradient-to-r from-amber-50 via-yellow-25 to-amber-50 dark:from-amber-950/20 dark:via-amber-950/10 dark:to-amber-950/20 border-amber-200/60 dark:border-amber-800/30 hover:border-amber-300 dark:hover:border-amber-700/50';
      case 'success':
        return 'bg-gradient-to-r from-green-50 via-emerald-25 to-green-50 dark:from-green-950/20 dark:via-green-950/10 dark:to-green-950/20 border-green-200/60 dark:border-green-800/30 hover:border-green-300 dark:hover:border-green-700/50';
      default:
        return 'bg-gradient-to-r from-blue-50 via-sky-25 to-blue-50 dark:from-blue-950/20 dark:via-blue-950/10 dark:to-blue-950/20 border-blue-200/60 dark:border-blue-800/30 hover:border-blue-300 dark:hover:border-blue-700/50';
    }
  };

  if (loading) {
    return (
      <Card className="w-full bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 border-0 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-6 w-32 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-lg animate-pulse"></div>
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
            </div>
            <div className="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-100/50 dark:bg-slate-800/50 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-gradient-to-br from-white via-slate-50/50 to-white dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-lg">
                <BellIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                System Alerts
              </CardTitle>
            </div>
            <CardDescription className="text-sm text-muted-foreground ml-8">
              Real-time system notifications and warnings
            </CardDescription>
          </div>
          <Badge 
            variant={alerts.length > 0 ? "destructive" : "secondary"} 
            className="px-3 py-1 text-xs font-medium rounded-full"
          >
            {alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent">
          {alerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-100 via-emerald-50 to-green-100 dark:from-green-900/20 dark:via-green-900/10 dark:to-green-900/20 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircleIcon className="w-10 h-10 text-green-500" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">All Systems Operational</h4>
              <p className="text-gray-600 dark:text-gray-400 mb-2">No active alerts or warnings</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">System is running smoothly</p>
            </motion.div>
          ) : (
            <AnimatePresence>
              {alerts.map((alert, index) => (
                <motion.div
                  key={`${alert.message}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                  className="group"
                >
                  <div
                    className={`relative p-4 rounded-xl border transition-all duration-300 hover:shadow-md ${getAlertStyles(alert.type)}`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>
                    
                    <div className="relative flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="p-1 bg-white/50 dark:bg-slate-800/50 rounded-lg backdrop-blur-sm">
                          {getAlertIcon(alert.type)}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-gray-100 font-medium leading-relaxed">
                          {alert.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-3 gap-4">
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <ClockIcon className="w-3 h-3" />
                            <span>{formatDate(alert.timestamp)}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {alert.document_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950/20"
                              >
                                Doc #{alert.document_id}
                              </Button>
                            )}
                            <Badge 
                              variant="outline" 
                              className={`text-xs px-2 py-0.5 rounded-full border-current ${
                                alert.type === 'error' ? 'text-red-600 dark:text-red-400' :
                                alert.type === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                                alert.type === 'success' ? 'text-green-600 dark:text-green-400' :
                                'text-blue-600 dark:text-blue-400'
                              }`}
                            >
                              {alert.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-700/50"
          >
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-xs hover:bg-blue-50 dark:hover:bg-blue-950/20"
                >
                  Mark All Read
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  View History →
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}