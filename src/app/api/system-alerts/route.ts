import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Mock system alerts - in production, this would fetch from your monitoring system
    const alerts = [
      {
        type: 'warning',
        message: 'High CPU usage detected on processing server',
        timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      },
      {
        type: 'info',
        message: 'Scheduled maintenance window in 2 hours',
        timestamp: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
      },
      {
        type: 'success',
        message: 'Document processing queue cleared successfully',
        timestamp: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
        document_id: 1234
      }
    ];
    
    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Error fetching system alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system alerts' },
      { status: 500 }
    );
  }
}