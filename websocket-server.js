
const WebSocket = require('ws');
const http = require('http');
const url = require('url');

const PORT = process.env.WS_PORT || 8001;
const SECRET = process.env.WS_SERVER_SECRET || 'dev-secret';

// Create HTTP server for broadcast endpoint
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Broadcast endpoint
  if (parsedUrl.pathname === '/broadcast' && req.method === 'POST') {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '');
    
    if (token !== SECRET) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const notification = JSON.parse(body);
        broadcastNotification(notification);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, clients: wss.clients.size }));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
  
  // Health check
  if (parsedUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      clients: wss.clients.size,
      uptime: process.uptime()
    }));
    return;
  }
  
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store client sessions
const clients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = Math.random().toString(36).substring(7);
  const clientInfo = {
    id: clientId,
    userId: null,
    connectedAt: new Date(),
    lastPing: new Date()
  };
  
  clients.set(ws, clientInfo);
  console.log(`[WebSocket] Client connected: ${clientId} (Total: ${wss.clients.size})`);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    payload: {
      clientId,
      message: 'Connected to notification server'
    }
  }));
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'ping':
          clientInfo.lastPing = new Date();
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
          
        case 'authenticate':
          // Store user ID for targeted notifications
          clientInfo.userId = data.userId;
          clients.set(ws, clientInfo);
          console.log(`[WebSocket] Client ${clientId} authenticated as user ${data.userId}`);
          break;
          
        default:
          console.log(`[WebSocket] Unknown message type from ${clientId}:`, data.type);
      }
    } catch (error) {
      console.error(`[WebSocket] Error parsing message from ${clientId}:`, error);
    }
  });
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WebSocket] Client disconnected: ${clientId} (Remaining: ${wss.clients.size})`);
  });
  
  ws.on('error', (error) => {
    console.error(`[WebSocket] Client error ${clientId}:`, error.message);
  });
});

// Broadcast notification to all or specific users
function broadcastNotification(notification) {
  const { userId, organizationId, type, payload } = notification;
  let sent = 0;
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const clientInfo = clients.get(client);
      
      // Send to specific user or broadcast to all
      if (!userId || clientInfo?.userId === userId) {
        client.send(JSON.stringify({
          type,
          payload
        }));
        sent++;
      }
    }
  });
  
  console.log(`[WebSocket] Broadcast ${type} notification to ${sent} client(s)`);
  return sent;
}

// Heartbeat to keep connections alive
const heartbeat = setInterval(() => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.ping();
    }
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeat);
});

// Start server
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║   WebSocket Notification Server                          ║
║   Port: ${PORT}                                         ║
║   Status: Running                                         ║
║   Health: http://localhost:$\{PORT\}/health                ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[WebSocket] SIGTERM received, closing server...');
  server.close(() => {
    console.log('[WebSocket] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[WebSocket] SIGINT received, closing server...');
  server.close(() => {
    console.log('[WebSocket] Server closed');
    process.exit(0);
  });
});
