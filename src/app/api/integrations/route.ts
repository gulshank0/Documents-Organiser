import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Mock integrations data - in production, this would come from database
    const integrations = [
      {
        id: 1,
        type: 'EMAIL',
        name: 'Gmail Integration',
        is_active: true,
        last_sync: '2024-09-24T10:30:00Z',
        settings: {
          email: 'kmrl-docs@gmail.com',
          provider: 'GMAIL',
          folders: ['Inbox', 'Documents'],
          auto_process: true
        }
      },
      {
        id: 2,
        type: 'WHATSAPP',
        name: 'WhatsApp Business',
        is_active: true,
        last_sync: '2024-09-24T09:15:00Z',
        settings: {
          phone_number: '+91-9876543210',
          webhook_url: 'https://api.kmrl.com/webhook/whatsapp',
          auto_process: true
        }
      },
      {
        id: 3,
        type: 'SHAREPOINT',
        name: 'SharePoint Online',
        is_active: false,
        last_sync: null,
        settings: {
          site_url: 'https://kmrl.sharepoint.com',
          document_library: 'Shared Documents',
          sync_interval: '15min'
        }
      },
      {
        id: 4,
        type: 'DROPBOX',
        name: 'Dropbox Business',
        is_active: true,
        last_sync: '2024-09-24T08:45:00Z',
        settings: {
          folder_path: '/KMRL Documents',
          auto_sync: true,
          file_filters: ['pdf', 'doc', 'docx', 'jpg', 'png']
        }
      },
      {
        id: 5,
        type: 'GOOGLE_DRIVE',
        name: 'Google Drive',
        is_active: true,
        last_sync: '2024-09-24T11:00:00Z',
        settings: {
          folder_id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
          shared_drives: ['Engineering', 'Operations'],
          auto_process: true
        }
      }
    ];

    return NextResponse.json(integrations);
  } catch (error) {
    console.error('Integrations API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { type, name, settings } = await request.json();

    if (!type || !name) {
      return NextResponse.json(
        { error: 'Integration type and name are required' },
        { status: 400 }
      );
    }

    // TODO: Implement integration creation in database
    const newIntegration = {
      id: Date.now(),
      type,
      name,
      is_active: false,
      last_sync: null,
      settings: settings || {},
      created_at: new Date().toISOString()
    };

    return NextResponse.json(newIntegration, { status: 201 });
  } catch (error) {
    console.error('Create integration error:', error);
    return NextResponse.json(
      { error: 'Failed to create integration' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, is_active, settings } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      );
    }

    // TODO: Implement integration update in database
    const updatedIntegration = {
      id,
      is_active: is_active !== undefined ? is_active : true,
      settings: settings || {},
      updated_at: new Date().toISOString()
    };

    return NextResponse.json(updatedIntegration);
  } catch (error) {
    console.error('Update integration error:', error);
    return NextResponse.json(
      { error: 'Failed to update integration' },
      { status: 500 }
    );
  }
}