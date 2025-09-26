'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, 
  X, 
  CheckCheck, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNotificationStore } from '@/lib/notifications'
import { useWebSocket, webSocketService } from '@/lib/websocket'
import { cn, formatDateTime } from '@/lib/utils'

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-green-600" />
    case 'error':
      return <XCircle className="h-5 w-5 text-red-600" />
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />
    default:
      return <Info className="h-5 w-5 text-blue-600" />
  }
}

const getNotificationBadgeVariant = (type: string) => {
  switch (type) {
    case 'success':
      return 'success'
    case 'error':
      return 'destructive'
    case 'warning':
      return 'warning'
    default:
      return 'default'
  }
}

export function NotificationPanel() {
  const {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  } = useNotificationStore()
  
  const { connect, getConnectionState } = useWebSocket()
  const [isOpen, setIsOpen] = React.useState(false)

  useEffect(() => {
    // Only attempt to connect if WebSocket is enabled
    if (webSocketService.isWebSocketEnabled()) {
      connect()
    }
  }, [connect])

  const connectionState = getConnectionState()
  const isWebSocketEnabled = webSocketService.isWebSocketEnabled()

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Connection Status Indicator - Only show if WebSocket is enabled */}
      {isWebSocketEnabled && (
        <div className="absolute -bottom-1 -right-1">
          {isConnected ? (
            <div title="Connected to real-time server">
              <Wifi className="h-3 w-3 text-green-500" />
            </div>
          ) : connectionState === 'failed' ? (
            <div title="Real-time server unavailable">
              <WifiOff className="h-3 w-3 text-gray-400" />
            </div>
          ) : (
            <div title="Connecting to real-time server...">
              <WifiOff className="h-3 w-3 text-yellow-500" />
            </div>
          )}
        </div>
      )}

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-12 w-96 max-h-[500px] z-50"
            >
              <Card className="glass-card shadow-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-lg">Notifications</CardTitle>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={markAllAsRead}
                          disabled={unreadCount === 0}
                        >
                          <CheckCheck className="h-4 w-4 mr-1" />
                          Mark all read
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearAll}
                        >
                          Clear all
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No notifications yet</p>
                      {!isWebSocketEnabled && (
                        <p className="text-xs mt-2 text-muted-foreground/60">
                          Real-time notifications are disabled
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto space-y-1 p-2">
                      <AnimatePresence>
                        {notifications.map((notification) => (
                          <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className={cn(
                              "p-3 rounded-lg border transition-all cursor-pointer hover:bg-accent/50",
                              !notification.read && "bg-primary/5 border-primary/20"
                            )}
                            onClick={() => {
                              if (!notification.read) {
                                markAsRead(notification.id)
                              }
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                {getNotificationIcon(notification.type)}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-sm font-medium truncate">
                                    {notification.title}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant={getNotificationBadgeVariant(notification.type)}
                                      className="text-xs"
                                    >
                                      {notification.type}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        removeNotification(notification.id)
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                                
                                {notification.message && (
                                  <p className="text-xs text-muted-foreground mb-2">
                                    {notification.message}
                                  </p>
                                )}
                                
                                <p className="text-xs text-muted-foreground">
                                  {formatDateTime(notification.timestamp)}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}