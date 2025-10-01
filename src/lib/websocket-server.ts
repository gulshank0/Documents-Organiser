// Server-side WebSocket notification broadcaster
// This allows API routes to send notifications to connected clients

interface NotificationPayload {
  type: 'notification' | 'document_processed' | 'document_uploaded' | 'document_downloaded' | 'system_alert';
  userId?: string;
  organizationId?: string;
  payload: {
    type?: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message?: string;
    persistent?: boolean;
    severity?: 'info' | 'warning' | 'error';
    filename?: string;
    documentId?: string;
    [key: string]: any;
  };
}

class WebSocketNotifier {
  private wsUrl: string;
  private enabled: boolean;

  constructor() {
    this.wsUrl = process.env.WS_SERVER_URL || 'ws://localhost:8001';
    this.enabled = process.env.ENABLE_WEBSOCKET === 'true';
  }

  /**
   * Send a notification to a specific user
   */
  async notifyUser(userId: string, notification: Omit<NotificationPayload, 'userId'>) {
    if (!this.enabled) {
      console.log('[WebSocket] Disabled - skipping notification');
      return;
    }

    try {
      const payload: NotificationPayload = {
        ...notification,
        userId,
      };

      // In a production environment, this would send to the WebSocket server
      // For now, we'll use an HTTP endpoint to broadcast
      const broadcastUrl = `${this.wsUrl.replace('ws://', 'http://').replace('wss://', 'https://')}/broadcast`;
      
      await fetch(broadcastUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WS_SERVER_SECRET || 'dev-secret'}`
        },
        body: JSON.stringify(payload)
      }).catch(error => {
        // Don't fail the request if WebSocket notification fails
        console.warn('[WebSocket] Failed to send notification:', error.message);
      });
    } catch (error) {
      console.warn('[WebSocket] Notification error:', error);
    }
  }

  /**
   * Notify about document upload
   */
  async notifyDocumentUploaded(userId: string, data: {
    documentId: string;
    filename: string;
    fileSize: number;
    channel: string;
  }) {
    await this.notifyUser(userId, {
      type: 'document_uploaded',
      payload: {
        type: 'success',
        title: 'Document Uploaded',
        message: `"${data.filename}" has been uploaded successfully via ${data.channel}`,
        documentId: data.documentId,
        filename: data.filename,
        fileSize: data.fileSize,
        channel: data.channel,
      }
    });
  }

  /**
   * Notify about document processing completion
   */
  async notifyDocumentProcessed(userId: string, data: {
    documentId: string;
    filename: string;
    status: 'success' | 'failed';
    extractedText?: boolean;
  }) {
    await this.notifyUser(userId, {
      type: 'document_processed',
      payload: {
        type: data.status === 'success' ? 'success' : 'error',
        title: data.status === 'success' ? 'Document Processed' : 'Processing Failed',
        message: data.status === 'success' 
          ? `"${data.filename}" has been processed successfully`
          : `Failed to process "${data.filename}"`,
        documentId: data.documentId,
        filename: data.filename,
        extractedText: data.extractedText,
      }
    });
  }

  /**
   * Notify about document download
   */
  async notifyDocumentDownloaded(userId: string, data: {
    documentId: string;
    filename: string;
  }) {
    await this.notifyUser(userId, {
      type: 'notification',
      payload: {
        type: 'info',
        title: 'Document Downloaded',
        message: `"${data.filename}" has been downloaded`,
        documentId: data.documentId,
        filename: data.filename,
      }
    });
  }

  /**
   * Notify about integration document ingestion
   */
  async notifyIntegrationUpload(userId: string, data: {
    source: string;
    documentsCount: number;
    documents: Array<{ id: string; filename: string }>;
  }) {
    await this.notifyUser(userId, {
      type: 'notification',
      payload: {
        type: 'success',
        title: 'Documents Ingested',
        message: `${data.documentsCount} document(s) received from ${data.source.toUpperCase()}`,
        source: data.source,
        documentsCount: data.documentsCount,
        documents: data.documents,
      }
    });
  }

  /**
   * Notify about errors
   */
  async notifyError(userId: string, data: {
    title: string;
    message: string;
    persistent?: boolean;
  }) {
    await this.notifyUser(userId, {
      type: 'notification',
      payload: {
        type: 'error',
        title: data.title,
        message: data.message,
        persistent: data.persistent,
      }
    });
  }
}

// Export singleton instance
export const wsNotifier = new WebSocketNotifier();
