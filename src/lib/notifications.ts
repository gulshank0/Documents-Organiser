import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  timestamp: Date
  read: boolean
  persistent?: boolean
}

interface NotificationStore {
  notifications: Notification[]
  unreadCount: number
  isConnected: boolean
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
  setConnectionStatus: (connected: boolean) => void
}

export const useNotificationStore = create<NotificationStore>()(
  subscribeWithSelector((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isConnected: false,
    
    addNotification: (notification) => {
      const newNotification: Notification = {
        ...notification,
        id: `notification-${Date.now()}-${Math.random()}`,
        timestamp: new Date(),
        read: false,
      }
      
      set((state) => ({
        notifications: [newNotification, ...state.notifications].slice(0, 100), // Keep only latest 100
        unreadCount: state.unreadCount + 1,
      }))
    },
    
    markAsRead: (id) => {
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }))
    },
    
    markAllAsRead: () => {
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }))
    },
    
    removeNotification: (id) => {
      set((state) => {
        const notification = state.notifications.find(n => n.id === id)
        const wasUnread = notification && !notification.read
        return {
          notifications: state.notifications.filter((n) => n.id !== id),
          unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        }
      })
    },
    
    clearAll: () => {
      set({ notifications: [], unreadCount: 0 })
    },
    
    setConnectionStatus: (connected) => {
      set({ isConnected: connected })
    },
  }))
)