import { useNotificationStore } from './notifications'

class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 5
  private readonly reconnectDelay = 1000
  private heartbeatInterval: NodeJS.Timeout | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null
  private readonly url: string
  private shouldConnect = true
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed' = 'disconnected'
  private isEnabled: boolean
  private userId: string | null = null

  constructor() {
    this.url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8001'
    // Disable WebSocket by default if no explicit URL is provided and we're in development
    this.isEnabled = process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === 'true' || 
                     Boolean(process.env.NEXT_PUBLIC_WS_URL && process.env.NEXT_PUBLIC_WS_URL !== 'ws://localhost:8001')
    
    if (!this.isEnabled) {
      console.log('WebSocket is disabled. Set NEXT_PUBLIC_ENABLE_WEBSOCKET=true to enable it.')
    }
  }

  // Set user ID for authenticated notifications
  setUserId(userId: string) {
    this.userId = userId
    // If already connected, send authentication message
    if (this.ws?.readyState === WebSocket.OPEN && userId) {
      this.ws.send(JSON.stringify({ type: 'authenticate', userId }))
    }
  }

  connect() {
    if (!this.isEnabled) {
      console.log('WebSocket is disabled')
      return
    }

    if (this.connectionState === 'connecting' || this.connectionState === 'connected') {
      return
    }

    if (!this.shouldConnect) {
      console.log('WebSocket connection disabled')
      return
    }

    this.connectionState = 'connecting'
    console.log(`Attempting to connect to WebSocket at ${this.url}...`)

    try {
      this.ws = new WebSocket(this.url)
      this.setupEventListeners()
    } catch (error) {
      console.error('WebSocket connection error:', error)
      this.connectionState = 'failed'
      this.handleConnectionFailure()
    }
  }

  private setupEventListeners() {
    if (!this.ws) return

    this.ws.onopen = () => {
      console.log('WebSocket connected successfully')
      this.connectionState = 'connected'
      useNotificationStore.getState().setConnectionStatus(true)
      this.reconnectAttempts = 0
      this.startHeartbeat()
      
      // Authenticate if user ID is set
      if (this.userId) {
        this.ws?.send(JSON.stringify({ type: 'authenticate', userId: this.userId }))
      }
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handleMessage(data)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    this.ws.onerror = (error) => {
      // Reduce error logging spam
      if (this.reconnectAttempts === 0) {
        console.warn('WebSocket connection failed - server may not be available')
      }
      
      this.connectionState = 'failed'
      this.handleConnectionFailure()
    }

    this.ws.onclose = (event) => {
      this.connectionState = 'disconnected'
      useNotificationStore.getState().setConnectionStatus(false)
      this.stopHeartbeat()
      
      if (event.code === 1000) {
        console.log('WebSocket disconnected normally')
        return
      }

      if (this.reconnectAttempts === 0) {
        console.log('WebSocket disconnected - will attempt to reconnect if server becomes available')
      }
      
      if (this.shouldConnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.handleReconnect()
      } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.connectionState = 'failed'
        this.handleConnectionFailure()
      }
    }
  }

  private handleMessage(data: any) {
    const { addNotification } = useNotificationStore.getState()

    switch (data.type) {
      case 'connected':
        console.log('WebSocket server connection confirmed:', data.payload.message)
        break
        
      case 'notification':
        addNotification({
          type: data.payload.type || 'info',
          title: data.payload.title,
          message: data.payload.message,
          persistent: data.payload.persistent,
        })
        break
        
      case 'document_uploaded':
        addNotification({
          type: 'success',
          title: data.payload.title || 'Document Uploaded',
          message: data.payload.message,
        })
        break
        
      case 'document_processed':
        addNotification({
          type: data.payload.type || 'success',
          title: data.payload.title || 'Document Processed',
          message: data.payload.message,
        })
        break
        
      case 'system_alert':
        addNotification({
          type: data.payload.severity === 'error' ? 'error' : 'warning',
          title: 'System Alert',
          message: data.payload.message,
          persistent: data.payload.severity === 'error',
        })
        break
        
      case 'pong':
        // Handle heartbeat response
        break
        
      default:
        console.log('Unknown message type:', data.type)
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // Send heartbeat every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.shouldConnect) {
      return
    }

    this.connectionState = 'reconnecting'
    
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts++

    // Only log reconnection attempts occasionally to avoid spam
    if (this.reconnectAttempts <= 2) {
      console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    }

    this.reconnectTimeout = setTimeout(() => {
      if (this.shouldConnect) {
        this.connect()
      }
    }, delay)
  }

  private handleConnectionFailure() {
    const { addNotification } = useNotificationStore.getState()
    
    // Only show notification once when connection fails permanently
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      addNotification({
        type: 'info',
        title: 'Real-time Features Disabled',
        message: 'WebSocket server is not available. The app will work normally without real-time notifications.',
      })
    }
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  disconnect() {
    this.shouldConnect = false
    this.stopHeartbeat()
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect')
      this.ws = null
    }
    
    this.connectionState = 'disconnected'
    this.reconnectAttempts = 0
  }

  // Method to retry connection manually
  retry() {
    if (this.connectionState === 'failed') {
      this.shouldConnect = true
      this.reconnectAttempts = 0
      this.connectionState = 'disconnected'
      this.connect()
    }
  }

  getConnectionState() {
    return this.connectionState
  }

  // Method to check if WebSocket is enabled
  isWebSocketEnabled() {
    return this.isEnabled
  }

  // Method to enable WebSocket programmatically
  enable() {
    this.isEnabled = true
    this.shouldConnect = true
    if (this.connectionState === 'disconnected' || this.connectionState === 'failed') {
      this.reconnectAttempts = 0
      this.connect()
    }
  }

  // Method to disable WebSocket entirely
  disable() {
    this.isEnabled = false
    this.shouldConnect = false
    this.disconnect()
  }
}

export const webSocketService = new WebSocketService()

// Hook to use WebSocket in React components
export function useWebSocket() {
  const isConnected = useNotificationStore((state) => state.isConnected)

  return {
    connect: () => webSocketService.connect(),
    disconnect: () => webSocketService.disconnect(),
    retry: () => webSocketService.retry(),
    disable: () => webSocketService.disable(),
    enable: () => webSocketService.enable(),
    send: (data: any) => webSocketService.send(data),
    setUserId: (userId: string) => webSocketService.setUserId(userId),
    getConnectionState: () => webSocketService.getConnectionState(),
    isConnected,
  }
}